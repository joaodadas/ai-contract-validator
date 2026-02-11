import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { sessionsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const publicPaths = ["/", "/login", "/register"];
const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get("session")?.value;
  let user = null;

  if (sessionId) {
    try {
      const [session] = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.id, sessionId))
        .limit(1);

      if (session && session.expiresAt > new Date()) {
        const [foundUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, session.userId))
          .limit(1);
        
        user = foundUser;
      }
    } catch (error) {
      console.error("Session validation error:", error);
    }
  }

  // If user is authenticated and trying to access login/register
  if (user && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not authenticated and trying to access protected routes
  if (!user && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
