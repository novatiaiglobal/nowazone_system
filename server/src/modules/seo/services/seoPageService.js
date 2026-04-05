const { AppError } = require('../../../shared/middleware/errorHandler');
const { normalizeRoutePath } = require('../utils/seoSlug');
const { validateMetaTitle, validateMetaDescription, validateStructuredData } = require('../utils/seoValidation');
const seoPageRepo = require('../repositories/seoPageRepository');
const seoChangeLogRepo = require('../repositories/seoChangeLogRepository');

/**
 * Map API payload (legacy + new field names) to SeoPage document shape.
 */
function mapPayloadToPage(payload) {
  const routePath = normalizeRoutePath(payload.routePath || payload.pagePath || '');
  const title = payload.title ?? payload.metaTitle ?? '';
  const metaKeywords = payload.metaKeywords ?? payload.keywords ?? [];
  const status = payload.status ?? (payload.isPublished === true ? 'published' : payload.isPublished === false ? 'draft' : 'draft');
  const openGraph = payload.openGraph || {};
  if (payload.ogTitle) openGraph.title = payload.ogTitle;
  if (payload.ogDescription) openGraph.description = payload.ogDescription;
  if (payload.ogImage) openGraph.image = payload.ogImage;
  if (payload.ogType) openGraph.type = payload.ogType;

  return {
    pageType: payload.pageType || 'static',
    routePath,
    pageKey: payload.pageKey,
    pageName: payload.pageName,
    locale: payload.locale || 'en',
    region: payload.region || '',
    targetEntityType: payload.targetEntityType,
    targetEntityId: payload.targetEntityId,
    title,
    metaDescription: payload.metaDescription ?? '',
    metaKeywords,
    canonicalUrl: payload.canonicalUrl || '',
    robotsDirectives: payload.robotsDirectives ?? payload.robots ?? 'index, follow',
    openGraph,
    twitter: payload.twitter || {},
    structuredData: payload.structuredData ?? null,
    focusKeyword: payload.focusKeyword,
    secondaryKeywords: payload.secondaryKeywords || [],
    breadcrumbTitle: payload.breadcrumbTitle,
    slugOverride: payload.slugOverride,
    contentSummary: payload.contentSummary,
    schemaType: payload.schemaType,
    customHeadTags: payload.customHeadTags,
    status,
    owner: payload.owner,
    lastModifiedBy: payload.lastModifiedBy,
  };
}

async function create(payload, userId, reqMeta = {}) {
  const mapped = mapPayloadToPage(payload);
  if (!mapped.routePath) throw new AppError('routePath or pagePath is required', 400);

  const titleCheck = validateMetaTitle(mapped.title);
  if (!titleCheck.valid && mapped.title) throw new AppError(titleCheck.message, 400);
  const descCheck = validateMetaDescription(mapped.metaDescription);
  if (!descCheck.valid && mapped.metaDescription) throw new AppError(descCheck.message, 400);
  const sdCheck = validateStructuredData(mapped.structuredData);
  if (!sdCheck.valid) throw new AppError(sdCheck.message, 400);

  if (mapped.status === 'published') {
    const existing = await seoPageRepo.findOnePublished(mapped.routePath, mapped.locale, mapped.region);
    if (existing) throw new AppError('A published page already exists for this route+locale+region', 409);
  }

  mapped.owner = mapped.lastModifiedBy = userId;
  const page = await seoPageRepo.create(mapped);
  await seoChangeLogRepo.logSeoAction('create', 'SeoPage', page._id, { after: page.toObject(), changedBy: userId, ...reqMeta });
  return page;
}

async function getById(id, options = {}) {
  const page = await seoPageRepo.findById(id, options);
  if (!page) throw new AppError('SEO page not found', 404);
  return page;
}

async function list(query, options = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.locale) filter.locale = query.locale;
  if (query.region !== undefined) filter.region = query.region;
  if (query.pageType) filter.pageType = query.pageType;
  if (query.search) {
    filter.$or = [
      { pageName: { $regex: query.search, $options: 'i' } },
      { routePath: { $regex: query.search, $options: 'i' } },
      { focusKeyword: { $regex: query.search, $options: 'i' } },
    ];
  }
  return seoPageRepo.findPaginated(filter, {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    populate: 'owner lastModifiedBy',
  });
}

