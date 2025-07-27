const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');

// Get all news items
router.get('/', newsController.getAllNews);

// Get a single news item by ID
router.get('/:id', newsController.getNewsById);

// Create a new news item
router.post('/', newsController.createNews);

// Update a news item
router.put('/:id', newsController.updateNews);

// Delete a news item
router.delete('/:id', newsController.deleteNews);

module.exports = router; 