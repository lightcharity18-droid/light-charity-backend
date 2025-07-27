const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    interests: [{
        type: String,
        enum: ['Event Support', 'Office Support', 'Outreach', 'Logistics', 'Donor Relations', 'Marketing']
    }],
    availability: [{
        type: String,
        enum: ['Weekdays', 'Weekends', 'Mornings', 'Afternoons', 'Evenings']
    }],
    message: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'approved', 'rejected'],
        default: 'pending'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    contactedDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
volunteerSchema.index({ email: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ applicationDate: -1 });

module.exports = mongoose.model('Volunteer', volunteerSchema); 