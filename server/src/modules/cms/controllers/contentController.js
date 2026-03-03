const contentService = require('../services/contentService');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Comment = require('../models/Comment');

class ContentController {
  async getDashboard(req, res, next) {
    try {
      const [
        totalPosts,
        draftPosts,
        publishedPosts,
        totalPages,
        totalCategories,
        totalTags,
        pendingComments,
      ] = await Promise.all([
        Post.countDocuments(),
        Post.countDocuments({ status: 'draft' }),
        Post.countDocuments({ status: 'published' }),
        Page.countDocuments(),
        Category.countDocuments(),
        Tag.countDocuments(),
        Comment.countDocuments({ status: 'pending' }),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          totalPosts,
          draftPosts,
          publishedPosts,
          totalPages,
          totalCategories,
          totalTags,
          pendingComments,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getContents(req, res, next) {
    try {
      const { page = 1, limit = 10, status, category } = req.query;
      const contents = await contentService.getContents({ page, limit, status, category });
      
      res.status(200).json({
        status: 'success',
        data: contents,
      });
    } catch (error) {
      next(error);
    }
  }

  async createContent(req, res, next) {
    try {
      const content = await contentService.createContent({
        ...req.body,
        author: req.user._id,
      });
      
      res.status(201).json({
        status: 'success',
        message: 'Content created successfully',
        data: { content },
      });
    } catch (error) {
      next(error);
    }
  }

  async getContentById(req, res, next) {
    try {
      const content = await contentService.getContentById(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: { content },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateContent(req, res, next) {
    try {
      const content = await contentService.updateContent(req.params.id, req.body);
      
      res.status(200).json({
        status: 'success',
        message: 'Content updated successfully',
        data: { content },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteContent(req, res, next) {
    try {
      await contentService.deleteContent(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: 'Content deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContentController();
