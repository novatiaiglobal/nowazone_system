const postService = require('../services/postService');

class PostController {
  async createPost(req, res, next) {
    try {
      const post = await postService.createPost(req.body, req.user.id);
      
      res.status(201).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req, res, next) {
    try {
      const post = await postService.updatePost(req.params.id, req.body, req.user.id);
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPost(req, res, next) {
    try {
      const post = await postService.getPost(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostBySlug(req, res, next) {
    try {
      const post = await postService.getPostBySlug(req.params.slug);
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async listPosts(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        author: req.query.author,
        category: req.query.category,
        tag: req.query.tag,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };
      
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sort: req.query.sort || '-createdAt',
      };
      
      const result = await postService.listPosts(filters, options);
      
      res.status(200).json({
        status: 'success',
        data: result.posts,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async publishPost(req, res, next) {
    try {
      const post = await postService.publishPost(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async schedulePost(req, res, next) {
    try {
      const post = await postService.schedulePost(req.params.id, req.body.scheduledAt);
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      const result = await postService.deletePost(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVersionHistory(req, res, next) {
    try {
      const versions = await postService.getVersionHistory(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }

  async restoreVersion(req, res, next) {
    try {
      const post = await postService.restoreVersion(
        req.params.id,
        parseInt(req.params.versionIndex),
        req.user.id
      );
      
      res.status(200).json({
        status: 'success',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const analytics = await postService.getPostAnalytics(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateStatus(req, res, next) {
    try {
      const result = await postService.bulkUpdateStatus(req.body.postIds, req.body.status);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateFAQSchema(req, res, next) {
    try {
      const schema = await postService.generateFAQSchema(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: schema,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
