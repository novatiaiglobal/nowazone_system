const mongoose = require('mongoose');

const PAGE_TYPE = ['static', 'dynamic'];
const PAGE_STATUS = ['draft', 'review', 'approved', 'published', 'archived'];

const seoPageSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      enum: PAGE_TYPE,
      default: 'static',
    },
    routePath: {
      type: String,
      trim: true,
      lowercase: true,
    },
    pagePath: {
      type: String,
      trim: true,
      lowercase: true,
    },
    pageKey: { type: String, trim: true },
    pageName: { type: String, trim: true },
    locale: { type: String, trim: true, default: 'en' },
    region: { type: String, trim: true, default: '' },
    targetEntityType: { type: String, trim: true },
    targetEntityId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, trim: true, maxlength: [120, 'Title must be at most 120 characters'] },
    metaDescription: { type: String, trim: true, maxlength: [320, 'Meta description must be at most 320 characters'] },
    metaKeywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true },
    robotsDirectives: { type: String, trim: true, default: 'index, follow' },
    openGraph: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      image: { type: String, trim: true },
      type: { type: String, trim: true, default: 'website' },
    },
    twitter: {
      card: { type: String, trim: true },
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      image: { type: String, trim: true },
    },
    structuredData: { type: mongoose.Schema.Types.Mixed },
    focusKeyword: { type: String, trim: true },
    secondaryKeywords: [{ type: String, trim: true }],
    breadcrumbTitle: { type: String, trim: true },
    slugOverride: { type: String, trim: true },
    contentSummary: { type: String, trim: true },
    schemaType: { type: String, trim: true },
    customHeadTags: { type: String, trim: true },
    status: {
      type: String,
      enum: PAGE_STATUS,
      default: 'draft',
    },
    publishAt: { type: Date },
    lastPublishedAt: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

seoPageSchema.pre('save', function (next) {
  const r = this.routePath || this.pagePath || '';
  if (!this.routePath && this.pagePath) this.routePath = this.pagePath;
  if (!this.pagePath && this.routePath) this.pagePath = this.routePath;
  next();
});

// Backward compatibility: virtuals for legacy consumers (metaTitle, keywords, isPublished)
seoPageSchema.virtual('metaTitle').get(function () {
  return this.title || '';
});
seoPageSchema.virtual('keywords').get(function () {
  return this.metaKeywords || [];
});
seoPageSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});
seoPageSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    ret.pagePath = ret.routePath || ret.pagePath || '';
  },
});
seoPageSchema.set('toObject', { virtuals: true });
// Ensure at least one of routePath or pagePath
seoPageSchema.pre('validate', function (next) {
  if (!this.routePath && !this.pagePath) {
    next(new Error('routePath or pagePath is required'));
  } else {
    next();
  }
});

// Unique per route + locale + region for published only
seoPageSchema.index(
  { routePath: 1, locale: 1, region: 1 },
  { unique: true, partialFilterExpression: { status: 'published', deletedAt: null } }
);
seoPageSchema.index({ routePath: 1, locale: 1, region: 1, status: 1 });
seoPageSchema.index({ status: 1 });
seoPageSchema.index({ deletedAt: 1 });
seoPageSchema.index({ locale: 1, region: 1 });
seoPageSchema.index({ pageType: 1 });
seoPageSchema.index({ lastPublishedAt: -1 });
seoPageSchema.index({ title: 'text', routePath: 'text', focusKeyword: 'text' });

// Default list excludes soft-deleted
seoPageSchema.query.notDeleted = function () {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('SeoPage', seoPageSchema);
module.exports.PAGE_TYPE = PAGE_TYPE;
module.exports.PAGE_STATUS = PAGE_STATUS;
