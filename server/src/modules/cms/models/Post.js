const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    maxlength: 300,
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'published', 'scheduled', 'archived'],
    default: 'draft',
  },
  publishedAt: Date,
  scheduledAt: Date,
  
  // Author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coAuthors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    ogImage: String,
    ogTitle: String,
    ogDescription: String,
    keywords: [String],
    focusKeyword: String,
  },
  
  // Taxonomy
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  
  // Related Content
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  
  // Media
  featuredImage: {
    url: {
      type: String,
      required: [true, 'Featured image is required for every post'],
      trim: true,
    },
    alt: String,
    caption: String,
  },
  
  // Comments
  commentsEnabled: {
    type: Boolean,
    default: true,
  },
  commentsModeration: {
    type: Boolean,
    default: true,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  
  // Schema Markup
  schemaMarkup: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // FAQ Schema
  faqs: [{
    question: String,
    answer: String,
  }],
  
  // Version History
  versions: [{
    content: String,
    title: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: Date,
    changeNote: String,
  }],
  
  // Access Control
  visibility: {
    type: String,
    enum: ['public', 'private', 'password_protected'],
    default: 'public',
  },
  password: String,
  allowedRoles: [{
    type: String,
    enum: [
      'super_admin',
      'admin',
      'hr',
      'sales',
      'content_creator',
      'seo_manager',
      'support_executive',
      'finance_manager',
    ],
  }],
  
}, {
  timestamps: true,
});

// Indexes
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ categories: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'seo.keywords': 1 });

// Pre-save middleware to handle slug generation
postSchema.pre('save', async function() {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure unique slug
    const existingPost = await this.constructor.findOne({ slug: this.slug });
    if (existingPost) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  
  // Auto-publish if scheduled time has passed
  if (this.status === 'scheduled' && this.scheduledAt && this.scheduledAt <= new Date()) {
    this.status = 'published';
    this.publishedAt = new Date();
  }
});

// Method to create version snapshot
postSchema.methods.createVersion = function(userId, changeNote) {
  this.versions.push({
    content: this.content,
    title: this.title,
    updatedBy: userId,
    updatedAt: new Date(),
    changeNote: changeNote || 'Content updated',
  });
};

module.exports = mongoose.model('Post', postSchema);
