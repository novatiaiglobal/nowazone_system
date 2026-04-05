const SeoRedirect = require('../models/SeoRedirect');

async function create(data) {
  return SeoRedirect.create(data);
}

async function findById(id) {
  return SeoRedirect.findById(id).populate('createdBy', 'name email').exec();
}

async function findPaginated(filter, options = {}) {
  const { page = 1, limit = 20, sort = '-updatedAt' } = options;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SeoRedirect.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name').lean(),
    SeoRedirect.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateById(id, updates, options = {}) {
  return SeoRedirect.findByIdAndUpdate(id, updates, { new: true, runValidators: true, ...options });
}

async function deleteById(id) {
  return SeoRedirect.findByIdAndDelete(id);
}

async function findBySourceExact(sourcePath, activeOnly = true) {
  const q = { sourcePath, matchType: 'exact' };
  if (activeOnly) q.isActive = true;
  return SeoRedirect.findOne(q).exec();
}

async function listActiveForMiddleware() {
  return SeoRedirect.find({ isActive: true }).select('sourcePath targetPath redirectType matchType').lean();
}

async function findAllTargetPaths() {
  const docs = await SeoRedirect.find({ isActive: true }).select('targetPath').lean();
  return [...new Set(docs.map((d) => d.targetPath))];
}

module.exports = {
  create,
  findById,
  findPaginated,
  updateById,
  deleteById,
  findBySourceExact,
  listActiveForMiddleware,
  findAllTargetPaths,
};
