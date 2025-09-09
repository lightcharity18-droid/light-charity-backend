const Community = require('../models/community.model');
const CommunityMessage = require('../models/communityMessage.model');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Create a new community
const createCommunity = async (req, res) => {
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

    const { name, description, type, category, tags } = req.body;
    const userId = req.user.id;

    // Check if community with same name already exists
    const existingCommunity = await Community.findOne({ name: name.trim(), isActive: true });
    if (existingCommunity) {
      return res.status(409).json({
        success: false,
        message: 'A community with this name already exists'
      });
    }

    // Create new community
    const community = new Community({
      name: name.trim(),
      description: description.trim(),
      type: type || 'public',
      category,
      createdBy: userId,
      tags: tags || [],
      members: [{
        user: userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await community.save();

    // Create system message for community creation
    const systemMessage = new CommunityMessage({
      community: community._id,
      sender: userId,
      content: `Welcome to ${community.name}! This community was created to ${community.description}`,
      messageType: 'system',
      systemMessageType: 'community_created'
    });

    await systemMessage.save();

    // Populate the response
    await community.populate('createdBy', 'firstName lastName name userType');
    await community.populate('members.user', 'firstName lastName name userType');

    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      data: community
    });

  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all communities with pagination and filtering
const getCommunities = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      type, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const communities = await Community.find(query)
      .populate('createdBy', 'firstName lastName name userType')
      .populate('members.user', 'firstName lastName name userType')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Community.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        communities,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's communities
const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const communities = await Community.find({
      'members.user': userId,
      isActive: true
    })
    .populate('createdBy', 'firstName lastName name userType')
    .populate('members.user', 'firstName lastName name userType')
    .sort({ 'stats.lastActivityAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Community.countDocuments({
      'members.user': userId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        communities,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get community by ID
const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findOne({ _id: id, isActive: true })
      .populate('createdBy', 'firstName lastName name userType')
      .populate('members.user', 'firstName lastName name userType');

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is a member or if it's a public community
    const isMember = community.isMember(userId);
    if (community.type === 'private' && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This is a private community.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        community,
        userMembership: {
          isMember,
          role: isMember ? community.getMemberRole(userId) : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Join a community
const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findOne({ _id: id, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is already a member
    if (community.isMember(userId)) {
      return res.status(409).json({
        success: false,
        message: 'You are already a member of this community'
      });
    }

    // Check if community has reached max members
    if (community.members.length >= community.settings.maxMembers) {
      return res.status(409).json({
        success: false,
        message: 'Community has reached maximum member limit'
      });
    }

    // Add user to community
    await community.addMember(userId);

    // Create system message for user joining
    const user = await User.findById(userId);
    const userName = user.userType === 'donor' ? `${user.firstName} ${user.lastName}` : user.name;

    const systemMessage = new CommunityMessage({
      community: community._id,
      sender: userId,
      content: `${userName} joined the community`,
      messageType: 'system',
      systemMessageType: 'user_joined'
    });

    await systemMessage.save();

    // Populate and return updated community
    await community.populate('createdBy', 'firstName lastName name userType');
    await community.populate('members.user', 'firstName lastName name userType');

    res.status(200).json({
      success: true,
      message: 'Successfully joined the community',
      data: community
    });

  } catch (error) {
    console.error('Error joining community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Leave a community
const leaveCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findOne({ _id: id, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is a member
    if (!community.isMember(userId)) {
      return res.status(409).json({
        success: false,
        message: 'You are not a member of this community'
      });
    }

    // Check if user is the creator - they cannot leave
    if (community.createdBy.toString() === userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Community creator cannot leave. Please transfer ownership or delete the community.'
      });
    }

    // Remove user from community
    await community.removeMember(userId);

    // Create system message for user leaving
    const user = await User.findById(userId);
    const userName = user.userType === 'donor' ? `${user.firstName} ${user.lastName}` : user.name;

    const systemMessage = new CommunityMessage({
      community: community._id,
      sender: userId,
      content: `${userName} left the community`,
      messageType: 'system',
      systemMessageType: 'user_left'
    });

    await systemMessage.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left the community'
    });

  } catch (error) {
    console.error('Error leaving community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update community
const updateCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, type, category, tags } = req.body;

    const community = await Community.findOne({ _id: id, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user has permission to update (admin or creator)
    const userRole = community.getMemberRole(userId);
    if (userRole !== 'admin' && community.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this community'
      });
    }

    // Update fields if provided
    if (name) community.name = name.trim();
    if (description) community.description = description.trim();
    if (type) community.type = type;
    if (category) community.category = category;
    if (tags) community.tags = tags;

    await community.save();

    // Populate and return updated community
    await community.populate('createdBy', 'firstName lastName name userType');
    await community.populate('members.user', 'firstName lastName name userType');

    res.status(200).json({
      success: true,
      message: 'Community updated successfully',
      data: community
    });

  } catch (error) {
    console.error('Error updating community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete community
const deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findOne({ _id: id, isActive: true });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Only creator can delete community
    if (community.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the community creator can delete this community'
      });
    }

    // Soft delete community
    community.isActive = false;
    await community.save();

    res.status(200).json({
      success: true,
      message: 'Community deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting community:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createCommunity,
  getCommunities,
  getUserCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  deleteCommunity
};
