const SeoPage = require('../models/SeoPage');
const SeoPageVersion = require('../models/SeoPageVersion');

function notDeleted(q) {
  return q.notDeleted ? q.notDeleted() : SeoPage.find().notDeleted();
}

async function create(data) {
  return SeoPage.create(data);
}

async function findById(id, options = {}) {
  const q = SeoPage.findById(id);
  if (!options.includeDeleted) q.where({ deletedAt: null });
  return q.populate(options.populate || 'owner lastModifiedBy').exec();
}

async function findOnePublished(routePath, locale = 'en', region = '') {
  const normalized = routePath.toLowerCase().replace(/\/+/g, '/').trim() || '/';
  const loc = locale || 'en';
  const reg = region || '';
  return SeoPage.findOne({
    $or: [{ routePath: normalized }, { pagePath: normalized }],
    locale: loc,
    region: reg,
    status: 'published',
    deletedAt: null,
  }).lean();
}

async function findPaginated(filter, options = {}) {
  const { page = 1, limit = 20, sort = '-updatedAt', populate = '' } = options;
  const skip = (page - 1) * limit;
  const q = SeoPage.find({ ...filter, deletedAt: null });
  if (populate) q.populate(populate);
  const [items, total] = await Promise.all([
    q.sort(sort).skip(skip).limit(limit).lean(),
    SeoPage.countDocuments({ ...filter, deletedAt: null }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateById(id, updates, options = {}) {
  return SeoPage.findByIdAndUpdate(id, updates, { new: true, runValidators: true, ...options });
}

async function softDelete(id) {
  return SeoPage.findByIdAndUpdate(id, { deletedAt: new Date(), status: 'archived' }, { new: true });
}

async function countByStatus(status) {
  return SeoPage.countDocuments({ status, deletedAt: null });
}

async function countMissing(field) {
  return SeoPage.countDocuments({
    deletedAt: null,
    status: 'published',
    $or: [{ [field]: null }, { [field]: '' }, { [field]: [] }],
  });
}

// Versions
async function createVersion(data) {
  return SeoPageVersion.create(data);
}

async function getNextVersionNumber(seoPageId) {
  const last = await SeoPageVersion.findOne({ seoPageId }).sort({ versionNumber: -1 }).select('versionNumber').lean();
  return (last?.versionNumber || 0) + 1;
}

async function findVersionsByPageId(seoPageId, options = {}) {
  const { limit = 50 } = options;
  return SeoPageVersion.find({ seoPageId }).sort({ versionNumber: -1 }).limit(limit).populate('editedBy approvedBy', 'name email').lean();
}

module.exports = {
  create,
  findById,
  findOnePublished,
  findPaginated,
  updateById,
  softDelete,
  countByStatus,
  countMissing,
  createVersion,
  getNextVersionNumber,
  findVersionsByPageId,
};
