import { db } from "./index";
import { reservationsTable } from "./schema";
import { eq, desc } from "drizzle-orm";

export async function getReservations() {
  return db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
}

export async function getReservationByExternalId(externalId: string) {
  return db.query.reservationsTable.findFirst({
    where: eq(reservationsTable.externalId, externalId),
  });
}
