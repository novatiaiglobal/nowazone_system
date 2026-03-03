const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Refresh token is never stored in plaintext. Only the SHA-256 hash is kept.
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  // All rotated tokens for the same login event share one family ID.
  // If a consumed token is ever re-used, the entire family is revoked.
  family: {
    type: String,
    required: true,
    index: true,
  },
  // True once this token has been used to issue a new token (rotation).
  isConsumed: {
    type: Boolean,
    default: false,
  },
  ipAddress: String,
  userAgent: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  rememberMe: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

sessionSchema.index({ user: 1, isActive: 1 });
// family already has index: true on the field definition above
// MongoDB TTL index - documents are removed after expiresAt
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
