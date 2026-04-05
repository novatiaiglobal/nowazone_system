const seoOverviewService = require('../services/seoOverviewService');

async function getOverview(req, res, next) {
  try {
    const data = await seoOverviewService.getOverview();
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
