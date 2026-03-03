const Content = require('../models/Content');
const { AppError } = require('../../../shared/middleware/errorHandler');

class ContentService {
  async getContents({ page, limit, status, category }) {
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const [contents, total] = await Promise.all([
      Content.find(query)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(query),
    ]);

    return {
      contents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createContent(data) {
    const content = await Content.create(data);
    return content.populate('author', 'name email');
  }

  async getContentById(id) {
    const content = await Content.findById(id).populate('author', 'name email');
    if (!content) {
      throw new AppError('Content not found', 404);
    }
    return content;
  }

  async updateContent(id, data) {
    const content = await Content.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('author', 'name email');

    if (!content) {
      throw new AppError('Content not found', 404);
    }

    return content;
  }

  async deleteContent(id) {
    const content = await Content.findByIdAndDelete(id);
    if (!content) {
      throw new AppError('Content not found', 404);
    }
  }
}

module.exports = new ContentService();
