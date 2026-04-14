import { buildAgentInput } from "@/ai/orchestrator/agentDocumentMapper";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";

function makeTextDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 1,
    nome: "CNH_Digital.pdf",
    tipo: "CNH",
    contentType: "text",
    text: "NOME: João Silva\nCPF: 12345678900",
    link: "https://example.com/cnh.pdf",
    ...overrides,
  };
}

function makeTextDocWithPdf(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    ...makeTextDoc(),
    imageData: Buffer.from("fake-pdf-content"),
    imageMimeType: "application/pdf",
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
    ...overrides,
  };
}

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
