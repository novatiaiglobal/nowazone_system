const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['contact', 'assessment', 'appointment', 'subscribe', 'download', 'support'],
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },
  company: { type: String },
  message: { type: String },
  formData: { type: mongoose.Schema.Types.Mixed },
  source: { type: String, default: 'website' },
  page: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: {
    type: String,
    enum: ['new', 'read', 'responded', 'archived'],
    default: 'new',
  },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: { type: Date },
}, { timestamps: true });

formSubmissionSchema.index({ createdAt: -1 });
formSubmissionSchema.index({ type: 1, status: 1 });
formSubmissionSchema.index({ email: 1 });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
