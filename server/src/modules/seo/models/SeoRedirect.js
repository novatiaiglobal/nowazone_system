const mongoose = require('mongoose');

const REDIRECT_TYPE = [301, 302, 307, 410];
const MATCH_TYPE = ['exact', 'prefix', 'regex'];

const seoRedirectSchema = new mongoose.Schema(
  {
    sourcePath: {
      type: String,
      required: [true, 'Source path is required'],
      trim: true,
    },
    targetPath: {
      type: String,
      required: [true, 'Target path is required'],
      trim: true,
    },
    redirectType: { type: Number, enum: REDIRECT_TYPE, default: 301 },
    isActive: { type: Boolean, default: true },
    matchType: { type: String, enum: MATCH_TYPE, default: 'exact' },
    priority: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    hitCount: { type: Number, default: 0 },
    lastHitAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// For exact match, sourcePath must be unique among active redirects
seoRedirectSchema.index({ sourcePath: 1, isActive: 1 });
seoRedirectSchema.index({ isActive: 1 });
seoRedirectSchema.index({ priority: -1 });

// Backward compatibility
seoRedirectSchema.virtual('fromPath').get(function () {
  return this.sourcePath || '';
});
seoRedirectSchema.virtual('toPath').get(function () {
  return this.targetPath || '';
});
seoRedirectSchema.virtual('type').get(function () {
  return this.redirectType;
});
seoRedirectSchema.virtual('note').get(function () {
  return this.notes || '';
});
seoRedirectSchema.set('toJSON', { virtuals: true });
seoRedirectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SeoRedirect', seoRedirectSchema);
module.exports.REDIRECT_TYPE = REDIRECT_TYPE;
module.exports.MATCH_TYPE = MATCH_TYPE;
