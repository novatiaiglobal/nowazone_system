const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  type: { type: String, enum: ['full_time', 'part_time', 'contract', 'remote', 'hybrid', 'onsite'], default: 'full_time' },
  experience: { type: String, enum: ['entry', 'mid', 'senior', 'lead', 'executive'], default: 'mid' },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  skills: [{ type: String }],
  salaryMin: { type: Number },
  salaryMax: { type: Number },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['draft', 'active', 'paused', 'closed'], default: 'active' },
  positions: { type: Number, default: 1, min: 1 },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicationDeadline: { type: Date },
  applicationCount: { type: Number, default: 0 },
}, { timestamps: true });

jobSchema.index({ status: 1, department: 1 });
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
