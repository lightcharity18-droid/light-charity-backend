const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
    sendMessage,
    getMessageHistory,
    sendBroadcastMessage
} = require('../controllers/message.controller');

const { authenticate } = require('../middleware/auth');

// Validation middleware for sending messages
const validateMessage = [
    body('to')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid recipient email address'),
    
    body('subject')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Subject must be between 1 and 200 characters'),
    
    body('message')
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Message must be between 1 and 5000 characters')
];

// Validation middleware for broadcast messages
const validateBroadcastMessage = [
    body('subject')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Subject must be between 1 and 200 characters'),
    
    body('message')
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Message must be between 1 and 5000 characters'),
    
    body('recipients')
        .optional()
        .isArray()
        .withMessage('Recipients must be an array of email addresses')
        .custom((value) => {
            if (Array.isArray(value)) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const invalidEmails = value.filter(email => !emailRegex.test(email));
                if (invalidEmails.length > 0) {
                    throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
                }
            }
            return true;
        }),
    
    body('userType')
        .optional()
        .isIn(['donor', 'hospital'])
        .withMessage('User type must be either "donor" or "hospital"'),
        
    // Custom validation to ensure either recipients or userType is provided
    body().custom((value, { req }) => {
        if (!req.body.recipients && !req.body.userType) {
            throw new Error('Either recipients or userType must be provided');
        }
        return true;
    })
];

// Protected routes (require authentication)

// @route   POST /api/messages/send
// @desc    Send a message to a specific user
// @access  Private
router.post('/send', authenticate, validateMessage, sendMessage);

// @route   POST /api/messages/broadcast
// @desc    Send a broadcast message to multiple users
// @access  Private
router.post('/broadcast', authenticate, validateBroadcastMessage, sendBroadcastMessage);

// @route   GET /api/messages/history
// @desc    Get message history for the authenticated user
// @access  Private
router.get('/history', authenticate, getMessageHistory);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'messaging',
        timestamp: new Date().toISOString(),
        endpoints: {
            sendMessage: '/api/messages/send',
            broadcastMessage: '/api/messages/broadcast',
            messageHistory: '/api/messages/history'
        }
    });
});

module.exports = router; 