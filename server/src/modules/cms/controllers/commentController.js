const commentService = require('../services/commentService');

class CommentController {
  async createComment(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      
      const comment = await commentService.createComment(
        req.body,
        req.user?.id,
        ipAddress,
        userAgent
      );
      
      res.status(201).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateComment(req, res, next) {
    try {
      const comment = await commentService.updateComment(req.params.id, req.body);
      
      res.status(200).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComment(req, res, next) {
    try {
      const comment = await commentService.getComment(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async listComments(req, res, next) {
    try {
      const filters = {
        post: req.query.post,
        status: req.query.status,
        author: req.query.author,
        parent: req.query.parent,
      };
      
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || '-createdAt',
      };
      
      const result = await commentService.listComments(filters, options);
      
      res.status(200).json({
        status: 'success',
        data: result.comments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveComment(req, res, next) {
    try {
      const comment = await commentService.approveComment(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsSpam(req, res, next) {
    try {
      const comment = await commentService.markAsSpam(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const result = await commentService.deleteComment(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkApprove(req, res, next) {
    try {
      const result = await commentService.bulkApprove(req.body.commentIds);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(req, res, next) {
    try {
      const result = await commentService.bulkDelete(req.body.commentIds);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCommentThread(req, res, next) {
    try {
      const thread = await commentService.getCommentThread(req.params.postId);
      
      res.status(200).json({
        status: 'success',
        data: thread,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentController();
