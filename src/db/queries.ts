import { db } from "./index";
import {
  reservationsTable,
  reservationAuditsTable,
  auditLogsTable,
  type NewReservationAudit,
  type NewAuditLog,
} from "./schema";
import { eq, desc, count, asc, ilike, and, gte, lte, or } from "drizzle-orm";

export type ReservationFilters = {
  search?: string;
  status?: "pending" | "approved" | "divergent" | "confirmed";
  enterprise?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getReservations() {
  return db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
}

export async function getFilteredReservations(filters: ReservationFilters = {}) {
  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(reservationsTable.titularNome, term),
        ilike(reservationsTable.externalId, term)
      )
    );
  }

  if (filters.status) {
    conditions.push(eq(reservationsTable.status, filters.status));
  }

  if (filters.enterprise) {
    conditions.push(eq(reservationsTable.enterprise, filters.enterprise));
  }

  if (filters.dateFrom) {
    conditions.push(gte(reservationsTable.createdAt, new Date(filters.dateFrom)));
  }

  if (filters.dateTo) {
    const endOfDay = new Date(filters.dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(lte(reservationsTable.createdAt, endOfDay));
  }

  return db
    .select()
    .from(reservationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reservationsTable.createdAt));
}

export async function getDistinctEnterprises() {
  const rows = await db
    .selectDistinct({ enterprise: reservationsTable.enterprise })
    .from(reservationsTable)
    .orderBy(reservationsTable.enterprise);
  return rows.map((r) => r.enterprise);
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

  const stats = { total: 0, pending: 0, approved: 0, divergent: 0, confirmed: 0 };
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

export async function getLatestAuditForReservation(reservationId: string) {
  return db.query.reservationAuditsTable.findFirst({
    where: eq(reservationAuditsTable.reservationId, reservationId),
    orderBy: desc(reservationAuditsTable.createdAt),
  });
}

export async function getRecentAuditsWithDetails(limit = 50) {
  return db.query.reservationAuditsTable.findMany({
    orderBy: desc(reservationAuditsTable.createdAt),
    limit,
    with: {
      reservation: {
        columns: {
          id: true,
          externalId: true,
          enterprise: true,
          titularNome: true,
          status: true,
        },
      },
      logs: {
        orderBy: asc(auditLogsTable.createdAt),
      },
    },
  });
}

export async function updateReservationStatus(
  id: string,
  status: "pending" | "approved" | "divergent" | "confirmed"
) {
  await db
    .update(reservationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(reservationsTable.id, id));
}
