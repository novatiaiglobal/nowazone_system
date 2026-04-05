const path = require('path');

/**
 * Enforces maxFileSize and allowedFileTypes from Settings.system
 * using req.settings (populated by attachSettings middleware).
 *
 * This runs before multer; it uses Content-Length as an upper bound.
 */
function uploadGuard(req, res, next) {
  const settings = req.settings;
  const system = settings?.system || {};

  // Max file size (MB) -> bytes
  if (system.maxFileSize && Number.isFinite(system.maxFileSize)) {
    const limitBytes = system.maxFileSize * 1024 * 1024;
    const contentLength = req.headers['content-length']
      ? parseInt(req.headers['content-length'], 10)
      : null;
    if (contentLength && contentLength > limitBytes) {
      return res.status(413).json({
        status: 'fail',
        message: `File is too large. Max allowed size is ${system.maxFileSize} MB.`,
      });
    }
  }

  // Allowed file types (extensions)
  if (Array.isArray(system.allowedFileTypes) && system.allowedFileTypes.length > 0) {
    // Best-effort: try to read filename from query or headers
    const filename =
      req.query.filename ||
      req.headers['x-file-name'] ||
      req.headers['x-filename'] ||
      '';
    if (typeof filename === 'string' && filename) {
      const ext = path.extname(filename).replace('.', '').toLowerCase();
      if (ext && !system.allowedFileTypes.map(String).map((s) => s.toLowerCase()).includes(ext)) {
        return res.status(400).json({
          status: 'fail',
          message: `File type .${ext} is not allowed. Allowed: ${system.allowedFileTypes.join(', ')}`,
        });
      }
    }
  }

  next();
}

module.exports = { uploadGuard };

