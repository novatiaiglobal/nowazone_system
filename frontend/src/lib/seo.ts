/**
 * Server-side SEO helper for Next.js App Router.
 * Use in generateMetadata() or in Server Components to fetch metadata by route or entity.
 *
 * Requires NEXT_PUBLIC_API_URL (e.g. http://localhost:5000 or https://api.yourdomain.com).
 */

const getBaseUrl = () =>
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '')
    : '';

export interface SeoPayload {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  openGraph: {
    title: string;
    description: string;
    image: string;
    type: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  jsonLd: unknown;
}

/**
 * Fetch SEO metadata by route path. Use in generateMetadata() for static or dynamic routes.
 *
 * @example
 * // app/about/page.tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   const seo = await getSeoByRoute('/about');
 *   return metadataFromSeo(seo);
 * }
 */
export async function getSeoByRoute(
  path: string,
  locale = 'en',
  region = ''
): Promise<SeoPayload | null> {
  const base = getBaseUrl();
  const url = `${base}/api/seo/public/by-route?path=${encodeURIComponent(path)}&locale=${locale}&region=${region}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch SEO metadata by entity type and id (e.g. service, blog post). Use for entity detail pages.
 */
export async function getSeoByEntity(
  type: string,
  id: string,
  locale = 'en',
  region = ''
): Promise<SeoPayload | null> {
  const base = getBaseUrl();
  const url = `${base}/api/seo/public/by-entity?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&locale=${locale}&region=${region}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert SeoPayload to Next.js Metadata. Use in generateMetadata().
 */
export function metadataFromSeo(seo: SeoPayload | null): import('next').Metadata {
  if (!seo) return {};
  return {
    title: seo.title || undefined,
    description: seo.description || undefined,
    alternates: seo.canonical ? { canonical: seo.canonical } : undefined,
    robots: seo.robots || undefined,
    openGraph: {
      title: seo.openGraph?.title || seo.title,
      description: seo.openGraph?.description || seo.description,
      images: seo.openGraph?.image ? [{ url: seo.openGraph.image }] : undefined,
      type: (seo.openGraph?.type as 'website' | 'article') || 'website',
    },
    twitter: {
      card: (seo.twitter?.card as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: seo.twitter?.title || seo.title,
      description: seo.twitter?.description || seo.description,
      images: seo.twitter?.image ? [seo.twitter.image] : undefined,
    },
    other: seo.jsonLd
      ? { 'application/ld+json': JSON.stringify(seo.jsonLd) }
      : undefined,
  };
}

/** Next.js Metadata type for generateMetadata return */
type Metadata = import('next').Metadata;

/**
 * One-liner for generateMetadata(): fetch SEO by route and return Next.js Metadata.
 * Use in server page/layout: export async function generateMetadata() { return metadataForRoute('/about'); }
 */
export async function metadataForRoute(
  path: string,
  locale = 'en',
  region = ''
): Promise<Metadata> {
  const seo = await getSeoByRoute(path, locale, region);
  return metadataFromSeo(seo);
}

/**
 * One-liner for generateMetadata(): fetch SEO by entity and return Next.js Metadata.
 * Use for entity detail pages: export async function generateMetadata({ params }) { const { id } = await params; return metadataForEntity('service', id); }
 */
export async function metadataForEntity(
  type: string,
  id: string,
  locale = 'en',
  region = ''
): Promise<Metadata> {
  const seo = await getSeoByEntity(type, id, locale, region);
  return metadataFromSeo(seo);
}
