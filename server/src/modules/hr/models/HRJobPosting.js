const mongoose = require('mongoose');

const hrJobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    department:      { type: String, trim: true },
    location:        { type: String, trim: true },
    type: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid'],
      default: 'onsite',
    },
    experienceLevel: { type: String, trim: true },
    description:     { type: String },
    status: {
      type: String,
      enum: ['active', 'draft', 'closed'],
      default: 'draft',
    },
    publishedPlatforms: {
      linkedin: { type: Boolean, default: false },
      indeed:   { type: Boolean, default: false },
      naukri:   { type: Boolean, default: false },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: count of applications for this job
hrJobSchema.virtual('applicantCount', {
  ref:          'Resume',
  localField:   '_id',
  foreignField: 'jobId',
  count:        true,
});

hrJobSchema.index({ title: 'text', department: 'text', description: 'text' });
hrJobSchema.index({ status: 1 });

module.exports = mongoose.model('HRJobPosting', hrJobSchema);