async function update(id, payload, userId, reqMeta = {}) {
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);

  const mapped = mapPayloadToPage({ ...page.toObject(), ...payload });
  const titleCheck = validateMetaTitle(mapped.title);
  if (!titleCheck.valid && mapped.title) throw new AppError(titleCheck.message, 400);
  const descCheck = validateMetaDescription(mapped.metaDescription);
  if (!descCheck.valid && mapped.metaDescription) throw new AppError(descCheck.message, 400);
  const sdCheck = validateStructuredData(mapped.structuredData);
  if (!sdCheck.valid) throw new AppError(sdCheck.message, 400);

  const before = page.toObject();
  delete mapped.status;
  mapped.lastModifiedBy = userId;
  const updated = await seoPageRepo.updateById(id, mapped);
  await seoChangeLogRepo.logSeoAction('update', 'SeoPage', id, { before, after: updated.toObject(), changedBy: userId, ...reqMeta });
  return updated;
}

async function setStatus(id, status, userId, reqMeta = {}) {
  if (status === 'published') {
    throw new AppError('Use POST /seo/pages/:id/publish to publish a page', 400);
  }
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);
  const before = page.toObject();
  const updated = await seoPageRepo.updateById(id, { status, lastModifiedBy: userId });
  await seoChangeLogRepo.logSeoAction('status_change', 'SeoPage', id, { before, after: updated.toObject(), changedBy: userId, ...reqMeta });
  return updated;
}

async function publish(id, userId, reqMeta = {}) {
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);
  if (page.status === 'published') throw new AppError('Page is already published', 400);

  const routePath = page.routePath || page.pagePath;
  const locale = page.locale || 'en';
  const region = page.region || '';

  const existingPublished = await seoPageRepo.findOnePublished(routePath, locale, region);
  if (existingPublished && existingPublished._id.toString() !== id) {
    await seoPageRepo.updateById(existingPublished._id, { status: 'archived', lastModifiedBy: userId });
  }

  const versionNumber = await seoPageRepo.getNextVersionNumber(page._id);
  await seoPageRepo.createVersion({
    seoPageId: page._id,
    versionNumber,
    snapshot: {
      title: page.title,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      canonicalUrl: page.canonicalUrl,
      robotsDirectives: page.robotsDirectives,
      openGraph: page.openGraph,
      twitter: page.twitter,
      structuredData: page.structuredData,
      focusKeyword: page.focusKeyword,
      routePath,
      locale,
      region,
    },
    approvedBy: userId,
    status: 'published',
  });

  const now = new Date();
  const updated = await seoPageRepo.updateById(id, {
    status: 'published',
    lastPublishedAt: now,
    publishAt: now,
    lastModifiedBy: userId,
  });

  await seoChangeLogRepo.logSeoAction('publish', 'SeoPage', id, { after: updated.toObject(), changedBy: userId, ...reqMeta });
  return updated;
}

async function archive(id, userId, reqMeta = {}) {
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);
  const before = page.toObject();
  const updated = await seoPageRepo.updateById(id, { status: 'archived', lastModifiedBy: userId });
  await seoChangeLogRepo.logSeoAction('archive', 'SeoPage', id, { before, after: updated.toObject(), changedBy: userId, ...reqMeta });
  return updated;
}

async function getVersions(seoPageId) {
  return seoPageRepo.findVersionsByPageId(seoPageId);
}

async function duplicate(id, userId, reqMeta = {}) {
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);
  const doc = page.toObject();
  delete doc._id;
  delete doc.createdAt;
  delete doc.updatedAt;
  delete doc.lastPublishedAt;
  delete doc.publishAt;
  doc.status = 'draft';
  doc.owner = doc.lastModifiedBy = userId;
  const created = await seoPageRepo.create(doc);
  await seoChangeLogRepo.logSeoAction('duplicate', 'SeoPage', created._id, { after: created.toObject(), changedBy: userId, ...reqMeta });
  return created;
}

async function remove(id, userId, reqMeta = {}) {
  const page = await seoPageRepo.findById(id);
  if (!page) throw new AppError('SEO page not found', 404);
  const before = page.toObject();
  const updated = await seoPageRepo.softDelete(id);
  await seoChangeLogRepo.logSeoAction('delete', 'SeoPage', id, { before, changedBy: userId, ...reqMeta });
  return updated;
}

async function bulkImport(items, userId, reqMeta = {}) {
  const results = { created: 0, errors: [] };
  for (let i = 0; i < items.length; i++) {
    try {
      await create(items[i], userId, reqMeta);
      results.created++;
    } catch (e) {
      results.errors.push({ index: i, message: e.message || 'Unknown error' });
    }
  }
  return results;
}

async function bulkUpdate(updates, userId, reqMeta = {}) {
  const results = { updated: 0, errors: [] };
  for (const { id, ...payload } of updates) {
    try {
      await update(id, payload, userId, reqMeta);
      results.updated++;
    } catch (e) {
      results.errors.push({ id, message: e.message || 'Unknown error' });
    }
  }
  return results;
}

module.exports = {
  mapPayloadToPage,
  create,
  getById,
  list,
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
