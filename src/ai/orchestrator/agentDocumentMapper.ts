import type { AgentName, AgentInput, ImagePart, FilePart } from "@/ai/_base/types";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import {
  AGENT_DOCUMENT_TYPES,
  AGENT_CONTRACT_NAMES,
} from "@/lib/cvcrm/constants";

/**
 * Maps downloaded document contents to the agents that should process them.
 */
export function mapDocumentsToAgents(
  contents: DocumentContent[],
): Map<AgentName, DocumentContent[]> {
  const map = new Map<AgentName, DocumentContent[]>();

  for (const doc of contents) {
    if (doc.error) continue;

    const lowerTipo = doc.tipo.toLowerCase();
    const lowerNome = doc.nome.toLowerCase();

    // Check document type mappings
    for (const [agent, types] of Object.entries(AGENT_DOCUMENT_TYPES)) {
      const matched = types?.some(
        (t) =>
          lowerTipo.includes(t.toLowerCase()) ||
          lowerNome.includes(t.toLowerCase()),
      );
      if (matched) {
        const existing = map.get(agent as AgentName) ?? [];
        existing.push(doc);
        map.set(agent as AgentName, existing);
      }
    }

    // Check contract name mappings
    for (const [agent, namePatterns] of Object.entries(AGENT_CONTRACT_NAMES)) {
      const matched = namePatterns?.some(
        (pattern) =>
          lowerNome.includes(pattern.toLowerCase()) ||
          lowerTipo.includes(pattern.toLowerCase()),
      );
      if (matched) {
        const existing = map.get(agent as AgentName) ?? [];
        existing.push(doc);
        map.set(agent as AgentName, existing);
      }
    }
  }

  return map;
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
      textParts.push(
        `=== DOCUMENTO: ${doc.nome} (${doc.tipo}) ===`,
        doc.text,
        "",
      );
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
