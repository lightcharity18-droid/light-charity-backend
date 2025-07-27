const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    category: {
        type: String,
        required: true,
        enum: ['news', 'blog', 'event', 'story']
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema); 