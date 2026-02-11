/**
 * Example queries using Drizzle ORM
 * Following official documentation patterns
 *
 * This file demonstrates common query patterns.
 * Copy and adapt these to your actual implementation.
 */

import { db } from "./index";
import {
  reservationsTable,
  reservationAuditsTable,
  ruleConfigsTable,
  auditLogsTable,
} from "./schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createReservation() {
  const [reservation] = await db
    .insert(reservationsTable)
    .values({
      externalId: "RES-2024-001",
      enterprise: "Acme Corp",
      status: "pending",
    })
    .returning();

  return reservation;
}

export async function createAudit(reservationId: string) {
  const [audit] = await db
    .insert(reservationAuditsTable)
    .values({
      reservationId,
      ruleVersion: 1,
      promptVersion: "v1.0.0",
      status: "approved",
      executionTimeMs: 1200,
      resultJson: {
        score: 94,
        approved: true,
      },
    })
    .returning();

  return audit;
}

// ============================================
// READ OPERATIONS
// ============================================

// Using Query API (with relations)
export async function getReservationWithAudits(id: string) {
  const reservation = await db.query.reservationsTable.findFirst({
    where: eq(reservationsTable.id, id),
    with: {
      audits: {
        orderBy: [desc(reservationAuditsTable.createdAt)],
        limit: 10,
        with: {
          logs: true,
        },
      },
    },
  });

  return reservation;
}

// Using traditional SQL-like syntax
export async function getReservationsByEnterprise(enterprise: string) {
  const reservations = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.enterprise, enterprise))
    .orderBy(desc(reservationsTable.createdAt));

  return reservations;
}

// Complex query with JOIN
export async function getReservationsWithLatestAudit() {
  const results = await db
    .select({
      reservation: reservationsTable,
      latestAudit: reservationAuditsTable,
    })
    .from(reservationsTable)
    .leftJoin(
      reservationAuditsTable,
      eq(reservationsTable.id, reservationAuditsTable.reservationId)
    )
    .orderBy(desc(reservationAuditsTable.createdAt));

  return results;
}

// Query with filters
export async function getActiveRulesByType(type: "financial" | "documents") {
  const rules = await db
    .select()
    .from(ruleConfigsTable)
    .where(
      and(eq(ruleConfigsTable.type, type), eq(ruleConfigsTable.isActive, true))
    )
    .orderBy(desc(ruleConfigsTable.version));

  return rules;
}

// Aggregation
export async function getReservationStats() {
  const stats = await db
    .select({
      status: reservationsTable.status,
      count: count(),
    })
    .from(reservationsTable)
    .groupBy(reservationsTable.status);

  return stats;
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateReservationStatus(
  id: string,
  status: "pending" | "approved" | "divergent"
) {
  const [updated] = await db
    .update(reservationsTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(reservationsTable.id, id))
    .returning();

  return updated;
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteReservation(id: string) {
  // Cascading deletes are handled by FK constraints
  await db.delete(reservationsTable).where(eq(reservationsTable.id, id));
}

// ============================================
// TRANSACTIONS
// ============================================

export async function createReservationWithAudit(data: {
  externalId: string;
  enterprise: string;
  auditData: {
    ruleVersion: number;
    promptVersion: string;
    status: "approved" | "divergent" | "error";
    resultJson: any;
    executionTimeMs: number;
  };
}) {
  return await db.transaction(async (tx) => {
    // Create reservation
    const [reservation] = await tx
      .insert(reservationsTable)
      .values({
        externalId: data.externalId,
        enterprise: data.enterprise,
        status: "pending",
      })
      .returning();

    // Create audit
    const [audit] = await tx
      .insert(reservationAuditsTable)
      .values({
        reservationId: reservation.id,
        ...data.auditData,
      })
      .returning();

    // Create log
    await tx.insert(auditLogsTable).values({
      reservationAuditId: audit.id,
      level: "info",
      message: "Audit created successfully",
      metadata: { source: "api" },
    });

    return { reservation, audit };
  });
}

// ============================================
// RAW SQL (when needed)
// ============================================

export async function getReservationCountByMonth() {
  const result = await db.execute(
    sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM reservations
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `
  );

  return result.rows;
}
