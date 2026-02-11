import { cookies } from "next/headers";
import { db } from "@/db";
import { sessionsTable, usersTable, type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: number): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

export async function getSession(): Promise<{
  user: User;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    }
    return null;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    return null;
  }

  // Refresh session expiration
  const newExpiresAt = new Date(Date.now() + SESSION_DURATION);
  await db
    .update(sessionsTable)
    .set({ expiresAt: newExpiresAt })
    .where(eq(sessionsTable.id, sessionId));

  return { user, sessionId };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
