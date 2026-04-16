import type { CvcrmDocumentoItem, CvcrmContrato } from "@/lib/cvcrm/types";

// Mock unpdf before importing module under test
jest.mock("unpdf", () => ({
  extractText: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { downloadDocument, downloadContractDocument, downloadAllDocuments } from "@/lib/cvcrm/documentDownloader";
import { extractText } from "unpdf";

const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function makeDoc(overrides: Partial<CvcrmDocumentoItem> = {}): CvcrmDocumentoItem {
  return {
    idreservasdocumentos: 1,
    nome: "RG Titular",
    situacao: "Aguardando aprovação",
    idtipo: 1,
    tipo: "RG Principal",
    idtipo_associacao: null,
    link: "https://example.com/doc.pdf",
    ...overrides,
  };
}

function makePdfResponse(text = "PDF content", size = 1024) {
  const buffer = Buffer.from(text.padEnd(size));
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Map([
      ["content-type", "application/pdf"],
      ["content-length", String(buffer.length)],
    ]) as unknown as Headers,
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  });
}

function makeImageResponse(mimeType = "image/jpeg") {
  const buffer = Buffer.from("fake image data");
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Map([
      ["content-type", mimeType],
      ["content-length", String(buffer.length)],
    ]) as unknown as Headers,
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  });
}

describe("documentDownloader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ── downloadDocument ────────────────────────────────────────

  describe("downloadDocument", () => {
    it("returns error when doc has no link", async () => {
      const result = await downloadDocument(makeDoc({ link: undefined }));

      expect(result.error).toContain("No link");
      expect(result.contentType).toBe("text");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("extracts text from PDF document", async () => {
      mockFetch.mockReturnValueOnce(makePdfResponse());
      mockExtractText.mockResolvedValueOnce({ text: ["Page 1 text", "Page 2 text"] } as never);

      const result = await downloadDocument(makeDoc());

      expect(result.contentType).toBe("text");
      expect(result.text).toContain("Page 1 text");
      expect(result.text).toContain("Page 2 text");
      expect(result.error).toBeUndefined();
    });

    it("treats image content-type as image", async () => {
      mockFetch.mockReturnValueOnce(makeImageResponse("image/jpeg"));

      const result = await downloadDocument(
        makeDoc({ link: "https://example.com/doc.jpg" }),
      );

      expect(result.contentType).toBe("image");
      expect(result.imageData).toBeDefined();
      expect(result.imageMimeType).toBe("image/jpeg");
    });

    it("treats image URL extensions as image even without image content-type", async () => {
      mockFetch.mockReturnValueOnce(makeImageResponse("application/octet-stream"));

      const result = await downloadDocument(
        makeDoc({ link: "https://example.com/photo.png" }),
      );

      expect(result.contentType).toBe("image");
      expect(result.imageMimeType).toBe("image/png");
    });

    it("returns as image when PDF has no extractable text (scanned)", async () => {
      mockFetch.mockReturnValueOnce(makePdfResponse());
      mockExtractText.mockResolvedValueOnce({ text: [] } as never);

      const result = await downloadDocument(makeDoc());

      expect(result.contentType).toBe("image");
      expect(result.imageMimeType).toBe("application/pdf");
    });

    it("returns error on HTTP failure", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const result = await downloadDocument(makeDoc());

      expect(result.error).toContain("404");
      expect(result.contentType).toBe("text");
    });

    it("returns error on fetch timeout/abort", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.reject(new Error("AbortError: signal timed out")),
      );

      const result = await downloadDocument(makeDoc());

      expect(result.error).toContain("AbortError");
    });
  });

  // ── downloadContractDocument ────────────────────────────────

  describe("downloadContractDocument", () => {
    it("returns null when contrato has no link", async () => {
      const contrato: CvcrmContrato = {
        idcontrato: 1,
        contrato: "Ato",
        tipo: "Ato",
        link: "",
      };

      const result = await downloadContractDocument(contrato);

      expect(result).toBeNull();
    });
  });

  // ── downloadAllDocuments ────────────────────────────────────

  describe("downloadAllDocuments", () => {
    it("returns empty array for empty documentos", async () => {
      const results = await downloadAllDocuments({});

      expect(results).toEqual([]);
    });

    it("downloads docs from multiple groups", async () => {
      mockFetch.mockReturnValue(makePdfResponse());
      mockExtractText.mockResolvedValue({ text: ["texto"] } as never);

      const documentos = {
        identidade: [makeDoc({ nome: "RG" })],
        renda: [makeDoc({ nome: "Holerite" })],
      };

      const results = await downloadAllDocuments(documentos);

      expect(results.length).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("includes contract documents when provided", async () => {
      mockFetch.mockReturnValue(makePdfResponse());
      mockExtractText.mockResolvedValue({ text: ["texto"] } as never);

      const contratos: CvcrmContrato[] = [
        { idcontrato: 1, contrato: "Ato", tipo: "Ato", link: "https://example.com/ato.pdf" },
      ];

      const results = await downloadAllDocuments({}, contratos);

      expect(results.length).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("sets pessoa field from grupo key", async () => {
      mockFetch.mockReturnValue(makePdfResponse());
      mockExtractText.mockResolvedValue({ text: ["texto"] } as never);

      const documentos = {
        titular: [makeDoc()],
      };

      const results = await downloadAllDocuments(documentos);

      expect(results[0].pessoa).toBe("titular");
    });

    it("filters out null results from contracts without link", async () => {
      const contratos: CvcrmContrato[] = [
        { idcontrato: 1, contrato: "Ato sem link", tipo: "Ato" },
      ];

      const results = await downloadAllDocuments({}, contratos);

      // Contract without link is skipped (not added to tasks)
      expect(results).toEqual([]);
    });
  });
});
