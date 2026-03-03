const Page = require('../models/Page');

class PageService {
  async createPage(data, userId) {
    const page = new Page({
      ...data,
      author: userId,
      sections: data.sections || [],
    });
    
    await page.save();
    return page.populate('author', 'name email');
  }

  async updatePage(pageId, data, userId) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Create version snapshot before updating
    if (data.createVersion !== false) {
      page.createVersion(userId, data.changeNote);
    }
    
    Object.assign(page, data);
    await page.save();
    
    return page.populate('author', 'name email');
  }

  async getPage(pageId) {
    const page = await Page.findById(pageId)
      .populate('author', 'name email');
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    return page;
  }

  async getPageBySlug(slug) {
    const page = await Page.findOne({ slug, status: 'published' })
      .populate('author', 'name email');
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Increment view count
    page.views += 1;
    await page.save();
    
    return page;
  }

  async listPages(filters = {}, options = {}) {
    const { status, author, template, search } = filters;
    const { page = 1, limit = 10, sort = '-createdAt' } = options;
    
    const query = {};
    
    if (status) query.status = status;
    if (author) query.author = author;
    if (template) query.template = template;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [pages, total] = await Promise.all([
      Page.find(query)
        .populate('author', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Page.countDocuments(query),
    ]);
    
    return {
      pages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async addSection(pageId, sectionData) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    const order = page.sections.length;
    page.sections.push({ ...sectionData, order });
    
    await page.save();
    return page;
  }

  async updateSection(pageId, sectionIndex, sectionData) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    if (!page.sections[sectionIndex]) {
      throw new Error('Section not found');
    }
    
    page.sections[sectionIndex] = {
      ...page.sections[sectionIndex].toObject(),
      ...sectionData,
    };
    
    await page.save();
    return page;
  }

  async deleteSection(pageId, sectionIndex) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    page.sections.splice(sectionIndex, 1);
    
    // Reorder remaining sections
    page.sections.forEach((section, index) => {
      section.order = index;
    });
    
    await page.save();
    return page;
  }

  async reorderSections(pageId, newOrder) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Reorder sections based on newOrder array
    const reorderedSections = newOrder.map((index, newIndex) => {
      const section = page.sections[index];
      section.order = newIndex;
      return section;
    });
    
    page.sections = reorderedSections;
    await page.save();
    
    return page;
  }

  async publishPage(pageId) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    page.status = 'published';
    page.publishedAt = new Date();
    await page.save();
    
    return page;
  }

  async deletePage(pageId) {
    const page = await Page.findByIdAndDelete(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    return { message: 'Page deleted successfully' };
  }

  async getVersionHistory(pageId) {
    const page = await Page.findById(pageId)
      .select('versions')
      .populate('versions.updatedBy', 'name email');
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    return page.versions;
  }

  async restoreVersion(pageId, versionIndex, userId) {
    const page = await Page.findById(pageId);
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    const version = page.versions[versionIndex];
    
    if (!version) {
      throw new Error('Version not found');
    }
    
    // Create a new version before restoring
    page.createVersion(userId, `Restored from version ${versionIndex}`);
    
    // Restore sections
    page.sections = version.sections;
    
    await page.save();
    
    return page;
  }

  async duplicatePage(pageId, userId) {
    const originalPage = await Page.findById(pageId);
    
    if (!originalPage) {
      throw new Error('Page not found');
    }
    
    const duplicatedPage = new Page({
      title: `${originalPage.title} (Copy)`,
      slug: `${originalPage.slug}-copy-${Date.now()}`,
      template: originalPage.template,
      sections: originalPage.sections,
      seo: originalPage.seo,
      author: userId,
      status: 'draft',
    });
    
    await duplicatedPage.save();
    return duplicatedPage;
  }
}

module.exports = new PageService();
