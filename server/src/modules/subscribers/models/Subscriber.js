const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, trim: true },
  status: { type: String, enum: ['active', 'unsubscribed', 'bounced'], default: 'active' },
  source: { type: String, enum: ['website', 'import', 'manual', 'api'], default: 'website' },
  tags: [{ type: String }],
  country: { type: String },
  ipAddress: { type: String },
  unsubscribedAt: { type: Date },
  confirmedAt: { type: Date },
}, { timestamps: true });

subscriberSchema.index({ status: 1 });

module.exports = mongoose.model('Subscriber', subscriberSchema);
