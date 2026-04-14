import { buildAgentInput, mapDocumentsToAgents, PERSON_AGENTS } from "@/ai/orchestrator/agentDocumentMapper";
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
    ...overrides,
  };
}

function makeTextDocWithPdf(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    ...makeTextDoc(),
    imageData: Buffer.from("fake-pdf-content"),
    imageMimeType: "application/pdf",
    pessoa: "titular",
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

    it("creates simple key when pessoa is undefined (contracts)", () => {
      const docs = [
        makeTextDoc({ tipo: "Venda", nome: "Quadro Resumo v2.0", pessoa: undefined }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("quadro-resumo-agent")).toBe(true);
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
