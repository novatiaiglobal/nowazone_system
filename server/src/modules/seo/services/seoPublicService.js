const seoPageRepo = require('../repositories/seoPageRepository');
const SeoTemplate = require('../models/SeoTemplate');
const Settings = require('../../settings/models/Settings');

/**
 * Build normalized SEO payload for Next.js generateMetadata.
 * Fallback order: exact page config → template → default from settings.
 */
function buildMetadataPayload(pageOrTemplate, defaults = {}) {
  const title = pageOrTemplate?.title ?? pageOrTemplate?.metaTitle ?? defaults.defaultTitle ?? '';
  const description = pageOrTemplate?.metaDescription ?? defaults.defaultMetaDescription ?? '';
  const canonical = pageOrTemplate?.canonicalUrl ?? '';
  const robots = pageOrTemplate?.robotsDirectives ?? pageOrTemplate?.robots ?? 'index, follow';
  const og = {
    title: pageOrTemplate?.openGraph?.title ?? pageOrTemplate?.ogTitle ?? title,
    description: pageOrTemplate?.openGraph?.description ?? pageOrTemplate?.ogDescription ?? description,
    image: pageOrTemplate?.openGraph?.image ?? pageOrTemplate?.ogImage ?? '',
    type: pageOrTemplate?.openGraph?.type ?? pageOrTemplate?.ogType ?? 'website',
  };
  const twitter = {
    card: pageOrTemplate?.twitter?.card ?? 'summary_large_image',
    title: pageOrTemplate?.twitter?.title ?? og.title,
    description: pageOrTemplate?.twitter?.description ?? og.description,
    image: pageOrTemplate?.twitter?.image ?? og.image,
  };
  const jsonLd = pageOrTemplate?.structuredData ?? null;

  return {
    title,
    description,
    canonical,
    robots,
    openGraph: og,
    twitter,
    jsonLd,
  };
}

async function getByRoute(path, locale = 'en', region = '') {
  const normalizedPath = path.replace(/\/+/g, '/').toLowerCase();
  if (!normalizedPath.startsWith('/')) return null;

  const page = await seoPageRepo.findOnePublished(normalizedPath, locale, region);
  if (page) return buildMetadataPayload(page);

  const template = await SeoTemplate.findOne({ entityType: 'page', isActive: true }).lean();
  const settings = await Settings.findOne().select('seo').lean();
  const defaults = settings?.seo || {};
  return buildMetadataPayload(template || {}, defaults);
}

async function getByEntity(entityType, entityId, locale = 'en', region = '') {
  const template = await SeoTemplate.findOne({ entityType, isActive: true }).lean();
  const settings = await Settings.findOne().select('seo').lean();
  const defaults = settings?.seo || {};

  const page = await seoPageRepo.findPaginated(
    { targetEntityType: entityType, targetEntityId: entityId, status: 'published', deletedAt: null },
    { limit: 1 }
  );
  const exact = page.items[0];
  if (exact) return buildMetadataPayload(exact, defaults);

  return buildMetadataPayload(template || {}, defaults);
}

module.exports = {
  buildMetadataPayload,
  getByRoute,
  getByEntity,
};
