const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
require('dotenv').config();

// Import cron job
require('./cron/content-fetcher');

// Import Socket.IO service
const webSocketService = require('./services/websocket.service');

// Import logging services
const { logger, apiLogger, dbLogger } = require('./services/logger.service');

// Import rate limiting
const { apiLimiter, authLimiter, messageLimiter } = require('./middleware/rateLimiter');

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200, // For legacy browser support
    maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add API request logging in production
if (process.env.NODE_ENV === 'production') {
  app.use(apiLogger.request);
  
  // Apply general rate limiting in production
  app.use('/api/', apiLimiter);
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/light-charity', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false // Disable mongoose buffering
})
.then(() => {
    console.log('MongoDB connected successfully');
    dbLogger.connection('connected');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
    dbLogger.error(err);
});

// Routes
const blogRoutes = require('./routes/blog.routes');
const newsRoutes = require('./routes/news.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const authRoutes = require('./routes/auth.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const messageRoutes = require('./routes/message.routes');
const donationRoutes = require('./routes/donation.routes');
const donationCenterRoutes = require('./routes/donationCenter.routes');
const communityRoutes = require('./routes/community.routes');

app.use('/api/blogs', blogRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/auth', authLimiter, authRoutes); // Apply auth rate limiting
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/donation-centers', donationCenterRoutes);
app.use('/api/communities', messageLimiter, communityRoutes); // Apply message rate limiting to community routes

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Light Charity Backend API' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = webSocketService.getHealthStatus();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: healthStatus,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// WebSocket stats endpoint (protected)
app.get('/api/websocket/stats', (req, res) => {
    // Add basic auth or admin check here if needed
    const stats = webSocketService.getStats();
    res.json(stats);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO service
webSocketService.initialize(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server available at http://localhost:${PORT}/socket.io/`);
}); 