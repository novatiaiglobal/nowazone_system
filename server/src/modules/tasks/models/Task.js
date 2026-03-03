const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done', 'blocked'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  dueDate: Date,
  reminderAt: Date,
  reminderSentAt: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{ type: String }],
  isArchived: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ reminderAt: 1, reminderSentAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
