const Comment = require('../models/Comment');
const Post = require('../models/Post');

class CommentService {
  async createComment(data, userId, ipAddress, userAgent) {
    const comment = new Comment({
      ...data,
      author: userId,
      ipAddress,
      userAgent,
      status: 'pending', // Always start as pending for moderation
    });
    
    await comment.save();
    
    // Update post comment count
    await Post.findByIdAndUpdate(data.post, {
      $inc: { commentsCount: 1 },
    });
    
    return comment.populate('author', 'name email');
  }

  async updateComment(commentId, data) {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      data,
      { new: true, runValidators: true }
    ).populate('author', 'name email');
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    return comment;
  }

  async getComment(commentId) {
    const comment = await Comment.findById(commentId)
      .populate('author', 'name email')
      .populate('parent');
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    return comment;
  }

  async listComments(filters = {}, options = {}) {
    const { post, status, author, parent } = filters;
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    
    const query = {};
    
    if (post) query.post = post;
    if (status) query.status = status;
    if (author) query.author = author;
    if (parent !== undefined) {
      query.parent = parent === 'null' ? null : parent;
    }
    
    const skip = (page - 1) * limit;
    
    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('author', 'name email')
        .populate('post', 'title slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(query),
    ]);
    
    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async approveComment(commentId) {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { status: 'approved' },
      { new: true }
    );
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    return comment;
  }

  async markAsSpam(commentId) {
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { status: 'spam' },
      { new: true }
    );
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Decrement post comment count
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 },
    });
    
    return comment;
  }

  async deleteComment(commentId) {
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Delete all child comments
    await Comment.deleteMany({ parent: commentId });
    
    // Delete the comment
    await comment.deleteOne();
    
    // Update post comment count
    const childCount = await Comment.countDocuments({ parent: commentId });
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -(childCount + 1) },
    });
    
    return { message: 'Comment deleted successfully' };
  }

  async bulkApprove(commentIds) {
    const result = await Comment.updateMany(
      { _id: { $in: commentIds } },
      { $set: { status: 'approved' } }
    );
    
    return result;
  }

  async bulkDelete(commentIds) {
    // Get all comments to update post counts
    const comments = await Comment.find({ _id: { $in: commentIds } });
    
    // Group by post
    const postCounts = {};
    comments.forEach(comment => {
      postCounts[comment.post] = (postCounts[comment.post] || 0) + 1;
    });
    
    // Delete comments
    await Comment.deleteMany({ _id: { $in: commentIds } });
    
    // Update post counts
    await Promise.all(
      Object.entries(postCounts).map(([postId, count]) =>
        Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -count } })
      )
    );
    
    return { message: `${commentIds.length} comments deleted successfully` };
  }

  async getCommentThread(postId) {
    const comments = await Comment.find({ post: postId, status: 'approved' })
      .populate('author', 'name email')
      .sort('createdAt');
    
    // Build comment tree
    const commentMap = {};
    const thread = [];
    
    comments.forEach(comment => {
      commentMap[comment._id] = { ...comment.toObject(), replies: [] };
    });
    
    comments.forEach(comment => {
      if (comment.parent) {
        if (commentMap[comment.parent]) {
          commentMap[comment.parent].replies.push(commentMap[comment._id]);
        }
      } else {
        thread.push(commentMap[comment._id]);
      }
    });
    
    return thread;
  }
}

module.exports = new CommentService();
