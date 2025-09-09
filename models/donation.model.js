const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  // Donor information (linked to User model)
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Donation details
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  
  scheduledDate: {
    type: Date,
    required: true
  },
  
  location: {
    type: String,
    required: true,
    trim: true
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  // Health confirmation
  healthConfirmed: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Additional fields for tracking
  unitsDonated: {
    type: Number,
    default: 0
  },
  
  actualDonationDate: {
    type: Date
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  },
  
  // Contact information at time of scheduling
  contactPhone: {
    type: String,
    trim: true
  },
  
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
donationSchema.index({ donorId: 1 });
donationSchema.index({ scheduledDate: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ bloodGroup: 1 });
donationSchema.index({ createdAt: -1 });

// Virtual for donor name (populated from User model)
donationSchema.virtual('donorName').get(function() {
  return this.populated('donorId') ? 
    `${this.donorId.firstName} ${this.donorId.lastName}` : 
    'Unknown Donor';
});

// Ensure virtuals are serialized
donationSchema.set('toJSON', { virtuals: true });
donationSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate scheduled date
donationSchema.pre('save', function(next) {
  if (this.scheduledDate < new Date()) {
    return next(new Error('Scheduled date cannot be in the past'));
  }
  next();
});

// Static method to get upcoming donations
donationSchema.statics.getUpcomingDonations = function(limit = 10) {
  return this.find({
    scheduledDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] }
  })
  .populate('donorId', 'firstName lastName email phone')
  .sort({ scheduledDate: 1 })
  .limit(limit);
};

// Static method to get donation statistics
donationSchema.statics.getDonationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation; 