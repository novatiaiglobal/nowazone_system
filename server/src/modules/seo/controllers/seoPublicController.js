const seoPublicService = require('../services/seoPublicService');
const seoPageRepo = require('../repositories/seoPageRepository');

/** Legacy: GET /api/seo/public?path= — returns full page doc for backward compatibility. */
async function getPublicSeo(req, res, next) {
  try {
    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ status: 'fail', message: 'Query parameter "path" is required' });
    }
    const locale = req.query.locale || 'en';
    const region = req.query.region || '';
    const page = await seoPageRepo.findOnePublished(path, locale, region);
    if (!page) {
      return res.json({ status: 'success', data: null });
    }
    const data = {
      ...page,
      pagePath: page.routePath,
      metaTitle: page.title,
      keywords: page.metaKeywords,
      isPublished: true,
    };
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

async function getByRoute(req, res, next) {
  try {
    const { path, locale = 'en', region = '' } = req.validatedQuery || req.query;
    if (!path) {
      return res.status(400).json({ status: 'fail', message: 'Query parameter "path" is required' });
    }
    const data = await seoPublicService.getByRoute(path, locale, region);
    res.json({ status: 'success', data: data || null });
  } catch (err) {
    next(err);
  }
}

async function getByEntity(req, res, next) {
  try {
    const { type, id, locale = 'en', region = '' } = req.validatedQuery || req.query;
    if (!type || !id) {
      return res.status(400).json({ status: 'fail', message: 'Query parameters "type" and "id" are required' });
    }
    const data = await seoPublicService.getByEntity(type, id, locale, region);
    res.json({ status: 'success', data: data || null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicSeo, getByRoute, getByEntity };
