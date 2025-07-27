const express = require('express');
const { 
    chatWithBot, 
    chatWithBotSimple, 
    getConversationHistory,
    clearConversation,
    getChatbotStats
} = require('../controllers/chatbot.controller');

const router = express.Router();

// Chat endpoints
router.post('/chat/stream', chatWithBot);
router.post('/chat', chatWithBotSimple);

// Conversation management endpoints
router.get('/conversation/:sessionId', getConversationHistory);
router.delete('/conversation/:sessionId', clearConversation);

// Analytics endpoint
router.get('/stats', getChatbotStats);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'chatbot',
        timestamp: new Date().toISOString(),
        endpoints: {
            chat: '/api/chatbot/chat',
            streamChat: '/api/chatbot/chat/stream',
            conversationHistory: '/api/chatbot/conversation/:sessionId',
            clearConversation: '/api/chatbot/conversation/:sessionId (DELETE)',
            stats: '/api/chatbot/stats'
        }
    });
});

module.exports = router; 