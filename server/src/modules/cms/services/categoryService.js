const Category = require('../models/Category');

class CategoryService {
  async createCategory(data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const category = new Category({
      ...data,
      slug,
    });
    
    await category.save();
    return category;
  }

  async updateCategory(categoryId, data) {
    const category = await Category.findByIdAndUpdate(
      categoryId,
      data,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return category;
  }

  async getCategory(categoryId) {
    const category = await Category.findById(categoryId)
      .populate('parent', 'name slug');
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return category;
  }

  async listCategories(filters = {}) {
    const { parent, search } = filters;
    const query = {};
    
    if (parent !== undefined) {
      query.parent = parent === 'null' ? null : parent;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort('order name');
    
    return categories;
  }

  async getCategoryTree() {
    const categories = await Category.find().sort('order name');
    
    // Build tree structure
    const categoryMap = {};
    const tree = [];
    
    categories.forEach(cat => {
      categoryMap[cat._id] = { ...cat.toObject(), children: [] };
    });
    
    categories.forEach(cat => {
      if (cat.parent) {
        if (categoryMap[cat.parent]) {
          categoryMap[cat.parent].children.push(categoryMap[cat._id]);
        }
      } else {
        tree.push(categoryMap[cat._id]);
      }
    });
    
    return tree;
  }

  async deleteCategory(categoryId) {
    // Check if category has children
    const hasChildren = await Category.exists({ parent: categoryId });
    
    if (hasChildren) {
      throw new Error('Cannot delete category with subcategories');
    }
    
    const category = await Category.findByIdAndDelete(categoryId);
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return { message: 'Category deleted successfully' };
  }

  async reorderCategories(categoryOrders) {
    const bulkOps = categoryOrders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));
    
    await Category.bulkWrite(bulkOps);
    
    return { message: 'Categories reordered successfully' };
  }
}

module.exports = new CategoryService();
