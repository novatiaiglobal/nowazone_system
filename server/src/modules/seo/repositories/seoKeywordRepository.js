const SeoKeyword = require('../models/SeoKeyword');

async function create(data) {
  return SeoKeyword.create(data);
}

async function findById(id) {
  return SeoKeyword.findById(id).populate('createdBy', 'name email').exec();
}

async function findPaginated(filter, options = {}) {
  const { page = 1, limit = 20, sort = '-updatedAt' } = options;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SeoKeyword.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name').lean(),
    SeoKeyword.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateById(id, updates, options = {}) {
  return SeoKeyword.findByIdAndUpdate(id, updates, { new: true, runValidators: true, ...options });
}

async function deleteById(id) {
  return SeoKeyword.findByIdAndDelete(id);
}

async function getClusters() {
  return SeoKeyword.aggregate([
    { $match: { cluster: { $exists: true, $ne: '' } } },
    { $group: { _id: '$cluster', count: { $sum: 1 }, keywords: { $push: '$keyword' } } },
    { $sort: { count: -1 } },
  ]);
}

async function getStats() {
  const [total, tracking, ranked, lost, newKw, paused, avgDiff] = await Promise.all([
    SeoKeyword.countDocuments(),
    SeoKeyword.countDocuments({ status: 'tracking' }),
    SeoKeyword.countDocuments({ status: 'ranked' }),
    SeoKeyword.countDocuments({ status: 'lost' }),
    SeoKeyword.countDocuments({ status: 'new' }),
    SeoKeyword.countDocuments({ status: 'paused' }),
    SeoKeyword.aggregate([{ $group: { _id: null, avg: { $avg: '$difficulty' } } }]),
  ]);
  return {
    total,
    tracking,
    ranked,
    lost,
    new: newKw,
    paused,
    avgDifficulty: Math.round(avgDiff[0]?.avg ?? 0),
  };
}

async function getOpportunities(limit = 20) {
  return SeoKeyword.find({
    $or: [
      { status: 'new', searchVolume: { $gt: 0 } },
      { difficulty: { $lte: 50 }, currentRank: null },
    ],
  })
    .sort({ searchVolume: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  create,
  findById,
  findPaginated,
  updateById,
  deleteById,
  getStats,
  getClusters,
  getOpportunities,
};
