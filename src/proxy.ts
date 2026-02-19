import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register'];
const authPaths = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.has('session');

  if (hasSession && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!hasSession && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
