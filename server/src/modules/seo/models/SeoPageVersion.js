const mongoose = require('mongoose');

const seoPageVersionSchema = new mongoose.Schema(
  {
    seoPageId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeoPage', required: true },
    versionNumber: { type: Number, required: true },
    snapshot: {
      title: String,
      metaDescription: String,
      metaKeywords: [String],
      canonicalUrl: String,
      robotsDirectives: String,
      openGraph: mongoose.Schema.Types.Mixed,
      twitter: mongoose.Schema.Types.Mixed,
      structuredData: mongoose.Schema.Types.Mixed,
      focusKeyword: String,
      routePath: String,
      locale: String,
      region: String,
    },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['draft', 'review', 'approved', 'published'], default: 'published' },
  },
  { timestamps: true }
);

seoPageVersionSchema.index({ seoPageId: 1, versionNumber: -1 });
seoPageVersionSchema.index({ seoPageId: 1 });

module.exports = mongoose.model('SeoPageVersion', seoPageVersionSchema);
