const mongoose = require('mongoose');

const organDonationSchema = new mongoose.Schema({
  // Donor information (linked to User model)
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Organ donation details
  organsToDonate: [{
    type: String,
    enum: ['heart', 'liver', 'kidneys', 'lungs', 'pancreas', 'intestines', 'corneas', 'skin', 'bone', 'tendons'],
    required: true
  }],
  
  registrationDate: {
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
  
  medicalHistory: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['registered', 'active', 'inactive', 'cancelled'],
    default: 'registered'
  },
  
  // Health confirmation
  healthConfirmed: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Family consent
  familyConsent: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Additional fields for tracking
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Contact information at time of registration
  contactPhone: {
    type: String,
    trim: true
  },
  
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Emergency contact information
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  
  // Medical information
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
organDonationSchema.index({ donorId: 1 });
organDonationSchema.index({ registrationDate: 1 });
organDonationSchema.index({ status: 1 });
organDonationSchema.index({ organsToDonate: 1 });
organDonationSchema.index({ createdAt: -1 });

// Virtual for donor name (populated from User model)
organDonationSchema.virtual('donorName').get(function() {
  return this.populated('donorId') ? 
    `${this.donorId.firstName} ${this.donorId.lastName}` : 
    'Unknown Donor';
});

// Virtual for potential lives saved
organDonationSchema.virtual('potentialLivesSaved').get(function() {
  const impactMap = {
    'heart': 1,
    'liver': 1,
    'kidneys': 2,
    'lungs': 2,
    'pancreas': 1,
    'intestines': 1,
    'corneas': 2,
    'skin': 1,
    'bone': 1,
    'tendons': 1
  };
  
  return this.organsToDonate.reduce((total, organ) => {
    return total + (impactMap[organ] || 1);
  }, 0);
});

// Ensure virtuals are serialized
organDonationSchema.set('toJSON', { virtuals: true });
organDonationSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate registration date
organDonationSchema.pre('save', function(next) {
  if (this.registrationDate < new Date()) {
    return next(new Error('Registration date cannot be in the past'));
  }
  next();
});

// Static method to get active organ donors
organDonationSchema.statics.getActiveDonors = function(limit = 10) {
  return this.find({
    status: 'active'
  })
  .populate('donorId', 'firstName lastName email phone')
  .sort({ registrationDate: -1 })
  .limit(limit);
};

// Static method to get organ donation statistics
organDonationSchema.statics.getOrganDonationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get organ type statistics
organDonationSchema.statics.getOrganTypeStats = function() {
  return this.aggregate([
    { $unwind: '$organsToDonate' },
    {
      $group: {
        _id: '$organsToDonate',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const OrganDonation = mongoose.model('OrganDonation', organDonationSchema);

module.exports = OrganDonation;
