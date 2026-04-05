const seoPageService = require('../services/seoPageService');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function create(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const page = await seoPageService.create(payload, req.user._id, reqMeta(req));
    res.status(201).json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await seoPageService.list(query);
    res.json({
      status: 'success',
      data: {
        pages: result.items,
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
    const page = await seoPageService.getById(req.params.id);
    res.json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const payload = req.validated || req.body;
    const page = await seoPageService.update(req.params.id, payload, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const { status } = req.validated || req.body;
    const page = await seoPageService.setStatus(req.params.id, status, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const page = await seoPageService.publish(req.params.id, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function archive(req, res, next) {
  try {
    const page = await seoPageService.archive(req.params.id, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function getVersions(req, res, next) {
  try {
    const versions = await seoPageService.getVersions(req.params.id);
    res.json({ status: 'success', data: versions });
  } catch (err) {
    next(err);
  }
}

async function duplicate(req, res, next) {
  try {
    const page = await seoPageService.duplicate(req.params.id, req.user._id, reqMeta(req));
    res.status(201).json({ status: 'success', data: page });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await seoPageService.remove(req.params.id, req.user._id, reqMeta(req));
    res.json({ status: 'success', message: 'SEO page deleted' });
  } catch (err) {
    next(err);
  }
}

async function bulkImport(req, res, next) {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items || [];
    const result = await seoPageService.bulkImport(items, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function bulkUpdate(req, res, next) {
  try {
    const updates = Array.isArray(req.body) ? req.body : req.body.updates || [];
    const result = await seoPageService.bulkUpdate(updates, req.user._id, reqMeta(req));
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  setStatus,
  publish,
  archive,
  getVersions,
  duplicate,
  remove,
  bulkImport,
  bulkUpdate,
};
