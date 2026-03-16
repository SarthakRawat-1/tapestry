import { NextResponse, type NextRequest } from 'next/server';

/**
 * Minimal middleware — just passes requests through.
 * Auth is checked in API routes via getCurrentUser().
 * No session refresh needed since we use stateless JWTs.
 */
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
