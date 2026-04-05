const { AppError } = require('../../../shared/middleware/errorHandler');
const { isSafeRedirectRegex } = require('../utils/seoValidation');
const seoRedirectRepo = require('../repositories/seoRedirectRepository');

function mapPayload(payload) {
  const source = (payload.sourcePath || payload.fromPath || '').trim();
  const target = (payload.targetPath || payload.toPath || '').trim();
  const redirectType = payload.redirectType != null ? payload.redirectType : (payload.type != null ? payload.type : 301);
  return {
    sourcePath: source,
    targetPath: target,
    redirectType: [301, 302, 307, 410].includes(redirectType) ? redirectType : 301,
    isActive: payload.isActive !== false,
    matchType: payload.matchType || 'exact',
    priority: payload.priority ?? 0,
    notes: payload.notes ?? payload.note,
    createdBy: payload.createdBy,
  };
}

async function create(payload, userId) {
  const data = mapPayload({ ...payload, createdBy: userId });
  if (data.sourcePath === data.targetPath) throw new AppError('Source and target path cannot be the same', 400);
  if (data.matchType === 'regex' && !isSafeRedirectRegex(data.sourcePath)) {
    throw new AppError('Invalid or unsafe regex pattern for source path', 400);
  }

  if (data.matchType === 'exact') {
    const existing = await seoRedirectRepo.findBySourceExact(data.sourcePath, false);
    if (existing) throw new AppError('A redirect for this source path already exists', 409);
  }

  const loop = await checkRedirectLoop(data.sourcePath, data.targetPath, null);
  if (loop) throw new AppError('Redirect would create a loop', 400);

  return seoRedirectRepo.create(data);
}

async function checkRedirectLoop(sourcePath, targetPath, excludeId) {
  const targets = await seoRedirectRepo.findAllTargetPaths();
  const targetSet = new Set(targets);
  if (!targetSet.has(targetPath)) return false;
  let current = targetPath;
  const visited = new Set();
  const maxSteps = 50;
  let steps = 0;
  while (current && steps < maxSteps) {
    if (visited.has(current)) return true;
    visited.add(current);
    if (current === sourcePath) return true;
    const redir = await seoRedirectRepo.findBySourceExact(current, true);
    if (!redir) break;
    if (excludeId && redir._id.toString() === excludeId) break;
    current = redir.targetPath;
    steps++;
  }
  return false;
}

async function getById(id) {
  const r = await seoRedirectRepo.findById(id);
  if (!r) throw new AppError('Redirect not found', 404);
  return r;
}

async function list(query) {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { sourcePath: { $regex: query.search, $options: 'i' } },
      { targetPath: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  return seoRedirectRepo.findPaginated(filter, {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
  });
}

async function update(id, payload, userId) {
  const existing = await seoRedirectRepo.findById(id);
  if (!existing) throw new AppError('Redirect not found', 404);

  const data = mapPayload(payload);
  data.createdBy = userId;
  if (data.sourcePath === data.targetPath) throw new AppError('Source and target path cannot be the same', 400);
  if (data.matchType === 'regex' && !isSafeRedirectRegex(data.sourcePath)) {
    throw new AppError('Invalid or unsafe regex pattern for source path', 400);
  }

  const loop = await checkRedirectLoop(data.sourcePath, data.targetPath, id);
  if (loop) throw new AppError('Redirect would create a loop', 400);

  return seoRedirectRepo.updateById(id, data);
}

async function toggle(id, userId) {
  const r = await seoRedirectRepo.findById(id);
  if (!r) throw new AppError('Redirect not found', 404);
  return seoRedirectRepo.updateById(id, { isActive: !r.isActive });
}

async function remove(id) {
  const r = await seoRedirectRepo.findById(id);
  if (!r) throw new AppError('Redirect not found', 404);
  await seoRedirectRepo.deleteById(id);
  return { deleted: true };
}

async function validate(payload) {
  const data = mapPayload(payload);
  const errors = [];
  if (data.sourcePath === data.targetPath) errors.push({ field: 'targetPath', message: 'Source and target cannot be the same' });
  if (data.matchType === 'regex' && !isSafeRedirectRegex(data.sourcePath)) {
    errors.push({ field: 'sourcePath', message: 'Invalid or unsafe regex' });
  }
  const loop = await checkRedirectLoop(data.sourcePath, data.targetPath, null);
  if (loop) errors.push({ message: 'Redirect would create a loop' });
  if (data.matchType === 'exact') {
    const existing = await seoRedirectRepo.findBySourceExact(data.sourcePath, false);
    if (existing) errors.push({ field: 'sourcePath', message: 'A redirect for this path already exists' });
  }
  return { valid: errors.length === 0, errors };
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
  toggle,
  remove,
  validate,
  bulkImport,
  checkRedirectLoop,
};
