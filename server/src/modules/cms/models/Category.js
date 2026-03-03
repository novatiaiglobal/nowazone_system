const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: String,
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  image: String,
  seo: {
    metaTitle: String,
    metaDescription: String,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

categorySchema.index({ parent: 1 });

module.exports = mongoose.model('Category', categorySchema);
