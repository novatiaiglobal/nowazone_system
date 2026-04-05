const { AppError } = require('../../../shared/middleware/errorHandler');
const seoKeywordRepo = require('../repositories/seoKeywordRepository');

function mapPayload(payload) {
  return {
    keyword: payload.keyword,
    targetUrl: payload.targetUrl ?? payload.pagePath,
    intent: payload.intent,
    cluster: payload.cluster,
    priority: payload.priority ?? 0,
    targetRegion: payload.targetRegion,
    targetLocale: payload.targetLocale,
    targetService: payload.targetService,
    targetIndustry: payload.targetIndustry,
    searchVolume: payload.searchVolume ?? null,
    difficulty: payload.difficulty ?? null,
    currentRank: payload.currentRank ?? null,
    impressions: payload.impressions ?? null,
    clicks: payload.clicks ?? null,
    ctr: payload.ctr ?? null,
    avgPosition: payload.avgPosition ?? null,
    notes: payload.notes,
    status: payload.status ?? 'new',
    createdBy: payload.createdBy,
  };
}

async function create(payload, userId) {
  const data = mapPayload({ ...payload, createdBy: userId });
  return seoKeywordRepo.create(data);
}

async function getById(id) {
  const kw = await seoKeywordRepo.findById(id);
  if (!kw) throw new AppError('Keyword not found', 404);
  return kw;
}

async function list(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.cluster) filter.cluster = query.cluster;
  if (query.search) {
    filter.$or = [
      { keyword: { $regex: query.search, $options: 'i' } },
      { normalizedKeyword: { $regex: query.search, $options: 'i' } },
      { targetUrl: { $regex: query.search, $options: 'i' } },
    ];
  }
  return seoKeywordRepo.findPaginated(filter, {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
  });
}

async function update(id, payload, userId) {
  const kw = await seoKeywordRepo.findById(id);
  if (!kw) throw new AppError('Keyword not found', 404);
  const data = mapPayload(payload);
  delete data.keyword;
  data.createdBy = undefined;
  return seoKeywordRepo.updateById(id, data);
}

async function remove(id) {
  const kw = await seoKeywordRepo.findById(id);
  if (!kw) throw new AppError('Keyword not found', 404);
  await seoKeywordRepo.deleteById(id);
  return { deleted: true };
}

async function getStats() {
  return seoKeywordRepo.getStats();
}

async function getClusters() {
  return seoKeywordRepo.getClusters();
}

async function getOpportunities(limit = 20) {
  return seoKeywordRepo.getOpportunities(limit);
}

async function bulkImport(items, userId) {
  const results = { created: 0, errors: [] };
  for (let i = 0; i < items.length; i++) {
    try {
      await create(items[i], userId);
      results.created++;
    } catch (e) {
      results.errors.push({ index: i, message: e.message || 'Unknown error' });
    }
  }
  return results;
}

module.exports = {
  create,
  getById,
  list,
  update,
  remove,
  getStats,
  getClusters,
  getOpportunities,
  bulkImport,
};
