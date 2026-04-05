const seoRedirectService = require('../services/seoRedirectService');
const SeoRedirect = require('../models/SeoRedirect');

/** GET /api/seo/redirects/list — public, for middleware. Returns active redirects. */
async function listPublic(req, res, next) {
  try {
    const redirects = await SeoRedirect.find({ isActive: true })
      .select('sourcePath targetPath redirectType matchType')
      .lean();
    const data = redirects.map((r) => ({
      fromPath: r.sourcePath,
      toPath: r.targetPath,
      type: r.redirectType,
    }));
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/seo/redirects/record-hit — public. Call when a redirect is applied. */
async function recordHit(req, res, next) {
  try {
    const fromPath = ((req.body && (req.body.fromPath || req.body.sourcePath)) || '').trim();
    if (!fromPath) {
      return res.status(400).json({ status: 'fail', message: 'fromPath or sourcePath is required' });
    }
    const entry = await SeoRedirect.findOneAndUpdate(
      { sourcePath: fromPath, isActive: true },
      { $inc: { hitCount: 1 }, $set: { lastHitAt: new Date() } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ status: 'fail', message: 'Redirect not found' });
    res.json({ status: 'success', data: { hitCount: entry.hitCount } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const redirect = await seoRedirectService.create(payload, req.user._id);
    res.status(201).json({ status: 'success', data: redirect });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const query = req.query;
    const result = await seoRedirectService.list(query);
    res.json({
      status: 'success',
      data: {
        redirects: result.items,
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
    const redirect = await seoRedirectService.getById(req.params.id);
    res.json({ status: 'success', data: redirect });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const redirect = await seoRedirectService.update(req.params.id, payload, req.user._id);
    res.json({ status: 'success', data: redirect });
  } catch (err) {
    next(err);
  }
}

async function toggle(req, res, next) {
  try {
    const redirect = await seoRedirectService.toggle(req.params.id, req.user._id);
    res.json({ status: 'success', data: redirect });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await seoRedirectService.remove(req.params.id);
    res.json({ status: 'success', message: 'Redirect deleted' });
  } catch (err) {
    next(err);
  }
}

async function validate(req, res, next) {
  try {
    const payload = req.body || {};
    const result = await seoRedirectService.validate(payload);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function bulkImport(req, res, next) {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items || [];
    const result = await seoRedirectService.bulkImport(items, req.user._id);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPublic,
  recordHit,
  create,
  list,
  getById,
  update,
  toggle,
  remove,
  validate,
  bulkImport,
};
