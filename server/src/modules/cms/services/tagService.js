const Tag = require('../models/Tag');

class TagService {
  async createTag(data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const tag = new Tag({
      ...data,
      slug,
    });
    
    await tag.save();
    return tag;
  }

  async updateTag(tagId, data) {
    const tag = await Tag.findByIdAndUpdate(
      tagId,
      data,
      { new: true, runValidators: true }
    );
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    return tag;
  }

  async getTag(tagId) {
    const tag = await Tag.findById(tagId);
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    return tag;
  }

  async listTags(filters = {}) {
    const { search } = filters;
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const tags = await Tag.find(query).sort('name');
    
    return tags;
  }

  async deleteTag(tagId) {
    const tag = await Tag.findByIdAndDelete(tagId);
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    return { message: 'Tag deleted successfully' };
  }

  async bulkCreateTags(tagNames) {
    const tags = await Promise.all(
      tagNames.map(async (name) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Check if tag already exists
        let tag = await Tag.findOne({ slug });
        
        if (!tag) {
          tag = await Tag.create({ name, slug });
        }
        
        return tag;
      })
    );
    
    return tags;
  }
}

module.exports = new TagService();
