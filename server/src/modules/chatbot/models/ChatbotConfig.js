const mongoose = require('mongoose');

const chatbotConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Assistant' },
    isActive: { type: Boolean, default: true },
    greetingMessage: {
      type: String,
      default: 'Hi! How can I help you today?',
    },
    fallbackMessage: {
      type: String,
      default: "I'm not fully sure about that. I've created a ticket so a human can follow up.",
    },
    escalationEnabled: { type: Boolean, default: true },
    escalationTicketCategory: {
      type: String,
      enum: ['technical', 'billing', 'general', 'feature_request', 'bug'],
      default: 'general',
    },
    escalationPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    minConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.3,
    },
    temperature: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    tone: {
      type: String,
      enum: ['neutral', 'friendly', 'formal'],
      default: 'friendly',
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatbotConfig', chatbotConfigSchema);

