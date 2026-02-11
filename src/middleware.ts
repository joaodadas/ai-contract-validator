import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register'];
const authPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  // const pathname = request.nextUrl.pathname;
  // const hasSession = request.cookies.has("session");

  // // If user has session cookie and trying to access login/register,
  // // redirect to dashboard
  // if (hasSession && authPaths.includes(pathname)) {
  //   return NextResponse.redirect(new URL("/dashboard", request.url));
  // }

  // // If user has no session cookie and trying to access protected routes,
  // // redirect to login
  // if (!hasSession && !publicPaths.includes(pathname)) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
