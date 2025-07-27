const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { authenticate } = require('../middleware/auth');

// Create a new blog post (requires authentication and lightcharity.com email)
router.post('/', authenticate, blogController.createBlog);

// Get all blog posts
router.get('/', blogController.getAllBlogs);

// Get a single blog post by ID
router.get('/:id', blogController.getBlogById);

// Update a blog post
router.put('/:id', blogController.updateBlog);

// Delete a blog post
router.delete('/:id', blogController.deleteBlog);

module.exports = router; 