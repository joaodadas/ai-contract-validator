import { db } from "./index";
import { reservationsTable } from "./schema";
import { eq, desc, count } from "drizzle-orm";

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
