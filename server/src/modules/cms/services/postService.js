const Post = require('../models/Post');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

class PostService {
  async createPost(data, userId) {
    const post = new Post({
      ...data,
      author: userId,
      status: data.status || 'draft',
    });
    
    await post.save();
    return post.populate(['author', 'categories', 'tags', 'coAuthors']);
  }

  async updatePost(postId, data, userId) {
    const post = await Post.findById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Create version snapshot before updating
    if (data.createVersion !== false) {
      post.createVersion(userId, data.changeNote);
    }
    
    Object.assign(post, data);
    await post.save();
    
    return post.populate(['author', 'categories', 'tags', 'coAuthors']);
  }

  async getPost(postId) {
    const post = await Post.findById(postId)
      .populate('author', 'name email')
      .populate('coAuthors', 'name email')
      .populate('categories')
      .populate('tags')
      .populate('relatedPosts', 'title slug featuredImage');
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    return post;
  }

  async getPostBySlug(slug) {
    const post = await Post.findOne({ slug, status: 'published', visibility: 'public' })
      .populate('author', 'name email')
      .populate('coAuthors', 'name email')
      .populate('categories')
      .populate('tags')
      .populate('relatedPosts', 'title slug featuredImage excerpt');
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    return post;
  }

  async listPublicPosts(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      sort = '-publishedAt',
    } = options;

    const query = {
      status: 'published',
      visibility: 'public',
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .select('title slug excerpt featuredImage publishedAt author views likes commentsCount categories tags')
        .populate('author', 'name')
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Post.countDocuments(query),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async listPosts(filters = {}, options = {}) {
    const {
      status,
      author,
      category,
      tag,
      search,
      startDate,
      endDate,
    } = filters;
    
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
    } = options;
    
    const query = {};
    
    if (status) query.status = status;
    if (author) query.author = author;
    if (category) query.categories = category;
    if (tag) query.tags = tag;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'name email')
        .populate('categories', 'name slug')
        .populate('tags', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Post.countDocuments(query),
    ]);
    
    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async publishPost(postId) {
    const post = await Post.findById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    if (!post.featuredImage?.url) {
      throw new Error('Featured image is required before publishing');
    }
    
    post.status = 'published';
    post.publishedAt = new Date();
    await post.save();
    
    return post;
  }

  async schedulePost(postId, scheduledAt) {
    const post = await Post.findById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    if (!post.featuredImage?.url) {
      throw new Error('Featured image is required before scheduling');
    }
    
    post.status = 'scheduled';
    post.scheduledAt = new Date(scheduledAt);
    await post.save();
    
    return post;
  }

  async deletePost(postId) {
    const post = await Post.findByIdAndDelete(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    return { message: 'Post deleted successfully' };
  }

  async getVersionHistory(postId) {
    const post = await Post.findById(postId)
      .select('versions')
      .populate('versions.updatedBy', 'name email');
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    return post.versions;
  }

  async restoreVersion(postId, versionIndex, userId) {
    const post = await Post.findById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    const version = post.versions[versionIndex];
    
    if (!version) {
      throw new Error('Version not found');
    }
    
    // Create a new version before restoring
    post.createVersion(userId, `Restored from version ${versionIndex}`);
    
    // Restore content
    post.content = version.content;
    post.title = version.title;
    
    await post.save();
    
    return post;
  }

  async getPostAnalytics(postId) {
    const post = await Post.findById(postId)
      .select('title slug views likes shares commentsCount publishedAt');
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    return {
      title: post.title,
      slug: post.slug,
      views: post.views,
      likes: post.likes,
      shares: post.shares,
      comments: post.commentsCount,
      publishedAt: post.publishedAt,
      engagement: post.views > 0 ? ((post.likes + post.shares + post.commentsCount) / post.views * 100).toFixed(2) : 0,
    };
  }

  async bulkUpdateStatus(postIds, status) {
    const result = await Post.updateMany(
      { _id: { $in: postIds } },
      { $set: { status } }
    );
    
    return result;
  }

  async generateFAQSchema(postId) {
    const post = await Post.findById(postId).select('faqs');
    
    if (!post || !post.faqs || post.faqs.length === 0) {
      return null;
    }
    
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
    
    return schema;
  }

  async togglePostLike(postId, userId) {
    const post = await Post.findById(postId).select('likes likedBy');

    if (!post) {
      throw new Error('Post not found');
    }

    const userIdString = String(userId);
    const alreadyLiked = (post.likedBy || []).some((id) => String(id) === userIdString);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter((id) => String(id) !== userIdString);
      post.likes = Math.max(0, (post.likes || 0) - 1);
    } else {
      post.likedBy.push(userId);
      post.likes = (post.likes || 0) + 1;
    }

    await post.save();

    return {
      liked: !alreadyLiked,
      likes: post.likes,
    };
  }
}

module.exports = new PostService();
