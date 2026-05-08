import { buildAgentInput, mapDocumentsToAgents, PERSON_AGENTS, checkDownloadCompleteness } from "@/ai/orchestrator/agentDocumentMapper";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";

function makeTextDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 1,
    nome: "CNH_Digital.pdf",
    tipo: "CNH",
    contentType: "text",
    text: "NOME: João Silva\nCPF: 12345678900",
    link: "https://example.com/cnh.pdf",
    pessoa: "titular",
    source: "documento",
    ...overrides,
  };
}

function makeTextDocWithPdf(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    ...makeTextDoc(),
    imageData: Buffer.from("fake-pdf-content"),
    imageMimeType: "application/pdf",
    pessoa: "titular",
    source: "documento",
    ...overrides,
  };
}

function makeImageDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 2,
    nome: "RG_Scan.jpg",
    tipo: "RG Principal",
    contentType: "image",
    imageData: Buffer.from("fake-image"),
    imageMimeType: "image/jpeg",
    link: "https://example.com/rg.jpg",
    pessoa: "titular",
    source: "documento",
    ...overrides,
  };
}

function makeContractDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 99,
    nome: "Quadro Resumo v2.0.pdf",
    tipo: "Venda",
    contentType: "text",
    text: "conteúdo do contrato",
    link: "https://example.com/quadro.pdf",
    pessoa: undefined,
    source: "contrato",
    ...overrides,
  };
}

