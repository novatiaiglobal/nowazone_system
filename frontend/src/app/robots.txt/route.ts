import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/seo/robots.txt`, {
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const text = await res.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://example.com';
    const fallback = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/api/seo/sitemap.xml\n`;
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
