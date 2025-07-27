const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ['user', 'bot'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    messageType: {
        type: String,
        enum: ['text', 'quick-action', 'system'],
        default: 'text'
    }
});

const conversationSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        default: 'anonymous'
    },
    messages: [messageSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        platform: String
    }
}, {
    timestamps: true
});

// Add indexes for better performance
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ userId: 1 });
conversationSchema.index({ 'messages.timestamp': -1 });

// Method to add a message to conversation
conversationSchema.methods.addMessage = function(sender, content, messageType = 'text') {
    this.messages.push({
        sender,
        content,
        messageType,
        timestamp: new Date()
    });
    this.updatedAt = new Date();
    return this.save();
};

// Method to get recent messages for context
conversationSchema.methods.getRecentMessages = function(limit = 10) {
    return this.messages
        .slice(-limit)
        .map(msg => ({
            role: msg.sender === 'bot' ? 'assistant' : 'user',
            content: msg.content,
            timestamp: msg.timestamp
        }));
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreateConversation = async function(sessionId, userId = 'anonymous') {
    let conversation = await this.findOne({ sessionId });
    
    if (!conversation) {
        conversation = new this({
            sessionId,
            userId,
            messages: []
        });
        await conversation.save();
    }
    
    return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema); 