const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Common fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() { 
      // Password is required unless user signed up with Google
      return !this.googleId; 
    },
    minlength: 6
  },
  // OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'mixed'], // mixed = user has both password and OAuth
    default: 'local'
  },
  phone: {
    type: String,
    required: function() {
      // Phone might not be available from Google OAuth
      return this.authProvider === 'local';
    }
  },
  postalCode: {
    type: String,
    required: function() {
      // Postal code might not be available from Google OAuth
      return this.authProvider === 'local';
    }
  },
  userType: {
    type: String,
    enum: ['donor', 'hospital'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  
  // Donor-specific fields
  firstName: {
    type: String,
    required: function() { 
      // firstName is required for donors, but Google OAuth users might not have it initially
      return this.userType === 'donor' && this.authProvider === 'local'; 
    }
  },
  lastName: {
    type: String,
    required: function() { 
      // lastName is required for donors, but Google OAuth users might not have it initially
      return this.userType === 'donor' && this.authProvider === 'local'; 
    }
  },
  dateOfBirth: {
    type: Date,
    required: function() { 
      // dateOfBirth is required for donors, but not for Google OAuth users initially
      return this.userType === 'donor' && this.authProvider === 'local'; 
    }
  },
  donorNumber: {
    type: String,
    sparse: true // Allows multiple null values
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  donationHistory: [{
    date: Date,
    location: String,
    bloodType: String,
    quantity: Number
  }],
  
  // Hospital/Blood Bank specific fields
  name: {
    type: String,
    required: function() { return this.userType === 'hospital'; }
  },
  address: {
    type: String,
    required: function() { return this.userType === 'hospital'; }
  },
  hospitalType: {
    type: String,
    enum: ['hospital', 'blood_bank', 'clinic'],
    required: function() { return this.userType === 'hospital'; }
  },
  licenseNumber: String,
  capacity: {
    type: Number,
    default: 0
  },
  bloodInventory: [{
    bloodType: String,
    quantity: Number,
    expiryDate: Date
  }]
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ postalCode: 1 });

// Virtual for donor full name
userSchema.virtual('fullName').get(function() {
  if (this.userType === 'donor') {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verifyToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');
  
  return verifyToken;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.emailVerificationToken;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 