const { createClient } = require('redis');

class RedisService {
  static KEYS = {
    BLOG_POSTS: 'blog:posts',
    NEWS_ITEMS: 'news:items',
    BLOG_POST: (id) => `blog:post:${id}`,
    NEWS_ITEM: (id) => `news:item:${id}`,
  };

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.isConnected = false;
    
    this.client.connect()
      .then(() => {
        this.isConnected = true;
        console.log('Redis connected successfully');
      })
      .catch((error) => {
        console.error('Redis connection failed:', error);
        this.isConnected = false;
      });
  }

  async get(key) {
    if (!this.isConnected) {
      return null;
    }
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  async set(key, value, expiryInSeconds = 3600) {
    if (!this.isConnected) {
      return;
    }
    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: expiryInSeconds
      });
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis Delete Error:', error);
    }
  }
}

module.exports = new RedisService(); 