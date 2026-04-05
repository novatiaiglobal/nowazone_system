const sitemapService = require('../services/sitemapService');
const Settings = require('../../settings/models/Settings');

/** GET /api/seo/robots.txt — public. Returns robots.txt content. */
async function getRobotsTxt(req, res, next) {
  try {
    const baseUrl = (process.env.CLIENT_URL || 'https://example.com').replace(/\/$/, '');
    const sitemapUrl = `${baseUrl}/api/seo/sitemap/xml`;
    const settings = await Settings.findOne().select('seo').lean();
    const allowIndexing = settings?.seo?.allowIndexing !== false;
    let body = 'User-agent: *\n';
    body += allowIndexing ? 'Allow: /\n' : 'Disallow: /\n';
    body += `\nSitemap: ${sitemapUrl}\n`;
    res.set('Content-Type', 'text/plain');
    res.send(body);
  } catch (err) {
    next(err);
  }
}

/** GET /api/seo/sitemap/preview — returns { totalUrls, excludedNoindex, xml, urls } for admin UI. */
async function getPreview(req, res, next) {
  try {
    const baseUrl = req.query.baseUrl || '';
    const data = await sitemapService.getPreview(baseUrl);
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function getConfig(req, res, next) {
  try {
    const config = await sitemapService.getConfig();
    res.json({ status: 'success', data: config });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const config = await sitemapService.updateConfig(payload, req.user._id);
    res.json({ status: 'success', data: config });
  } catch (err) {
    next(err);
  }
}

async function generate(req, res, next) {
  try {
    const result = await sitemapService.generate(req.user._id);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function getEntries(req, res, next) {
  try {
    const result = await sitemapService.getEntries(req.query);
    res.json({
      status: 'success',
      data: {
        entries: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateEntry(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const entry = await sitemapService.updateEntry(req.params.id, payload);
    res.json({ status: 'success', data: entry });
  } catch (err) {
    next(err);
  }
}

async function getXml(req, res, next) {
  try {
    const xml = await sitemapService.getXml();
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await sitemapService.getStatus();
    res.json({ status: 'success', data: status });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRobotsTxt,
  getPreview,
  getConfig,
  updateConfig,
  generate,
  getEntries,
  updateEntry,
  getXml,
  getStatus,
};
