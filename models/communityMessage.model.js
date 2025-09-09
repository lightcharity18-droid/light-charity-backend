const mongoose = require('mongoose');

const communityMessageSchema = new mongoose.Schema({
  // Reference to the community
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  
  // Message sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  
  // For system messages (user joined, left, etc.)
  systemMessageType: {
    type: String,
    enum: ['user_joined', 'user_left', 'user_promoted', 'community_created', 'settings_changed'],
    required: function() {
      return this.messageType === 'system';
    }
  },
  
  // File attachments (for future use)
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  
  // Reply functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityMessage'
  },
  
  // Message reactions (for future enhancement)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      enum: ['👍', '❤️', '😊', '😮', '😢', '😡']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message status
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: {
    type: Date
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  },
  
  // Read receipts (for future enhancement)
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
communityMessageSchema.index({ community: 1, createdAt: -1 });
communityMessageSchema.index({ sender: 1 });
communityMessageSchema.index({ messageType: 1 });
communityMessageSchema.index({ isDeleted: 1 });
communityMessageSchema.index({ replyTo: 1 });

// Pre-save middleware to update community stats
communityMessageSchema.post('save', async function() {
  if (this.isNew && !this.isDeleted) {
    const Community = mongoose.model('Community');
    await Community.findByIdAndUpdate(this.community, {
      $inc: { 'stats.messageCount': 1 },
      $set: { 'stats.lastActivityAt': new Date() }
    });
  }
});

// Pre-remove middleware to update community stats
communityMessageSchema.pre('deleteOne', { document: true }, async function() {
  if (!this.isDeleted) {
    const Community = mongoose.model('Community');
    await Community.findByIdAndUpdate(this.community, {
      $inc: { 'stats.messageCount': -1 }
    });
  }
});

// Method to soft delete message
communityMessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method to edit message
communityMessageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to add reaction
communityMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from user if any
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji
  });
  
  return this.save();
};

// Method to remove reaction
communityMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  return this.save();
};

// Static method to get messages for a community with pagination
communityMessageSchema.statics.getCommunityMessages = function(communityId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    community: communityId, 
    isDeleted: false 
  })
  .populate('sender', 'firstName lastName name userType')
  .populate('replyTo', 'content sender')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .exec();
};

const CommunityMessage = mongoose.model('CommunityMessage', communityMessageSchema);

module.exports = CommunityMessage;
