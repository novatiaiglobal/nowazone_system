const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicantName: { type: String, required: true, trim: true },
  applicantEmail: { type: String, required: true, lowercase: true },
  applicantPhone: { type: String },
  resumeUrl: { type: String },
  coverLetter: { type: String },
  skills: [{ type: String }],
  experience: { type: String },
  currentCompany: { type: String },
  expectedSalary: { type: Number },
  status: {
    type: String,
    enum: ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    default: 'new',
  },
  notes: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  interviewDate: { type: Date },
  source: { type: String, enum: ['direct', 'linkedin', 'indeed', 'naukri', 'referral', 'other'], default: 'direct' },
  ipAddress: { type: String },
}, { timestamps: true });

applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ applicantEmail: 1 });

module.exports = mongoose.model('Application', applicationSchema);
