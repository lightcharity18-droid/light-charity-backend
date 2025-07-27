const axios = require('axios');
const cheerio = require('cheerio');
const Blog = require('../models/blog.model');
const News = require('../models/news.model');
const redisService = require('./redis.service');

class ContentFetcherService {
  constructor() {
    this.NEWS_API_KEY = process.env.NEWS_API_KEY;
    this.DEV_TO_API_URL = 'https://dev.to/api/articles';
  }

  async fetchFromDevTo() {
    try {
      console.log('Fetching articles from Dev.to...');
      const response = await axios.get(this.DEV_TO_API_URL, {
        params: {
          tag: 'healthcare,medical,charity',
          per_page: 20,
          top: 7 // Get top articles
        }
      });

      console.log(`Found ${response.data.length} articles from Dev.to`);

      const articles = response.data.map(article => ({
        title: article.title,
        content: article.body_markdown,
        author: article.user.name,
        imageUrl: article.cover_image || article.social_image || '',
        tags: article.tag_list,
        category: 'blog',
        status: 'published',
        source: 'dev.to',
        sourceUrl: article.url,
        createdAt: new Date(article.published_at),
        updatedAt: new Date(article.published_at)
      }));

      console.log('Processing articles for MongoDB...');

      // Save to MongoDB
      for (const article of articles) {
        await Blog.findOneAndUpdate(
          { sourceUrl: article.sourceUrl },
          article,
          { upsert: true, new: true }
        );
      }

      console.log('Updating Redis cache...');

      // Update Redis cache
      const allBlogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 });
      await redisService.set(redisService.constructor.KEYS.BLOG_POSTS, allBlogs);

      console.log(`Successfully processed ${articles.length} articles from Dev.to`);
      return articles;
    } catch (error) {
      console.error('Error fetching from Dev.to:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return [];
    }
  }

  async fetchFromNewsAPI() {
    try {
      console.log('Fetching news from NewsAPI...');
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: '(blood donation OR blood bank OR blood donor OR blood supply OR blood shortage OR blood drive OR plasma donation) AND (healthcare OR medical OR charity OR volunteer OR community OR emergency)',
          apiKey: this.NEWS_API_KEY,
          language: 'en',
          sortBy: 'relevancy',
          pageSize: 15,
          excludeDomains: 'entertainment,sports.yahoo.com,gaming'
        }
      });

      console.log(`Found ${response.data.articles.length} news items from NewsAPI`);

      const newsItems = response.data.articles.map(article => ({
        title: article.title,
        content: article.description,
        author: article.author || 'Unknown',
        imageUrl: article.urlToImage || '',
        category: 'news',
        status: 'published',
        source: article.source.name,
        sourceUrl: article.url,
        createdAt: new Date(article.publishedAt),
        updatedAt: new Date(article.publishedAt)
      }));

      console.log('Processing news items for MongoDB...');

      // Save to MongoDB
      for (const news of newsItems) {
        await News.findOneAndUpdate(
          { sourceUrl: news.sourceUrl },
          news,
          { upsert: true, new: true }
        );
      }

      console.log('Updating Redis cache...');

      // Update Redis cache
      const allNews = await News.find({ status: 'published' }).sort({ createdAt: -1 });
      await redisService.set(redisService.constructor.KEYS.NEWS_ITEMS, allNews);

      console.log(`Successfully processed ${newsItems.length} news items from NewsAPI`);
      return newsItems;
    } catch (error) {
      console.error('Error fetching from NewsAPI:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return [];
    }
  }

  async cleanupOldContent() {
    console.log('Starting content cleanup...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete old blog posts
    const deletedBlogs = await Blog.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      source: { $exists: true } // Only delete auto-fetched content
    });
    console.log(`Deleted ${deletedBlogs.deletedCount} old blog posts`);

    // Delete old news items
    const deletedNews = await News.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    console.log(`Deleted ${deletedNews.deletedCount} old news items`);

    // Clear Redis cache
    await redisService.delete(redisService.constructor.KEYS.BLOG_POSTS);
    await redisService.delete(redisService.constructor.KEYS.NEWS_ITEMS);
    console.log('Cleared Redis cache');
  }
}

module.exports = new ContentFetcherService(); 