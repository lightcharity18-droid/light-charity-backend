const CommunityMessage = require('../models/communityMessage.model');
const Community = require('../models/community.model');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const webSocketService = require('../services/websocket.service');
const { 
  sanitizeMessageForDisplay, 
  isMessageAppropriate, 
  validateMessageComplexity,
  checkMessageFrequency 
} = require('../utils/messageValidator');
const { wsLogger } = require('../services/logger.service');

// Send a message to a community
const sendMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { communityId } = req.params;
    const { content, messageType = 'text', replyTo } = req.body;
    const userId = req.user.id;

    // Additional content validation
    const complexityCheck = validateMessageComplexity(content);
    if (!complexityCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Message validation failed: ${complexityCheck.reason}`
      });
    }

    // Check if content is appropriate
    if (!isMessageAppropriate(content)) {
      return res.status(400).json({
        success: false,
        message: 'Message contains inappropriate content'
      });
    }

    // Sanitize content for safe storage and display
    const sanitizedContent = sanitizeMessageForDisplay(content);

    // Check if community exists and user is a member
    const community = await Community.findOne({ _id: communityId, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    if (!community.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this community to send messages'
      });
    }

    // Create new message with sanitized content
    const message = new CommunityMessage({
      community: communityId,
      sender: userId,
      content: sanitizedContent,
      messageType,
      replyTo: replyTo || undefined
    });

    await message.save();

    // Populate message with sender details
    await message.populate('sender', 'firstName lastName name userType');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Broadcast message to community subscribers via Socket.IO
    console.log(`Broadcasting new message to community ${communityId} (${community.name})`);
    console.log('Message data:', {
      messageId: message._id,
      senderId: message.sender._id,
      senderName: message.sender.name || `${message.sender.firstName} ${message.sender.lastName}`,
      content: message.content.substring(0, 50) + '...'
    });
    
    webSocketService.broadcastToCommunity(communityId, 'new_message', {
      message,
      communityId,
      communityName: community.name
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get messages for a community
const getCommunityMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Check if community exists and user is a member
    const community = await Community.findOne({ _id: communityId, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    if (!community.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this community to view messages'
      });
    }

    // Get messages with pagination
    const messages = await CommunityMessage.getCommunityMessages(
      communityId, 
      parseInt(page), 
      parseInt(limit)
    );

    // Reverse to show oldest first (since we sorted by createdAt desc for pagination)
    const orderedMessages = messages.reverse();

    const total = await CommunityMessage.countDocuments({
      community: communityId,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: {
        messages: orderedMessages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Edit a message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await CommunityMessage.findOne({ 
      _id: messageId, 
      isDeleted: false 
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is older than 24 hours (optional restriction)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < twentyFourHoursAgo) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit messages older than 24 hours'
      });
    }

    // Edit the message
    await message.editMessage(content.trim());

    // Populate and return updated message
    await message.populate('sender', 'firstName lastName name userType');
    if (message.replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Broadcast message edit to community subscribers via Socket.IO
    const community = await Community.findById(message.community);
    webSocketService.broadcastToCommunity(message.community.toString(), 'message_edited', {
      message,
      communityId: message.community.toString(),
      communityName: community.name
    });

    res.status(200).json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await CommunityMessage.findOne({ 
      _id: messageId, 
      isDeleted: false 
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender or community admin
    const community = await Community.findById(message.community);
    const userRole = community.getMemberRole(userId);
    
    if (message.sender.toString() !== userId.toString() && 
        userRole !== 'admin' && 
        community.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages or you must be an admin'
      });
    }

    // Soft delete the message
    await message.softDelete();

    // Broadcast message deletion to community subscribers via Socket.IO
    webSocketService.broadcastToCommunity(message.community.toString(), 'message_deleted', {
      messageId: message._id.toString(),
      communityId: message.community.toString(),
      communityName: community.name
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add reaction to a message
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await CommunityMessage.findOne({ 
      _id: messageId, 
      isDeleted: false 
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is a member of the community
    const community = await Community.findById(message.community);
    if (!community.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this community to react to messages'
      });
    }

    // Add reaction
    await message.addReaction(userId, emoji);

    // Populate and return updated message
    await message.populate('sender', 'firstName lastName name userType');
    await message.populate('reactions.user', 'firstName lastName name userType');

    // Broadcast reaction to community subscribers via Socket.IO
    webSocketService.broadcastToCommunity(message.community.toString(), 'message_reaction_added', {
      messageId: message._id.toString(),
      reaction: { userId, emoji },
      communityId: message.community.toString()
    });

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: message
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Remove reaction from a message
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await CommunityMessage.findOne({ 
      _id: messageId, 
      isDeleted: false 
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove reaction
    await message.removeReaction(userId);

    // Populate and return updated message
    await message.populate('sender', 'firstName lastName name userType');
    await message.populate('reactions.user', 'firstName lastName name userType');

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      data: message
    });

  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get recent messages across all user's communities (for dashboard)
const getRecentMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user's communities
    const userCommunities = await Community.find({
      'members.user': userId,
      isActive: true
    }).select('_id');

    const communityIds = userCommunities.map(c => c._id);

    // Get recent messages from user's communities
    const recentMessages = await CommunityMessage.find({
      community: { $in: communityIds },
      isDeleted: false
    })
    .populate('sender', 'firstName lastName name userType')
    .populate('community', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: recentMessages
    });

  } catch (error) {
    console.error('Error fetching recent messages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark messages as read for a community
const markMessagesAsRead = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    // Check if community exists and user is a member
    const community = await Community.findOne({ _id: communityId, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    if (!community.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this community'
      });
    }

    // Mark all unread messages as read for this user in this community
    await CommunityMessage.updateMany(
      {
        community: communityId,
        isDeleted: false,
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get unread message counts for all user's communities
const getUnreadMessageCounts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's communities
    const userCommunities = await Community.find({
      'members.user': userId,
      isActive: true
    }).select('_id name');

    const communityIds = userCommunities.map(c => c._id);

    // Get unread message counts for each community
    const unreadCounts = await CommunityMessage.aggregate([
      {
        $match: {
          community: { $in: communityIds },
          isDeleted: false,
          'readBy.user': { $ne: userId }
        }
      },
      {
        $group: {
          _id: '$community',
          unreadCount: { $sum: 1 }
        }
      }
    ]);

    // Create a map of community ID to unread count
    const unreadCountMap = {};
    unreadCounts.forEach(item => {
      unreadCountMap[item._id.toString()] = item.unreadCount;
    });

    // Format response with community info and unread counts
    const result = userCommunities.map(community => ({
      communityId: community._id,
      communityName: community.name,
      unreadCount: unreadCountMap[community._id.toString()] || 0
    }));

    // Calculate total unread messages
    const totalUnread = result.reduce((sum, item) => sum + item.unreadCount, 0);

    res.status(200).json({
      success: true,
      data: {
        communities: result,
        totalUnread
      }
    });

  } catch (error) {
    console.error('Error fetching unread message counts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  sendMessage,
  getCommunityMessages,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getRecentMessages,
  markMessagesAsRead,
  getUnreadMessageCounts
};
