const mongoose = require('mongoose');

const donationCenterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      default: 'USA',
      trim: true
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  
  bloodTypesAccepted: [{
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  }],
  
  bloodInventory: [{
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    unitsAvailable: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  
  services: [{
    type: String,
    enum: ['blood_donation', 'plasma_donation', 'platelet_donation', 'blood_testing', 'mobile_unit']
  }],
  
  capacity: {
    dailyDonors: {
      type: Number,
      default: 50
    },
    appointmentSlots: {
      type: Number,
      default: 20
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'temporary_closed'],
    default: 'active'
  },
  
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  features: [{
    type: String,
    enum: ['parking', 'wheelchair_accessible', 'wifi', 'refreshments', 'gift_shop', 'childcare']
  }],
  
  emergencyContact: {
    name: String,
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
donationCenterSchema.index({ location: '2dsphere' });
donationCenterSchema.index({ 'address.city': 1 });
donationCenterSchema.index({ 'address.state': 1 });
donationCenterSchema.index({ status: 1 });
donationCenterSchema.index({ bloodTypesAccepted: 1 });

// Virtual for getting latitude and longitude separately
donationCenterSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

donationCenterSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

// Method to find nearby centers
donationCenterSchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    status: 'active'
  });
};

// Method to check if center has specific blood type available
donationCenterSchema.methods.hasBloodType = function(bloodType) {
  const inventory = this.bloodInventory.find(item => item.bloodType === bloodType);
  return inventory && inventory.unitsAvailable > 0;
};

// Method to get current operating hours
donationCenterSchema.methods.getCurrentOperatingHours = function() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  return this.operatingHours[today];
};

module.exports = mongoose.model('DonationCenter', donationCenterSchema);
