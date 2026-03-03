const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  authorName: String,
  authorEmail: String,
  content: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'spam', 'trash'],
    default: 'pending',
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  },
  likes: {
    type: Number,
    default: 0,
  },
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

commentSchema.index({ post: 1, status: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parent: 1 });

module.exports = mongoose.model('Comment', commentSchema);
