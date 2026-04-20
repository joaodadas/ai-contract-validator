import "dotenv/config";
import { db } from "@/db";
import { reservationsTable, reservationAuditsTable } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

const BACKTEST_DIR = path.resolve(process.cwd(), "backtest/fixtures");

async function main() {
  const targetIds = process.argv.slice(2);

  console.log("Querying reservations...");

  let reservations;
  if (targetIds.length > 0) {
    reservations = await db
      .select()
      .from(reservationsTable)
      .where(inArray(reservationsTable.externalId, targetIds));
  } else {
    reservations = await db
      .select()
      .from(reservationsTable)
      .where(inArray(reservationsTable.status, ["approved", "confirmed"]))
      .orderBy(desc(reservationsTable.createdAt))
      .limit(10);
  }

  console.log(`Found ${reservations.length} reservations`);

  const manifest: Array<{
    externalId: string;
    enterprise: string;
    status: string;
    documentCount: number;
  }> = [];

  for (const res of reservations) {
    const extId = res.externalId;
    const fixtureDir = path.join(BACKTEST_DIR, extId);
    const docsDir = path.join(fixtureDir, "documents");

    console.log(`\nExporting ${extId} (${res.enterprise})...`);

    fs.mkdirSync(docsDir, { recursive: true });

    // Save reservation snapshot
    fs.writeFileSync(
      path.join(fixtureDir, "reservation.json"),
      JSON.stringify(res.cvcrmSnapshot, null, 2),
    );

    // Get latest audit as ground truth
    const audit = await db.query.reservationAuditsTable.findFirst({
      where: eq(reservationAuditsTable.reservationId, res.id),
      orderBy: desc(reservationAuditsTable.createdAt),
    });

    if (audit?.resultJson) {
      fs.writeFileSync(
        path.join(fixtureDir, "ground-truth.json"),
        JSON.stringify(audit.resultJson, null, 2),
      );
    }

    // Download documents from CVCRM snapshot
    // documentos is Record<string, DocItem[]> grouped by pessoa (titular, conjuge, etc.)
    type DocItem = { nome: string; tipo: string; link?: string; idreservasdocumentos?: number };
    const snapshot = res.cvcrmSnapshot as {
      documentos?: Record<string, DocItem[]>;
    } | null;
    let docIndex = 0;
    if (snapshot?.documentos && typeof snapshot.documentos === "object") {
      const entries = Object.entries(snapshot.documentos);
      for (const [pessoa, docs] of entries) {
        if (!Array.isArray(docs)) continue;
        for (const doc of docs) {
          if (!doc.link) continue;
          try {
            const response = await fetch(doc.link, {
              signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok) {
              console.log(
                `  Warning: Failed to download ${doc.nome} [${pessoa}] (${response.status})`,
              );
              continue;
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const ext = doc.link.split(".").pop()?.split("?")[0] ?? "bin";
            const safeName = `${pessoa}-${doc.nome}`
              .replace(/[^a-zA-Z0-9-_]/g, "_")
              .substring(0, 60);
            const filename = `${docIndex.toString().padStart(2, "0")}-${safeName}.${ext}`;
            fs.writeFileSync(path.join(docsDir, filename), buffer);
            docIndex++;
          } catch (err) {
            console.log(
              `  Warning: Error downloading ${doc.nome} [${pessoa}]: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    }
    console.log(`  ${docIndex} documents saved`);

    manifest.push({
      externalId: extId,
      enterprise: res.enterprise,
      status: res.status,
      documentCount: docIndex,
    });
  }

  // Write manifest
  fs.writeFileSync(
    path.join(BACKTEST_DIR, "manifest.json"),
    JSON.stringify(
      { exportedAt: new Date().toISOString(), fixtures: manifest },
      null,
      2,
    ),
  );

  console.log(`\nExported ${manifest.length} fixtures to ${BACKTEST_DIR}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
