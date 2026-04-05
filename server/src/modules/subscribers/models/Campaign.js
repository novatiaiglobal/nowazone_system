const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', required: true },
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'bounced'],
      default: 'queued',
    },
    openedAt: { type: Date },
    clickedAt: { type: Date },
  },
  { _id: true }
);

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    html: { type: String, required: true },
    text: { type: String },
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent'],
      default: 'draft',
    },
    filters: {
      statuses: [{ type: String, enum: ['active', 'unsubscribed', 'bounced'] }],
      tags: [{ type: String }],
      countries: [{ type: String }],
    },
    recipients: [recipientSchema],
    stats: {
      totalRecipients: { type: Number, default: 0 },
      openCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

campaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);

