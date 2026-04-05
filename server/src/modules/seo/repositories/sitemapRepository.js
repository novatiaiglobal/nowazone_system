const SitemapConfig = require('../models/SitemapConfig');
const SitemapEntry = require('../models/SitemapEntry');

async function getConfig() {
  let config = await SitemapConfig.findOne().lean();
  if (!config) {
    const baseUrl = process.env.CLIENT_URL || 'https://example.com';
    config = await SitemapConfig.create({
      baseUrl: baseUrl.replace(/\/$/, ''),
      includeStaticPages: true,
      includeDynamicPages: true,
      defaultChangefreq: 'weekly',
      defaultPriority: 0.8,
    });
    return config.toObject ? config.toObject() : config;
  }
  return config;
}

async function updateConfig(updates) {
  let config = await SitemapConfig.findOne();
  if (!config) {
    config = await SitemapConfig.create(updates);
    return config;
  }
  Object.assign(config, updates);
  await config.save();
  return config;
}

async function deleteAllEntries() {
  const result = await SitemapEntry.deleteMany({});
  return result.deletedCount;
}

async function upsertEntry(entry) {
  return SitemapEntry.findOneAndUpdate(
    { url: entry.url },
    { $set: entry },
    { upsert: true, new: true }
  );
}

async function upsertEntries(entries) {
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { url: e.url },
      update: { $set: e },
      upsert: true,
    },
  }));
  if (ops.length === 0) return [];
  await SitemapEntry.bulkWrite(ops);
  return SitemapEntry.find({ url: { $in: entries.map((x) => x.url) } }).lean();
}

async function findEntriesPaginated(filter, options = {}) {
  const { page = 1, limit = 100, sort = 'url' } = options;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SitemapEntry.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    SitemapEntry.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findIncludedEntries() {
  return SitemapEntry.find({ included: true }).sort({ priority: -1, url: 1 }).lean();
}

async function updateEntryById(id, updates) {
  return SitemapEntry.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
}

module.exports = {
  getConfig,
  updateConfig,
  deleteAllEntries,
  upsertEntry,
  upsertEntries,
  findEntriesPaginated,
  findIncludedEntries,
  updateEntryById,
};
