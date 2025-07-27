const News = require('../models/news.model');
const redisService = require('../services/redis.service');

// Get all news items
exports.getAllNews = async (req, res) => {
    try {
        const { category, status } = req.query;
        
        // Try to get from cache first
        const cachedNews = await redisService.get(redisService.constructor.KEYS.NEWS_ITEMS);
        if (cachedNews && !category && !status) {
            return res.json(cachedNews);
        }

        // If not in cache or has filters, query MongoDB
        let query = {};
        if (category) query.category = category;
        if (status) query.status = status;

        const news = await News.find(query).sort({ createdAt: -1 });
        
        // Update cache if no filters
        if (!category && !status) {
            await redisService.set(redisService.constructor.KEYS.NEWS_ITEMS, news);
        }
        
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single news item by ID
exports.getNewsById = async (req, res) => {
    try {
        // Try to get from cache first
        const cachedNews = await redisService.get(redisService.constructor.KEYS.NEWS_ITEM(req.params.id));
        if (cachedNews) {
            return res.json(cachedNews);
        }

        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Cache the news item
        await redisService.set(redisService.constructor.KEYS.NEWS_ITEM(req.params.id), news);
        
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new news item
exports.createNews = async (req, res) => {
    try {
        const news = new News(req.body);
        const savedNews = await news.save();
        
        // Update Redis cache
        const allNews = await News.find({ status: 'published' }).sort({ createdAt: -1 });
        await redisService.set(redisService.constructor.KEYS.NEWS_ITEMS, allNews);
        
        res.status(201).json(savedNews);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a news item
exports.updateNews = async (req, res) => {
    try {
        const news = await News.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        if (!news) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Update Redis cache
        const allNews = await News.find({ status: 'published' }).sort({ createdAt: -1 });
        await redisService.set(redisService.constructor.KEYS.NEWS_ITEMS, allNews);
        await redisService.set(redisService.constructor.KEYS.NEWS_ITEM(req.params.id), news);
        
        res.json(news);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a news item
exports.deleteNews = async (req, res) => {
    try {
        const news = await News.findByIdAndDelete(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Update Redis cache
        const allNews = await News.find({ status: 'published' }).sort({ createdAt: -1 });
        await redisService.set(redisService.constructor.KEYS.NEWS_ITEMS, allNews);
        await redisService.delete(redisService.constructor.KEYS.NEWS_ITEM(req.params.id));
        
        res.json({ message: 'News item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 