import type { AgentName, AgentInput, ImagePart, FilePart } from "@/ai/_base/types";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import {
  AGENT_DOCUMENT_TYPES,
  AGENT_CONTRACT_NAMES,
} from "@/lib/cvcrm/constants";

/**
 * Person agents run once per person group (titular, fiador, conjuge).
 * Global agents run once for the entire reservation.
 */
export const PERSON_AGENTS: AgentName[] = [
  "rgcpf-agent",
  "cnh-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "certidao-estado-civil-agent",
  "comprovante-renda-agent",
  "carteira-trabalho-agent",
  "carta-fiador-agent",
];

/**
 * Maps downloaded document contents to the agents that should process them.
 *
 * For person agents: creates composite keys like "rgcpf-agent:titular"
 * For global agents: creates simple keys like "fluxo-agent"
 */
export function mapDocumentsToAgents(
  contents: DocumentContent[],
): Map<string, DocumentContent[]> {
  const map = new Map<string, DocumentContent[]>();

  for (const doc of contents) {
    if (doc.error) continue;

    if (doc.source === "contrato") {
      // Contracts: match only by nome (tipo is always "Venda"/"Outro" — meaningless)
      const lowerNome = doc.nome.toLowerCase();
      for (const [agent, namePatterns] of Object.entries(AGENT_CONTRACT_NAMES)) {
        const matched = namePatterns?.some((pattern) =>
          lowerNome.includes(pattern.toLowerCase()),
        );
        if (matched) {
          const existing = map.get(agent) ?? [];
          existing.push(doc);
          map.set(agent, existing);
        }
      }
    } else {
      // Personal documents: match only by tipo (nome can be anything)
      const lowerTipo = doc.tipo.toLowerCase();
      for (const [agent, types] of Object.entries(AGENT_DOCUMENT_TYPES)) {
        const matched = types?.some((t) => lowerTipo.includes(t.toLowerCase()));
        if (matched) {
          const agentName = agent as AgentName;
          const key = PERSON_AGENTS.includes(agentName) && doc.pessoa
            ? `${agent}:${doc.pessoa}`
            : agent;
          const existing = map.get(key) ?? [];
          existing.push(doc);
          map.set(key, existing);
        }
      }
    }
  }

  return map;
}

export const REQUIRED_GLOBAL_AGENTS: AgentName[] = [
  "planta-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "termo-agent",
  "ato-agent",
];

const REQUIRED_PERSON_AGENT_GROUPS: { label: string; agents: AgentName[] }[] = [
  { label: "Identidade (CNH ou RG/CPF)", agents: ["cnh-agent", "rgcpf-agent"] },
  { label: "Residência", agents: ["comprovante-residencia-agent", "declaracao-residencia-agent"] },
  { label: "Estado Civil", agents: ["certidao-estado-civil-agent"] },
  { label: "Renda", agents: ["comprovante-renda-agent", "carteira-trabalho-agent"] },
];

export type DownloadCompletenessResult = {
  complete: boolean;
  missing: string[];
  message: string;
};

export function checkDownloadCompleteness(
  documentMap: Map<string, DocumentContent[]>,
  pessoas: string[],
): DownloadCompletenessResult {
  const missing: string[] = [];

  for (const agent of REQUIRED_GLOBAL_AGENTS) {
    if (!documentMap.has(agent)) {
      missing.push(agent.replace(/-agent$/, "").replace(/-/g, " "));
    }
  }

  for (const pessoa of pessoas) {
    for (const group of REQUIRED_PERSON_AGENT_GROUPS) {
      const hasAny = group.agents.some((a) => documentMap.has(`${a}:${pessoa}`));
      if (!hasAny) {
        missing.push(`${pessoa}: ${group.label}`);
      }
    }
  }

  const complete = missing.length === 0;
  const message = complete
    ? "Todos os arquivos foram baixados com sucesso."
    : `Documentos ainda não validados por I.A.\n\nFaltam os seguintes arquivos para prosseguir: ${missing.join("; ")}.`;

  return { complete, missing, message };
}

/**
 * Builds an AgentInput from downloaded document contents and reservation context.
 *
 * For text documents: concatenates text content and prepends context.
 * For image documents: includes image buffers for multimodal LLM processing.
 */
export function buildAgentInput(
  docs: DocumentContent[],
  contextJson: string,
): AgentInput {
  const textParts: string[] = [];
  const images: ImagePart[] = [];
  const files: FilePart[] = [];

  // Add reservation context for cross-reference
  textParts.push(
    "=== CONTEXTO DA RESERVA (para referência cruzada) ===",
    contextJson,
    "",
  );

  for (const doc of docs) {
    if (doc.contentType === "text" && doc.text) {
      const hasPdf = doc.imageData && doc.imageMimeType === "application/pdf";
      textParts.push(
        `=== DOCUMENTO${hasPdf ? " (PDF DIGITAL)" : ""}: ${doc.nome} (${doc.tipo}) ===`,
        doc.text,
        "",
      );

      if (hasPdf) {
        files.push({ data: doc.imageData!, mimeType: "application/pdf" });
      }
    } else if (doc.contentType === "image" && doc.imageData) {
      const mime = doc.imageMimeType ?? "image/jpeg";
      const isPdf = mime === "application/pdf";

      textParts.push(
        `=== DOCUMENTO (${isPdf ? "PDF ESCANEADO" : "IMAGEM"}): ${doc.nome} (${doc.tipo}) ===`,
        `O ${isPdf ? "PDF" : "imagem"} deste documento foi anexado. Analise para extrair os dados.`,
        "",
      );

      if (isPdf) {
        // PDFs go as file parts (supported by Gemini and Claude)
        files.push({ data: doc.imageData, mimeType: "application/pdf" });
      } else {
        // Actual images go as image parts
        images.push({ data: doc.imageData, mimeType: mime });
      }
    }
  }

  return {
    text: textParts.join("\n"),
    images: images.length > 0 ? images : undefined,
    files: files.length > 0 ? files : undefined,
  };
}
