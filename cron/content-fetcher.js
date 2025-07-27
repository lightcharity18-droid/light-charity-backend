const cron = require('node-cron');
const contentFetcher = require('../services/content-fetcher.service');

// Schedule content fetching every hour
cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled content fetch...');
    try {
        // Fetch from Dev.to
        const devToArticles = await contentFetcher.fetchFromDevTo();
        console.log(`Fetched ${devToArticles.length} articles from Dev.to`);

        // Fetch from NewsAPI
        const newsItems = await contentFetcher.fetchFromNewsAPI();
        console.log(`Fetched ${newsItems.length} news items from NewsAPI`);

        // Cleanup old content (runs once a day at 3 AM)
        if (new Date().getHours() === 3) {
            await contentFetcher.cleanupOldContent();
            console.log('Cleaned up old content');
        }
    } catch (error) {
        console.error('Error in content fetcher cron job:', error);
    }
});

// Run immediately on startup
(async () => {
    console.log('Running initial content fetch...');
    try {
        await contentFetcher.fetchFromDevTo();
        await contentFetcher.fetchFromNewsAPI();
        console.log('Initial content fetch completed');
    } catch (error) {
        console.error('Error in initial content fetch:', error);
    }
})(); 