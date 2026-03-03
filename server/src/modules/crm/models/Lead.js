const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number'],
  },
  company: String,
  source: {
    type: String,
    enum: ['website', 'referral', 'social', 'email', 'other'],
    default: 'website',
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'],
    default: 'new',
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  followUpAt: {
    type: Date,
    default: null,
  },
  followUpNote: {
    type: String,
    default: '',
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ score: -1 });
leadSchema.index({ followUpAt: 1 });

leadSchema.pre('save', function() {
  if (this.isNew) {
    this.score = this.calculateLeadScore();
  }
});

leadSchema.methods.calculateLeadScore = function() {
  let score = 50;
  
  if (this.company) score += 10;
  if (this.phone) score += 10;
  if (this.source === 'referral') score += 20;
  if (this.source === 'website') score += 10;
  
  return Math.min(score, 100);
};

module.exports = mongoose.model('Lead', leadSchema);