describe("mapDocumentsToAgents", () => {
  describe("person agents with pessoa field", () => {
    it("creates composite key for person agents", () => {
      const docs = [
        makeTextDoc({ tipo: "RG Principal", pessoa: "titular" }),
        makeTextDoc({ tipo: "RG Principal", pessoa: "fiador", nome: "RG_Fiador.pdf", documentId: 2 }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("rgcpf-agent:titular")).toBe(true);
      expect(map.has("rgcpf-agent:fiador")).toBe(true);
      expect(map.get("rgcpf-agent:titular")).toHaveLength(1);
      expect(map.get("rgcpf-agent:fiador")).toHaveLength(1);
    });

    it("creates simple key for global agents", () => {
      const docs = [
        makeTextDoc({ tipo: "Fluxo", nome: "Fluxo.pdf", pessoa: "titular" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("fluxo-agent")).toBe(true);
      expect(map.has("fluxo-agent:titular")).toBe(false);
    });

    it("creates simple key when source is contrato (contracts)", () => {
      const docs = [
        makeContractDoc({ nome: "Quadro Resumo v2.0", tipo: "Venda", pessoa: undefined }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("quadro-resumo-agent")).toBe(true);
    });
  });

  describe("tipo-only matching for AGENT_DOCUMENT_TYPES", () => {
    it("does not map ato-agent when filename contains 'ato' but tipo differs", () => {
      const docs = [
        makeTextDoc({ tipo: "Comprovante de Renda", nome: "RELATORIO-fulano.PDF", pessoa: "titular" }),
        makeTextDoc({ tipo: "Carteira de Trabalho", nome: "CTPSContratosDigitais_123.pdf", pessoa: "titular" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("ato-agent")).toBe(false);
      expect(map.has("comprovante-renda-agent:titular")).toBe(true);
      expect(map.has("carteira-trabalho-agent:titular")).toBe(true);
    });

    it("maps ato-agent only when tipo is exactly Ato", () => {
      const docs = [
        makeTextDoc({ tipo: "Ato", nome: "ComprovantePagamento.pdf", pessoa: undefined }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("ato-agent")).toBe(true);
      expect(map.get("ato-agent")).toHaveLength(1);
    });
  });

  describe("source-based routing", () => {
    it("contract doc with nome='Quadro Resumo - Revenda' maps to quadro-resumo-agent regardless of tipo", () => {
      const docs = [
        makeContractDoc({ nome: "Quadro Resumo - Revenda.pdf", tipo: "Venda" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("quadro-resumo-agent")).toBe(true);
      expect(map.get("quadro-resumo-agent")).toHaveLength(1);
    });

    it("contract doc with nome='Planta - Tipo B.pdf' maps to planta-agent", () => {
      const docs = [
        makeContractDoc({ nome: "Planta - Tipo B.pdf", tipo: "Outro" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("planta-agent")).toBe(true);
    });

    it("documento pessoal with nome containing 'planta' does NOT map to planta-agent — only tipo matters", () => {
      const docs = [
        makeTextDoc({ tipo: "RG Principal", nome: "planta_rg.pdf", pessoa: "titular" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("planta-agent")).toBe(false);
      expect(map.has("rgcpf-agent:titular")).toBe(true);
    });

    it("contract doc does NOT match AGENT_DOCUMENT_TYPES even if tipo matches", () => {
      const docs = [
        makeContractDoc({ nome: "Contrato Compra Venda.pdf", tipo: "RG Principal" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("rgcpf-agent")).toBe(false);
      expect(map.size).toBe(0);
    });

    it("contract doc with unrecognized nome maps to nothing", () => {
      const docs = [
        makeContractDoc({ nome: "Instrumento Particular.pdf", tipo: "Venda" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.size).toBe(0);
    });
  });

  describe("PERSON_AGENTS constant", () => {
    it("includes identity and person-related agents", () => {
      expect(PERSON_AGENTS).toContain("rgcpf-agent");
      expect(PERSON_AGENTS).toContain("cnh-agent");
      expect(PERSON_AGENTS).toContain("comprovante-residencia-agent");
      expect(PERSON_AGENTS).toContain("carta-fiador-agent");
    });

    it("does not include global agents", () => {
      expect(PERSON_AGENTS).not.toContain("fluxo-agent");
      expect(PERSON_AGENTS).not.toContain("quadro-resumo-agent");
      expect(PERSON_AGENTS).not.toContain("planta-agent");
    });
  });
});

describe("checkDownloadCompleteness", () => {
  function makeMap(keys: string[]): Map<string, ReturnType<typeof makeTextDoc>[]> {
    const m = new Map<string, ReturnType<typeof makeTextDoc>[]>();
    for (const k of keys) m.set(k, [makeTextDoc()]);
    return m;
  }

  const ALL_GLOBAL = ["planta-agent", "quadro-resumo-agent", "fluxo-agent", "termo-agent", "ato-agent"];

  describe("complete: true", () => {
    it("returns complete when all required global agents and person groups present (titular only)", () => {
      const keys = [
        ...ALL_GLOBAL,
        "cnh-agent:titular",
        "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular",
        "comprovante-renda-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("accepts rgcpf-agent as alternative to cnh-agent for identity group", () => {
      const keys = [
        ...ALL_GLOBAL,
        "rgcpf-agent:titular",
        "declaracao-residencia-agent:titular",
        "certidao-estado-civil-agent:titular",
        "carteira-trabalho-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.complete).toBe(true);
    });

    it("returns complete with multiple pessoas when each has required groups", () => {
      const keys = [
        ...ALL_GLOBAL,
        "cnh-agent:titular", "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular", "comprovante-renda-agent:titular",
        "cnh-agent:fiador", "comprovante-residencia-agent:fiador",
        "certidao-estado-civil-agent:fiador", "comprovante-renda-agent:fiador",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular", "fiador"]);
      expect(result.complete).toBe(true);
    });
  });

  describe("complete: false — missing global agents", () => {
    it("reports missing global agents", () => {
      const keys = [
        "quadro-resumo-agent", "fluxo-agent", "termo-agent", "ato-agent",
        "cnh-agent:titular", "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular", "comprovante-renda-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("planta");
    });

    it("reports all missing global agents when map is empty", () => {
      const result = checkDownloadCompleteness(new Map(), ["titular"]);
      expect(result.complete).toBe(false);
      expect(result.missing).toHaveLength(
        5 + 4
      );
    });
  });

  describe("complete: false — missing person groups", () => {
    it("reports missing identity group when neither cnh nor rgcpf present", () => {
      const keys = [
        ...ALL_GLOBAL,
        "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular",
        "comprovante-renda-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.complete).toBe(false);
      expect(result.missing.some((m) => m.includes("titular") && m.includes("Identidade"))).toBe(true);
    });

    it("reports missing renda group when neither comprovante-renda nor carteira-trabalho present", () => {
      const keys = [
        ...ALL_GLOBAL,
        "cnh-agent:titular",
        "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.complete).toBe(false);
      expect(result.missing.some((m) => m.includes("Renda"))).toBe(true);
    });

    it("reports missing for specific pessoa — not for others that have groups", () => {
      const keys = [
        ...ALL_GLOBAL,
        "cnh-agent:titular", "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular", "comprovante-renda-agent:titular",
        // fiador missing all person docs
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular", "fiador"]);
      expect(result.complete).toBe(false);
      expect(result.missing.every((m) => m.includes("fiador"))).toBe(true);
    });
  });

  describe("message format", () => {
    it("returns success message when complete", () => {
      const keys = [
        ...ALL_GLOBAL,
        "cnh-agent:titular", "comprovante-residencia-agent:titular",
        "certidao-estado-civil-agent:titular", "comprovante-renda-agent:titular",
      ];
      const result = checkDownloadCompleteness(makeMap(keys), ["titular"]);
      expect(result.message).toContain("sucesso");
    });

    it("lists missing items in message when incomplete", () => {
      const result = checkDownloadCompleteness(new Map(), ["titular"]);
      expect(result.message).toContain("Faltam");
      expect(result.message).toContain("planta");
    });
  });
});

describe("buildAgentInput", () => {
  const context = '{"reservaId": 123}';

  describe("text document with PDF buffer (digital PDF)", () => {
    it("includes both text content and PDF file part", () => {
      const input = buildAgentInput([makeTextDocWithPdf()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.text).toContain("PDF DIGITAL");
      expect(input.files).toBeDefined();
      expect(input.files).toHaveLength(1);
      expect(input.files![0].mimeType).toBe("application/pdf");
    });
  });

  describe("text document without PDF buffer (fallback/legacy)", () => {
    it("includes only text content, no file parts", () => {
      const input = buildAgentInput([makeTextDoc()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.text).toContain("DOCUMENTO:");
      expect(input.text).not.toContain("PDF DIGITAL");
      expect(input.files).toBeUndefined();
    });
  });

  describe("image document (scanned PDF or photo)", () => {
    it("includes image parts, not file parts", () => {
      const input = buildAgentInput([makeImageDoc()], context);

      expect(input.images).toBeDefined();
      expect(input.images).toHaveLength(1);
      expect(input.files).toBeUndefined();
    });
  });

  describe("mixed documents", () => {
    it("handles text+pdf and image docs together", () => {
      const input = buildAgentInput([makeTextDocWithPdf(), makeImageDoc()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.files).toHaveLength(1);
      expect(input.images).toHaveLength(1);
    });
  });
});
