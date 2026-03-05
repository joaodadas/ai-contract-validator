import { db } from "./index";
import {
  reservationsTable,
  reservationAuditsTable,
  auditLogsTable,
  type NewReservationAudit,
  type NewAuditLog,
} from "./schema";
import { eq, desc, count, asc } from "drizzle-orm";

export async function getReservations() {
  return db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
}

export async function getRecentReservations(limit = 6) {
  return db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt))
    .limit(limit);
}

export async function getReservationStats() {
  const rows = await db
    .select({ status: reservationsTable.status, count: count() })
    .from(reservationsTable)
    .groupBy(reservationsTable.status);

  const stats = { total: 0, pending: 0, approved: 0, divergent: 0 };
  for (const row of rows) {
    stats[row.status] = Number(row.count);
    stats.total += Number(row.count);
  }
  return stats;
}

export async function getReservationByExternalId(externalId: string) {
  return db.query.reservationsTable.findFirst({
    where: eq(reservationsTable.externalId, externalId),
  });
}

export async function getReservationById(id: string) {
  return db.query.reservationsTable.findFirst({
    where: eq(reservationsTable.id, id),
  });
}

export async function insertReservationAudit(
  data: Omit<NewReservationAudit, "id" | "createdAt">
) {
  const [audit] = await db
    .insert(reservationAuditsTable)
    .values(data)
    .returning();
  return audit;
}

export async function insertAuditLog(
  data: Omit<NewAuditLog, "id" | "createdAt">
) {
  const [log] = await db.insert(auditLogsTable).values(data).returning();
  return log;
}

export async function getLogsForReservation(reservationId: string) {
  const audits = await db.query.reservationAuditsTable.findMany({
    where: eq(reservationAuditsTable.reservationId, reservationId),
    orderBy: desc(reservationAuditsTable.createdAt),
    with: {
      logs: {
        orderBy: asc(auditLogsTable.createdAt),
      },
    },
  });
  return audits;
}

export async function getReservationStatus(reservationId: string) {
  const reservation = await db.query.reservationsTable.findFirst({
    where: eq(reservationsTable.id, reservationId),
    columns: { id: true, status: true },
  });

  if (!reservation) return null;

  const audits = await getLogsForReservation(reservationId);

  return {
    status: reservation.status,
    audits,
  };
}

export async function updateReservationStatus(
  id: string,
  status: "pending" | "approved" | "divergent"
) {
  await db
    .update(reservationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(reservationsTable.id, id));
}
