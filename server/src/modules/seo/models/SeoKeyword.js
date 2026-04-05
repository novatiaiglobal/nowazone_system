const mongoose = require('mongoose');

const KEYWORD_INTENT = ['informational', 'navigational', 'transactional', 'commercial'];
const KEYWORD_STATUS = ['new', 'tracking', 'ranked', 'lost', 'paused'];

const seoKeywordSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: [true, 'Keyword is required'], trim: true },
    normalizedKeyword: { type: String, trim: true },
    intent: { type: String, enum: KEYWORD_INTENT },
    cluster: { type: String, trim: true },
    priority: { type: Number, default: 0 },
    targetUrl: { type: String, trim: true },
    targetRegion: { type: String, trim: true },
    targetLocale: { type: String, trim: true },
    targetService: { type: String, trim: true },
    targetIndustry: { type: String, trim: true },
    searchVolume: { type: Number, default: null },
    difficulty: { type: Number, min: 0, max: 100, default: null },
    currentRank: { type: Number, default: null },
    impressions: { type: Number, default: null },
    clicks: { type: Number, default: null },
    ctr: { type: Number, default: null }, // percentage
    avgPosition: { type: Number, default: null },
    notes: { type: String, trim: true },
    status: { type: String, enum: KEYWORD_STATUS, default: 'new' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

function normalizeKeyword(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

seoKeywordSchema.pre('save', function (next) {
  if (this.isModified('keyword')) {
    this.normalizedKeyword = normalizeKeyword(this.keyword);
  }
  next();
});

seoKeywordSchema.index({ normalizedKeyword: 1 });
seoKeywordSchema.index({ status: 1 });
seoKeywordSchema.index({ cluster: 1 });
seoKeywordSchema.index({ keyword: 'text', normalizedKeyword: 'text' });

module.exports = mongoose.model('SeoKeyword', seoKeywordSchema);
module.exports.KEYWORD_INTENT = KEYWORD_INTENT;
module.exports.KEYWORD_STATUS = KEYWORD_STATUS;
module.exports.normalizeKeyword = normalizeKeyword;
