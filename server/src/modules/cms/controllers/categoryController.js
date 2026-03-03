const categoryService = require('../services/categoryService');

class CategoryController {
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      
      res.status(201).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      
      res.status(200).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategory(req, res, next) {
    try {
      const category = await categoryService.getCategory(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCategories(req, res, next) {
    try {
      const filters = {
        parent: req.query.parent,
        search: req.query.search,
      };
      
      const categories = await categoryService.listCategories(filters);
      
      res.status(200).json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryTree(req, res, next) {
    try {
      const tree = await categoryService.getCategoryTree();
      
      res.status(200).json({
        status: 'success',
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const result = await categoryService.deleteCategory(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async reorderCategories(req, res, next) {
    try {
      const result = await categoryService.reorderCategories(req.body.categoryOrders);
      
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
