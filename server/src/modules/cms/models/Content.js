const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  excerpt: String,
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['blog', 'page', 'news', 'documentation'],
    default: 'blog',
  },
  tags: [String],
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    keywords: [String],
  },
  featuredImage: String,
  publishedAt: Date,
  viewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

contentSchema.index({ status: 1, publishedAt: -1 });
contentSchema.index({ author: 1 });

contentSchema.pre('save', function() {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
});

module.exports = mongoose.model('Content', contentSchema);
