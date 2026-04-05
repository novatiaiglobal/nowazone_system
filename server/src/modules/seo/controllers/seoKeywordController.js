const seoKeywordService = require('../services/seoKeywordService');

async function create(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const keyword = await seoKeywordService.create(payload, req.user._id);
    res.status(201).json({ status: 'success', data: keyword });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await seoKeywordService.list(query);
    res.json({
      status: 'success',
      data: {
        keywords: result.items,
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

async function getById(req, res, next) {
  try {
    const keyword = await seoKeywordService.getById(req.params.id);
    res.json({ status: 'success', data: keyword });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const keyword = await seoKeywordService.update(req.params.id, payload, req.user._id);
    res.json({ status: 'success', data: keyword });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await seoKeywordService.remove(req.params.id);
    res.json({ status: 'success', message: 'Keyword deleted' });
  } catch (err) {
    next(err);
  }
}

async function bulkImport(req, res, next) {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items || [];
    const result = await seoKeywordService.bulkImport(items, req.user._id);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await seoKeywordService.getStats();
    res.json({ status: 'success', data: stats });
  } catch (err) {
    next(err);
  }
}

async function getClusters(req, res, next) {
  try {
    const clusters = await seoKeywordService.getClusters();
    res.json({ status: 'success', data: clusters });
  } catch (err) {
    next(err);
  }
}

async function getOpportunities(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const opportunities = await seoKeywordService.getOpportunities(limit);
    res.json({ status: 'success', data: opportunities });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  bulkImport,
  getStats,
  getClusters,
  getOpportunities,
};
