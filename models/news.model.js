const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
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
    category: {
        type: String,
        required: true,
        enum: ['news', 'urgent', 'announcement', 'award']
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    source: {
        type: String,
        required: true
    },
    sourceUrl: {
        type: String,
        required: true,
        unique: true
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

module.exports = mongoose.model('News', newsSchema); 