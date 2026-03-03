const pageService = require('../services/pageService');

class PageController {
  async createPage(req, res, next) {
    try {
      const page = await pageService.createPage(req.body, req.user.id);
      res.status(201).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async updatePage(req, res, next) {
    try {
      const page = await pageService.updatePage(req.params.id, req.body, req.user.id);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async getPage(req, res, next) {
    try {
      const page = await pageService.getPage(req.params.id);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async getPageBySlug(req, res, next) {
    try {
      const page = await pageService.getPageBySlug(req.params.slug);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async listPages(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        author: req.query.author,
        template: req.query.template,
        search: req.query.search,
      };
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sort: req.query.sort || '-createdAt',
      };
      const result = await pageService.listPages(filters, options);
      res.status(200).json({ status: 'success', data: result.pages, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async addSection(req, res, next) {
    try {
      const page = await pageService.addSection(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async updateSection(req, res, next) {
    try {
      const page = await pageService.updateSection(req.params.id, parseInt(req.params.sectionIndex), req.body);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async deleteSection(req, res, next) {
    try {
      const page = await pageService.deleteSection(req.params.id, parseInt(req.params.sectionIndex));
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async reorderSections(req, res, next) {
    try {
      const page = await pageService.reorderSections(req.params.id, req.body.newOrder);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async publishPage(req, res, next) {
    try {
      const page = await pageService.publishPage(req.params.id);
      res.status(200).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }

  async deletePage(req, res, next) {
    try {
      const result = await pageService.deletePage(req.params.id);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async duplicatePage(req, res, next) {
    try {
      const page = await pageService.duplicatePage(req.params.id, req.user.id);
      res.status(201).json({ status: 'success', data: page });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PageController();
