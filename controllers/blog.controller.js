const Blog = require('../models/blog.model');
const redisService = require('../services/redis.service');

// Create a new blog post
exports.createBlog = async (req, res) => {
    try {
        // Check if user has lightcharity.com email domain
        const userEmail = req.user.email;
        if (!userEmail.endsWith('@lightcharity.com')) {
            return res.status(403).json({ 
                message: 'Only staff members with @lightcharity.com email addresses can create blog posts' 
            });
        }

        // Add author information from authenticated user
        const blogData = {
            ...req.body,
            author: req.user.name || `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email
        };

        const blog = new Blog(blogData);
        const savedBlog = await blog.save();
        
        // Update Redis cache (but don't fail if Redis is down)
        try {
            const allBlogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
            await redisService.set(redisService.KEYS.BLOG_POSTS, allBlogs);
        } catch (redisError) {
            console.error('Redis error (continuing without cache):', redisError);
        }
        
        res.status(201).json(savedBlog);
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(400).json({ message: error.message });
    }
};

// Get all blog posts
exports.getAllBlogs = async (req, res) => {
    try {
        const { category, status, tag } = req.query;
        
        // Try to get from cache first (but don't fail if Redis is down)
        let cachedBlogs = null;
        try {
            cachedBlogs = await redisService.get(redisService.KEYS.BLOG_POSTS);
        } catch (redisError) {
            console.error('Redis error (continuing without cache):', redisError);
        }
        
        if (cachedBlogs && !category && !status && !tag) {
            return res.json(cachedBlogs);
        }

        // If not in cache or has filters, query MongoDB
        let query = {};
        if (category) query.category = category;
        if (status) query.status = status;
        if (tag) query.tags = tag;

        const blogs = await Blog.find(query).sort({ createdAt: -1 });
        
        // Update cache if no filters (but don't fail if Redis is down)
        if (!category && !status && !tag) {
            try {
                await redisService.set(redisService.KEYS.BLOG_POSTS, blogs);
            } catch (redisError) {
                console.error('Redis error (continuing without cache):', redisError);
            }
        }
        
        res.json(blogs);
    } catch (error) {
        console.error('Error in getAllBlogs:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get a single blog post by ID
exports.getBlogById = async (req, res) => {
    try {
        // Try to get from cache first
        const cachedBlog = await redisService.get(redisService.KEYS.BLOG_POST(req.params.id));
        if (cachedBlog) {
            return res.json(cachedBlog);
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Cache the blog post
        await redisService.set(redisService.KEYS.BLOG_POST(req.params.id), blog);
        
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a blog post
exports.updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        if (!blog) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Update Redis cache
        const allBlogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
        await redisService.set(redisService.KEYS.BLOG_POSTS, allBlogs);
        await redisService.set(redisService.KEYS.BLOG_POST(req.params.id), blog);
        
        res.json(blog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a blog post
exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Update Redis cache
        const allBlogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
        await redisService.set(redisService.KEYS.BLOG_POSTS, allBlogs);
        await redisService.delete(redisService.KEYS.BLOG_POST(req.params.id));
        
        res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 