const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['hero', 'timeline', 'feature_grid', 'cta', 'faq', 'pricing_table', 'comparison_table', 'testimonials', 'custom'],
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  settings: {
    backgroundColor: String,
    padding: String,
    margin: String,
    customClass: String,
  },
});

const pageSchema = new mongoose.Schema({
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
  template: {
    type: String,
    enum: ['blank', 'landing', 'about', 'services', 'contact', 'custom'],
    default: 'blank',
  },
  
  // Sections
  sections: [sectionSchema],
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    ogImage: String,
    ogTitle: String,
    ogDescription: String,
    keywords: [String],
  },
  
  // Schema Markup
  schemaMarkup: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  publishedAt: Date,
  
  // Author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Access Control
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  allowedRoles: [{
    type: String,
  }],
  
  // Analytics
  views: {
    type: Number,
    default: 0,
  },
  
  // Version History
  versions: [{
    sections: [sectionSchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedAt: Date,
    changeNote: String,
  }],
  
}, {
  timestamps: true,
});

// Indexes
pageSchema.index({ status: 1 });
pageSchema.index({ author: 1 });

// Pre-save middleware — generate slug from title if not provided
pageSchema.pre('validate', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

pageSchema.pre('save', async function() {
  if (this.isNew || this.isModified('slug')) {
    const existingPage = await this.constructor.findOne({ slug: this.slug, _id: { $ne: this._id } });
    if (existingPage) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
});

// Method to create version snapshot
pageSchema.methods.createVersion = function(userId, changeNote) {
  this.versions.push({
    sections: this.sections,
    updatedBy: userId,
    updatedAt: new Date(),
    changeNote: changeNote || 'Page updated',
  });
};

module.exports = mongoose.model('Page', pageSchema);
