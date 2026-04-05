/**
 * Normalize route path for consistency: lowercase, single slashes, no trailing slash (except for root).
 */
function normalizeRoutePath(path) {
  if (!path || typeof path !== 'string') return '/';
  let p = path.trim().toLowerCase().replace(/\/+/g, '/');
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  if (!p.startsWith('/')) p = '/' + p;
  return p || '/';
}

/**
 * Normalize canonical URL: trim, ensure valid format (no strict host check here).
 */
function normalizeCanonicalUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim();
}

module.exports = { normalizeRoutePath, normalizeCanonicalUrl };
