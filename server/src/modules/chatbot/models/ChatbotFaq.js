const mongoose = require('mongoose');

const chatbotFaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    // keep tags as an array of strings for matching in code,
    // but do NOT include it in the MongoDB text index to avoid
    // "Field 'tags' of text index contains an array" errors
    tags: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    lastTrainedAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Text index only on scalar string fields; tags are handled in app logic
chatbotFaqSchema.index({ question: 'text', answer: 'text', category: 'text' });

module.exports = mongoose.model('ChatbotFaq', chatbotFaqSchema);

