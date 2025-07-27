const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import cron job
require('./cron/content-fetcher');

const app = express();

// Middleware
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://light-charity.netlify.app', // Netlify URL (if you have one)
        process.env.FRONTEND_URL, // Vercel URL from environment
        // Add any additional frontend URLs here
    ].filter(Boolean), // Remove any undefined values
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/light-charity', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
const blogRoutes = require('./routes/blog.routes');
const newsRoutes = require('./routes/news.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const authRoutes = require('./routes/auth.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const messageRoutes = require('./routes/message.routes');

app.use('/api/blogs', blogRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/messages', messageRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Light Charity Backend API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 