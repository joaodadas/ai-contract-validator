import type { CvcrmDocumentoItem, CvcrmContrato } from "./types";
import { extractText } from "unpdf";

export type DocumentContent = {
  documentId: number;
  nome: string;
  tipo: string;
  contentType: "text" | "image";
  text?: string;
  imageData?: Buffer;
  imageMimeType?: string;
  link: string;
  error?: string;
  pessoa?: string;
};

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_CONCURRENCY = 5;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"];
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

function isImageContentType(contentType: string): boolean {
  return IMAGE_MIME_TYPES.some((t) => contentType.startsWith(t));
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getMimeTypeFromUrl(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tiff")) return "image/tiff";
  return "image/jpeg";
}

async function downloadSingle(link: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(link, {
      signal: controller.signal,
      headers: { Accept: "*/*" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${contentLength} bytes`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${buffer.length} bytes`);
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { buffer, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { text } = await extractText(new Uint8Array(buffer));
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    return joined.trim();
  } catch (err) {
    console.error("[documentDownloader] PDF parse error:", err);
    return "";
  }
}

export async function downloadDocument(
  doc: CvcrmDocumentoItem,
): Promise<DocumentContent> {
  const base: Omit<DocumentContent, "contentType"> = {
    documentId: doc.idreservasdocumentos,
    nome: doc.nome,
    tipo: doc.tipo,
    link: doc.link,
  };

  if (!doc.link) {
    return { ...base, contentType: "text", error: "No link available" };
  }

  try {
    const { buffer, contentType } = await downloadSingle(doc.link);

    if (isImageContentType(contentType) || isImageUrl(doc.link)) {
      const mimeType = isImageContentType(contentType)
        ? contentType.split(";")[0]
        : getMimeTypeFromUrl(doc.link);

      return {
        ...base,
        contentType: "image",
        imageData: buffer,
        imageMimeType: mimeType,
      };
    }

    // Assume PDF or text-based document
    const text = await extractPdfText(buffer);

    if (!text) {
      // PDF might be scanned (image-only). Return as image for vision processing.
      return {
        ...base,
        contentType: "image",
        imageData: buffer,
        imageMimeType: "application/pdf",
      };
    }

    return {
      ...base,
      contentType: "text",
      text,
      imageData: buffer,
      imageMimeType: "application/pdf",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[documentDownloader] Failed to download ${doc.nome} (${doc.link}): ${message}`,
    );
    return { ...base, contentType: "text", error: message };
  }
}

export async function downloadContractDocument(
  contrato: CvcrmContrato,
): Promise<DocumentContent | null> {
  if (!contrato.link) return null;

  const syntheticDoc: CvcrmDocumentoItem = {
    idreservasdocumentos: contrato.idreservacontrato ?? contrato.idcontrato ?? 0,
    nome: contrato.contrato,
    situacao: "Aprovado",
    idtipo: 0,
    tipo: contrato.tipo ?? contrato.contrato,
    idtipo_associacao: null,
    link: contrato.link,
  };

  return downloadDocument(syntheticDoc);
}

/**
 * Semaphore for limiting concurrent downloads.
 */
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
    });
    const wrapped = p.then(() => {
      executing.delete(wrapped);
    });
    executing.add(wrapped);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Downloads all documents and contracts in parallel with concurrency control.
 */
export async function downloadAllDocuments(
  documentos: Record<string, CvcrmDocumentoItem[]>,
  contratos?: CvcrmContrato[],
): Promise<DocumentContent[]> {
  const tasks: (() => Promise<DocumentContent | null>)[] = [];

  for (const [grupo, docs] of Object.entries(documentos)) {
    if (!Array.isArray(docs)) continue;
    for (const doc of docs) {
      tasks.push(async () => {
        const result = await downloadDocument(doc);
        if (result) result.pessoa = grupo;
        return result;
      });
    }
  }

  if (contratos && Array.isArray(contratos)) {
    for (const contrato of contratos) {
      if (contrato.link) {
        tasks.push(() => downloadContractDocument(contrato));
      }
    }
  }

  console.log(`[documentDownloader] Downloading ${tasks.length} documents...`);

  const results = await withConcurrencyLimit(
    tasks as (() => Promise<DocumentContent | null>)[],
    MAX_CONCURRENCY,
  );

  const validResults = results.filter((r): r is DocumentContent => r !== null);

  const successful = validResults.filter((r) => !r.error).length;
  const failed = validResults.filter((r) => r.error).length;
  console.log(
    `[documentDownloader] Done: ${successful} successful, ${failed} failed`,
  );

  return validResults;
}
