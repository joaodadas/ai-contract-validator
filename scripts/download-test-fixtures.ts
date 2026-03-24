import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fetchReserva, fetchContratos, fetchDocumentos } from "../src/lib/cvcrm/client";
import { filterDocuments } from "../src/lib/cvcrm/constants";
import type { CvcrmDocumentoItem, CvcrmContrato } from "../src/lib/cvcrm/types";

const TEST_RESERVA_ID = Number(process.argv[2]);

if (!TEST_RESERVA_ID) {
  console.error("Usage: npx tsx scripts/download-test-fixtures.ts <idReserva>");
  process.exit(1);
}

const FIXTURES_DIR = path.resolve(__dirname, "../test-fixtures", String(TEST_RESERVA_ID));

async function downloadFile(url: string, filename: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "*/*" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`  ERRO HTTP ${res.status} para ${filename}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    // Determine extension from content-type
    let ext = path.extname(filename);
    if (!ext) {
      if (contentType.includes("pdf")) ext = ".pdf";
      else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
      else if (contentType.includes("png")) ext = ".png";
      else if (contentType.includes("gif")) ext = ".gif";
      else if (contentType.includes("webp")) ext = ".webp";
      else ext = ".bin";
    }

    // Sanitize filename
    const safeName = filename
      .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 80);

    const finalName = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`;
    const filePath = path.join(FIXTURES_DIR, finalName);

    fs.writeFileSync(filePath, buffer);
    console.log(`  ✅ ${finalName} (${buffer.length} bytes, ${contentType})`);
    return filePath;
  } catch (err) {
    console.error(`  ❌ ${filename}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function main() {
  console.log(`\n=== DOWNLOAD TEST FIXTURES — Reserva ${TEST_RESERVA_ID} ===\n`);

  // Create fixtures directory
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Step 1: Fetch reservation data
  console.log("[1] Buscando dados da reserva...");
  const apiResponse = await fetchReserva(TEST_RESERVA_ID);
  const reserva = Object.values(apiResponse)[0];
  if (!reserva) {
    console.error("Reserva não encontrada!");
    process.exit(1);
  }
  console.log(`    Titular: ${reserva.titular.nome}`);
  console.log(`    Empreendimento: ${reserva.unidade.empreendimento}`);

  // Save reservation metadata
  const metadataPath = path.join(FIXTURES_DIR, "metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify({
    reservaId: TEST_RESERVA_ID,
    titular: reserva.titular,
    unidade: reserva.unidade,
    situacao: reserva.situacao,
    associados: reserva.associados,
    condicoes: reserva.condicoes,
  }, null, 2));
  console.log(`    Metadata salvo em metadata.json`);

  // Step 2: Fetch documents and contracts
  console.log("\n[2] Buscando documentos e contratos...");
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(TEST_RESERVA_ID),
    fetchDocumentos(TEST_RESERVA_ID),
  ]);

  const documentosRaw = docsResponse.dados?.documentos ?? {};
  const documentos = filterDocuments(documentosRaw) as Record<string, CvcrmDocumentoItem[]>;

  // Save documents index
  const docsIndexPath = path.join(FIXTURES_DIR, "documents-index.json");
  fs.writeFileSync(docsIndexPath, JSON.stringify({
    raw: documentosRaw,
    filtered: documentos,
    contratos,
  }, null, 2));
  console.log(`    Documents index salvo em documents-index.json`);

  // Step 3: Download filtered documents
  console.log("\n[3] Baixando documentos filtrados...");
  const docsDir = path.join(FIXTURES_DIR, "documentos");
  fs.mkdirSync(docsDir, { recursive: true });

  let downloaded = 0;
  let failed = 0;

  for (const [grupo, docs] of Object.entries(documentos)) {
    console.log(`\n  Grupo: ${grupo}`);
    const grupoDir = path.join(docsDir, grupo.replace(/[^a-zA-Z0-9_\-. ]/g, "_"));
    fs.mkdirSync(grupoDir, { recursive: true });

    for (const doc of docs) {
      if (!doc.link) {
        console.log(`  ⏭️  ${doc.nome}: sem link`);
        continue;
      }

      // Save doc metadata alongside
      const metaPath = path.join(grupoDir, `${doc.idreservasdocumentos}_meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(doc, null, 2));

      const result = await downloadFile(
        doc.link,
        `${doc.idreservasdocumentos}_${doc.tipo}_${doc.nome}`
      );
      if (result) {
        downloaded++;
      } else {
        failed++;
      }
    }
  }

  // Step 4: Download contracts
  console.log("\n[4] Baixando contratos...");
  const contratosDir = path.join(FIXTURES_DIR, "contratos");
  fs.mkdirSync(contratosDir, { recursive: true });

  for (const contrato of contratos) {
    if (!contrato.link) {
      console.log(`  ⏭️  ${contrato.contrato}: sem link`);
      continue;
    }

    const id = contrato.idreservacontrato ?? contrato.idcontrato ?? 0;
    const metaPath = path.join(contratosDir, `${id}_meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(contrato, null, 2));

    const result = await downloadFile(
      contrato.link,
      `${id}_${contrato.contrato}`
    );
    if (result) {
      downloaded++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== CONCLUÍDO ===`);
  console.log(`    Fixtures salvas em: ${FIXTURES_DIR}`);
  console.log(`    Downloads: ${downloaded} OK, ${failed} falhas`);
  console.log(`\n    Para usar nos testes, aponte para: test-fixtures/${TEST_RESERVA_ID}/`);
}

main().catch(console.error);
