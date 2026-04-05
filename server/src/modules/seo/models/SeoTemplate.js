const mongoose = require('mongoose');

const seoTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    entityType: { type: String, trim: true, required: true },
    titleTemplate: { type: String, trim: true },
    descriptionTemplate: { type: String, trim: true },
    canonicalTemplate: { type: String, trim: true },
    ogTemplate: { type: mongoose.Schema.Types.Mixed },
    defaultSchemaTemplate: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

seoTemplateSchema.index({ entityType: 1, isActive: 1 });

module.exports = mongoose.model('SeoTemplate', seoTemplateSchema);
