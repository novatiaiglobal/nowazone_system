const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    applicantName: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HRJobPosting',
      default: null,
    },
    fileUrl:      { type: String },
    filePublicId: { type: String },
    skills:    { type: [String], default: [] },
    experience: { type: String },
    education:  { type: String },
    parsedData: { type: mongoose.Schema.Types.Mixed, default: {} },
    applicationStatus: {
      type: String,
      enum: ['new', 'interview', 'selected', 'rejected'],
      default: 'new',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

resumeSchema.index({ applicantName: 'text', email: 'text', skills: 'text' });
resumeSchema.index({ applicationStatus: 1 });
resumeSchema.index({ jobId: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
