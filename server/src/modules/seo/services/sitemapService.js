const { AppError } = require('../../../shared/middleware/errorHandler');
const SeoPage = require('../models/SeoPage');
const sitemapRepo = require('../repositories/sitemapRepository');

async function getConfig() {
  return sitemapRepo.getConfig();
}

/**
 * Preview shape for admin UI: totalUrls, excludedNoindex, xml, urls (array of { loc, lastmod, changefreq, priority }).
 * Uses published SEO pages; baseUrl from param or config.
 */
async function getPreview(baseUrlFromQuery) {
  const config = await sitemapRepo.getConfig();
  const baseUrl = (baseUrlFromQuery || config.baseUrl || process.env.CLIENT_URL || 'https://example.com').replace(/\/$/, '');

  const allPublished = await SeoPage.find({
    deletedAt: null,
    status: 'published',
  })
    .select('routePath pagePath updatedAt locale region robotsDirectives robots')
    .lean();

  const noindexRegex = /noindex/;
  const urls = [];
  let excludedNoindex = 0;

  for (const page of allPublished) {
    const path = page.routePath || page.pagePath || '/';
    const robots = page.robotsDirectives || page.robots || '';
    if (noindexRegex.test(robots)) {
      excludedNoindex++;
      continue;
    }
    const locale = page.locale || 'en';
    const region = page.region || '';
    let loc = `${baseUrl}${path}`;
    if (locale && locale !== 'en') loc += (path.includes('?') ? '&' : '?') + `locale=${locale}`;
    if (region) loc += (loc.includes('?') ? '&' : '?') + `region=${region}`;

    urls.push({
      loc,
      lastmod: page.updatedAt ? new Date(page.updatedAt).toISOString().split('T')[0] : undefined,
      changefreq: config.defaultChangefreq || 'weekly',
      priority: String(config.defaultPriority ?? 0.8),
    });
  }

  const xml = buildXml(
    urls.map((u) => ({ url: u.loc, lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })),
    baseUrl
  );

  return {
    totalUrls: urls.length,
    excludedNoindex,
    xml,
    urls,
  };
}

async function updateConfig(payload, userId) {
  return sitemapRepo.updateConfig({ ...payload, updatedBy: userId });
}

async function generate(userId) {
  const config = await sitemapRepo.getConfig();
  const baseUrl = (config.baseUrl || process.env.CLIENT_URL || 'https://example.com').replace(/\/$/, '');

  const pages = await SeoPage.find({
    deletedAt: null,
    status: 'published',
    $nor: [{ robotsDirectives: /noindex/ }, { robots: /noindex/ }],
  })
    .select('routePath updatedAt locale region')
    .lean();

  const entries = [];
  const locales = config.locales && config.locales.length ? config.locales : ['en'];
  const excluded = new Set((config.excludedPaths || []).map((p) => p.toLowerCase()));

  for (const page of pages) {
    const path = page.routePath || page.pagePath || '/';
    if (excluded.has(path.toLowerCase())) continue;
    const locale = page.locale || 'en';
    const region = page.region || '';
    let url = `${baseUrl}${path}`;
    if (locale && locale !== 'en') url += (path.includes('?') ? '&' : '?') + `locale=${locale}`;
    if (region) url += (url.includes('?') ? '&' : '?') + `region=${region}`;

    entries.push({
      url,
      pageType: 'static',
      locale,
      changefreq: config.defaultChangefreq || 'weekly',
      priority: config.defaultPriority ?? 0.8,
      lastmod: page.updatedAt || new Date(),
      included: true,
      sourceModel: 'SeoPage',
      sourceId: page._id,
    });
  }

  await sitemapRepo.deleteAllEntries();
  await sitemapRepo.upsertEntries(entries);
  await sitemapRepo.updateConfig({ lastGeneratedAt: new Date(), updatedBy: userId });

  return { generated: entries.length, lastGeneratedAt: new Date() };
}

async function getEntries(query) {
  const filter = {};
  if (query.included !== undefined) filter.included = query.included === 'true';
  if (query.locale) filter.locale = query.locale;
  return sitemapRepo.findEntriesPaginated(filter, {
    page: query.page,
    limit: query.limit,
    sort: query.sort || 'url',
  });
}

async function updateEntry(id, payload) {
  const allowed = ['included', 'priority', 'changefreq'];
  const updates = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) updates[k] = payload[k];
  }
  const updated = await sitemapRepo.updateEntryById(id, updates);
  if (!updated) throw new AppError('Sitemap entry not found', 404);
  return updated;
}

function buildXml(entries, baseUrl) {
  const urlset = 'http://www.sitemaps.org/schemas/sitemap/0.9';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<urlset xmlns="${urlset}">\n`;
  for (const e of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(e.url)}</loc>\n`;
    if (e.lastmod) xml += `    <lastmod>${new Date(e.lastmod).toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>${e.changefreq || 'weekly'}</changefreq>\n`;
    xml += `    <priority>${Number(e.priority) || 0.8}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>';
  return xml;
}

function escapeXml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getXml() {
  const config = await sitemapRepo.getConfig();
  const baseUrl = (config.baseUrl || process.env.CLIENT_URL || 'https://example.com').replace(/\/$/, '');
  const entries = await sitemapRepo.findIncludedEntries();
  return buildXml(entries, baseUrl);
}

async function getStatus() {
  const config = await sitemapRepo.getConfig();
  const count = await require('../models/SitemapEntry').countDocuments({ included: true });
  return {
    lastGeneratedAt: config.lastGeneratedAt,
    totalEntries: count,
    autoGenerate: config.autoGenerate,
  };
}

module.exports = {
  getConfig,
  updateConfig,
  generate,
  getEntries,
  updateEntry,
  getXml,
  getStatus,
  buildXml,
};
