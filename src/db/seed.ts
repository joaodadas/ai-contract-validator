import "dotenv/config";
import { db } from "./index";
import {
  ruleConfigsTable,
  reservationsTable,
  reservationAuditsTable,
} from "./schema";

/**
 * Seed script for initial data
 * Run with: npx tsx src/db/seed.ts
 */
async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Seed default rule configs
    console.log("📋 Creating default rule configs...");

    await db.insert(ruleConfigsTable).values([
      {
        type: "financial",
        scope: "global",
        enterprise: null,
        version: 1,
        isActive: true,
        config: {
          maxContractValue: 500000,
          minScore: 75,
          requireGuarantee: true,
          guaranteeTypes: ["caution", "insurance", "bank-guarantee"],
        },
      },
      {
        type: "documents",
        scope: "global",
        enterprise: null,
        version: 1,
        isActive: true,
        config: {
          requiredDocuments: [
            "contract",
            "financial_attachment",
            "negative_certificate",
          ],
          maxDocumentAgeInDays: 30,
          allowedFormats: ["pdf"],
        },
      },
      {
        type: "score",
        scope: "global",
        enterprise: null,
        version: 1,
        isActive: true,
        config: {
          weights: {
            financial: 40,
            documentation: 30,
            clientHistory: 20,
            compliance: 10,
          },
          thresholds: {
            approved: 80,
            review: 50,
            rejected: 0,
          },
        },
      },
    ]);

    console.log("✅ Default rules created");

    // Seed sample reservations (optional)
    console.log("📦 Creating sample reservations...");

    const [reservation1] = await db
      .insert(reservationsTable)
      .values({
        externalId: "RES-2024-SEED-001",
        enterprise: "Tech Solutions Ltda",
        status: "approved",
      })
      .returning();

    const [reservation2] = await db
      .insert(reservationsTable)
      .values({
        externalId: "RES-2024-SEED-002",
        enterprise: "Global Corp S.A.",
        status: "pending",
      })
      .returning();

    console.log("✅ Sample reservations created");

    // Seed sample audit
    await db.insert(reservationAuditsTable).values({
      reservationId: reservation1.id,
      ruleVersion: 1,
      promptVersion: "v1.0.0",
      status: "approved",
      executionTimeMs: 1250,
      resultJson: {
        score: 94,
        approved: true,
        checks: {
          financial: { passed: true, score: 95 },
          documents: { passed: true, score: 92 },
          clientHistory: { passed: true, score: 96 },
          compliance: { passed: true, score: 93 },
        },
      },
      aiRawOutput: {
        model: "gpt-4",
        tokens: 850,
        rawText:
          "Contract analysis completed. All criteria met. Recommendation: APPROVE",
      },
    });

    console.log("✅ Sample audit created");

    console.log("\n🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
