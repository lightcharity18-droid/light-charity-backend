const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const User = require('../models/User');

// Send a message (email) to a user
const sendMessage = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { to, subject, message } = req.body;
        const sender = req.user;

        // Validate recipient email
        const recipient = await User.findByEmail(to);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        try {
            // Send the message via email service
            const result = await emailService.sendGeneralMessage(
                to,
                subject,
                message,
                sender
            );

            res.status(200).json({
                success: true,
                message: 'Message sent successfully',
                data: {
                    messageId: result.messageId,
                    recipient: to,
                    subject: subject,
                    sentAt: new Date().toISOString()
                }
            });

        } catch (emailError) {
            console.error('Failed to send message:', emailError);
            
            return res.status(500).json({
                success: false,
                message: 'Failed to send message. Please try again later.'
            });
        }

    } catch (error) {
        console.error('Message sending error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while sending message'
        });
    }
};

// Get message history for the authenticated user
const getMessageHistory = async (req, res) => {
    try {
        // This is a placeholder for future message history functionality
        // In a real implementation, you'd store messages in a database
        res.status(200).json({
            success: true,
            message: 'Message history retrieved successfully',
            data: {
                messages: [],
                stats: {
                    totalSent: 0,
                    totalReceived: 0,
                    unreadCount: 0
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving message history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving message history'
        });
    }
};

// Send broadcast message to multiple users
const sendBroadcastMessage = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { recipients, subject, message, userType } = req.body;
        const sender = req.user;

        let recipientEmails = [];

        if (recipients && recipients.length > 0) {
            // Send to specific recipients
            recipientEmails = recipients;
        } else if (userType) {
            // Send to all users of a specific type
            const users = await User.find({ userType: userType }, 'email');
            recipientEmails = users.map(user => user.email);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either recipients or userType must be specified'
            });
        }

        if (recipientEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No recipients found'
            });
        }

        const results = [];
        const failedEmails = [];

        // Send messages to all recipients
        for (const email of recipientEmails) {
            try {
                const result = await emailService.sendGeneralMessage(
                    email,
                    subject,
                    message,
                    sender
                );
                results.push({ email, messageId: result.messageId, status: 'sent' });
            } catch (error) {
                console.error(`Failed to send message to ${email}:`, error);
                failedEmails.push({ email, error: error.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Broadcast message sent to ${results.length} out of ${recipientEmails.length} recipients`,
            data: {
                successful: results,
                failed: failedEmails,
                stats: {
                    total: recipientEmails.length,
                    sent: results.length,
                    failed: failedEmails.length
                }
            }
        });

    } catch (error) {
        console.error('Broadcast message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while sending broadcast message'
        });
    }
};

module.exports = {
    sendMessage,
    getMessageHistory,
    sendBroadcastMessage
}; 