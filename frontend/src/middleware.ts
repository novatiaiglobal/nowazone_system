import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const REDIRECTS_CACHE_SEC = 60;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API, static, dashboard, auth
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${API_BASE}/seo/redirects/list`, {
      next: { revalidate: REDIRECTS_CACHE_SEC },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return NextResponse.next();

    const json = await res.json();
    const redirects: { fromPath: string; toPath: string; type: number }[] =
      json?.data || [];

    const normalized = pathname.replace(/\/$/, '') || '/';
    const match = redirects.find(
      (r) => {
        const rNorm = (r.fromPath || '').replace(/\/$/, '') || '/';
        return rNorm === normalized || pathname === r.fromPath;
      }
    );
    if (!match) return NextResponse.next();

    // Record hit (fire-and-forget, don't block redirect)
    fetch(`${API_BASE}/seo/redirects/record-hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromPath: match.fromPath }),
    }).catch(() => {});

    const base = request.nextUrl.origin;
    const toUrl = match.toPath.startsWith('http')
      ? match.toPath
      : match.toPath.startsWith('/')
        ? `${base}${match.toPath}`
        : `${base}/${match.toPath}`;

    return NextResponse.redirect(toUrl, match.type === 301 ? 301 : 302);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
