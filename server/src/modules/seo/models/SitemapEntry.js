const mongoose = require('mongoose');

const CHANGEFREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

const sitemapEntrySchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    pageType: { type: String, trim: true, default: 'static' },
    locale: { type: String, trim: true, default: 'en' },
    changefreq: { type: String, enum: CHANGEFREQ, default: 'weekly' },
    priority: { type: Number, min: 0, max: 1, default: 0.8 },
    lastmod: { type: Date },
    included: { type: Boolean, default: true },
    sourceModel: { type: String, trim: true },
    sourceId: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

sitemapEntrySchema.index({ url: 1 }, { unique: true });
sitemapEntrySchema.index({ included: 1 });
sitemapEntrySchema.index({ locale: 1 });

module.exports = mongoose.model('SitemapEntry', sitemapEntrySchema);
module.exports.CHANGEFREQ = CHANGEFREQ;
