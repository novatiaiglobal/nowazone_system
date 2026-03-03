const tagService = require('../services/tagService');

class TagController {
  async createTag(req, res, next) {
    try {
      const tag = await tagService.createTag(req.body);
      
      res.status(201).json({
        status: 'success',
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTag(req, res, next) {
    try {
      const tag = await tagService.updateTag(req.params.id, req.body);
      
      res.status(200).json({
        status: 'success',
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTag(req, res, next) {
    try {
      const tag = await tagService.getTag(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: tag,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTags(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
      };
      
      const tags = await tagService.listTags(filters);
      
      res.status(200).json({
        status: 'success',
        data: tags,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req, res, next) {
    try {
      const result = await tagService.deleteTag(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateTags(req, res, next) {
    try {
      const tags = await tagService.bulkCreateTags(req.body.tagNames);
      
      res.status(201).json({
        status: 'success',
        data: tags,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TagController();
