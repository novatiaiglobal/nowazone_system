const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  content: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  attachments: [{ url: String, name: String }],
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'pending', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  category: { type: String, enum: ['technical', 'billing', 'general', 'feature_request', 'bug'], default: 'general' },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true, lowercase: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [messageSchema],
  tags: [{ type: String }],
  resolvedAt: { type: Date },
  firstResponseAt: { type: Date },
  slaDeadline: { type: Date },
  satisfactionRating: { type: Number, min: 1, max: 5 },
}, { timestamps: true });

ticketSchema.pre('save', async function () {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;
  }

  // Auto-set SLA based on priority
  if (this.isNew && !this.slaDeadline) {
    const hours = { low: 72, medium: 24, high: 8, critical: 2 };
    this.slaDeadline = new Date(Date.now() + (hours[this.priority] || 24) * 3600000);
  }
});

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ requesterEmail: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
