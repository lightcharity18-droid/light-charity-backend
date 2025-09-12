const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Community creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Community type
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  
  // Category for organizing communities
  category: {
    type: String,
    enum: ['blood_donation', 'health_awareness', 'volunteer', 'general', 'emergency'],
    required: true
  },
  
  // Community members
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Community settings
  settings: {
    allowMembersToInvite: {
      type: Boolean,
      default: true
    },
    requireApprovalToJoin: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 500
    }
  },
  
  // Community stats
  stats: {
    memberCount: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Community image/avatar
  avatar: {
    type: String,
    default: null
  },
  
  // Community tags for better discovery
  tags: [{
    type: String,
    trim: true
  }],
  
  // Location fields
  city: {
    type: String,
    trim: true,
    default: null
  },
  
  country: {
    type: String,
    trim: true,
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
communitySchema.index({ name: 1 });
communitySchema.index({ category: 1 });
communitySchema.index({ type: 1 });
communitySchema.index({ createdBy: 1 });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ tags: 1 });
communitySchema.index({ city: 1 });
communitySchema.index({ country: 1 });
communitySchema.index({ isActive: 1 });

// Virtual for member count
communitySchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Pre-save middleware to update member count
communitySchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.stats.memberCount = this.members.length;
  }
  next();
});

// Method to add member
communitySchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => member.user.toString() === userId.toString());
  if (!existingMember) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
    this.stats.memberCount = this.members.length;
  }
  return this.save();
};

// Method to remove member
communitySchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  this.stats.memberCount = this.members.length;
  return this.save();
};

// Method to check if user is member
communitySchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to get member role
communitySchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Static method to find communities by user
communitySchema.statics.findByUser = function(userId) {
  return this.find({ 'members.user': userId, isActive: true });
};

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
