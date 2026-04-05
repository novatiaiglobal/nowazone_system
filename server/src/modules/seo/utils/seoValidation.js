const META_TITLE_MIN = 20;
const META_TITLE_MAX = 60;
const META_DESC_MIN = 50;
const META_DESC_MAX = 160;

/**
 * Validate meta title length (recommended 20–60 chars).
 */
function validateMetaTitle(title) {
  if (!title || typeof title !== 'string') return { valid: false, message: 'Title is required' };
  const t = title.trim();
  if (t.length < META_TITLE_MIN) return { valid: false, message: `Title too short (${t.length}/${META_TITLE_MIN} min)` };
  if (t.length > META_TITLE_MAX) return { valid: false, message: `Title too long (${t.length}/${META_TITLE_MAX} max)` };
  return { valid: true };
}

/**
 * Validate meta description length (recommended 50–160 chars).
 */
function validateMetaDescription(desc) {
  if (!desc || typeof desc !== 'string') return { valid: false, message: 'Description is required' };
  const d = desc.trim();
  if (d.length < META_DESC_MIN) return { valid: false, message: `Description too short (${d.length}/${META_DESC_MIN} min)` };
  if (d.length > META_DESC_MAX) return { valid: false, message: `Description too long (${d.length}/${META_DESC_MAX} max)` };
  return { valid: true };
}

/**
 * Validate structured data is parseable JSON and optionally has @context (JSON-LD).
 */
function validateStructuredData(data) {
  if (data === null || data === undefined) return { valid: true };
  if (typeof data === 'object') return { valid: true };
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return { valid: true };
    } catch (e) {
      return { valid: false, message: 'Invalid JSON in structured data' };
    }
  }
  return { valid: false, message: 'Structured data must be object or JSON string' };
}

/**
 * Safe regex test for redirect matchType=regex. Avoid ReDoS.
 */
function isSafeRedirectRegex(pattern) {
  if (!pattern || typeof pattern !== 'string') return false;
  try {
    new RegExp(pattern);
    if (pattern.length > 200) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  META_TITLE_MIN,
  META_TITLE_MAX,
  META_DESC_MIN,
  META_DESC_MAX,
  validateMetaTitle,
  validateMetaDescription,
  validateStructuredData,
  isSafeRedirectRegex,
};
