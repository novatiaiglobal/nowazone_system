const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },
  publicId: { type: String },
  resourceType: { type: String, enum: ['raw', 'image'], default: 'raw' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Employee email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    department: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    employeeId: { type: String, trim: true, unique: true, sparse: true },
    startDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave'],
      default: 'active',
    },
    profileImage: {
      url:      { type: String },
      publicId: { type: String },
    },
    documents: [documentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

employeeSchema.index({ name: 'text', email: 'text', department: 'text', jobTitle: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
