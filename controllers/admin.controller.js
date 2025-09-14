const User = require('../models/User');
const { logger } = require('../services/logger.service');

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userType,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (userType && userType !== 'all') {
      filter.userType = userType;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    // Get user statistics
    const stats = {
      total: await User.countDocuments(),
      active: await User.countDocuments({ isActive: true }),
      inactive: await User.countDocuments({ isActive: false }),
      donors: await User.countDocuments({ userType: 'donor' }),
      hospitals: await User.countDocuments({ userType: 'hospital' }),
      recentSignups: await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        stats
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching users'
    });
  }
};

// Get user activity and analytics
const getUserActivity = async (req, res) => {
  try {
    const { timeframe = '24h', userId } = req.query;
    
    let startDate;
    switch (timeframe) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const filter = {
      lastLogin: { $gte: startDate }
    };

    if (userId) {
      filter._id = userId;
    }

    // Get active users in timeframe
    const activeUsers = await User.find(filter)
      .select('email userType lastLogin createdAt isActive')
      .sort({ lastLogin: -1 });

    // Get login statistics
    const loginStats = {
      totalLogins: activeUsers.length,
      uniqueUsers: new Set(activeUsers.map(u => u._id.toString())).size,
      donorLogins: activeUsers.filter(u => u.userType === 'donor').length,
      hospitalLogins: activeUsers.filter(u => u.userType === 'hospital').length
    };

    // Get hourly breakdown for last 24h if timeframe is 24h
    let hourlyBreakdown = [];
    if (timeframe === '24h') {
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourEnd = new Date(Date.now() - (i - 1) * 60 * 60 * 1000);
        
        const hourlyLogins = activeUsers.filter(u => 
          u.lastLogin >= hourStart && u.lastLogin < hourEnd
        ).length;
        
        hourlyBreakdown.push({
          hour: hourStart.getHours(),
          logins: hourlyLogins
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        activeUsers,
        stats: loginStats,
        hourlyBreakdown
      }
    });

  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user activity'
    });
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log admin action
    logger.info('Admin updated user status', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      targetUserId: userId,
      targetUserEmail: user.email,
      action: isActive ? 'activate' : 'deactivate',
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });

  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating user status'
    });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true }),
        donors: await User.countDocuments({ userType: 'donor' }),
        hospitals: await User.countDocuments({ userType: 'hospital' }),
        newToday: await User.countDocuments({ createdAt: { $gte: last24h } }),
        newThisWeek: await User.countDocuments({ createdAt: { $gte: last7d } }),
        newThisMonth: await User.countDocuments({ createdAt: { $gte: last30d } })
      },
      activity: {
        activeToday: await User.countDocuments({ lastLogin: { $gte: last24h } }),
        activeThisWeek: await User.countDocuments({ lastLogin: { $gte: last7d } }),
        activeThisMonth: await User.countDocuments({ lastLogin: { $gte: last30d } })
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching system statistics'
    });
  }
};

// Get user details by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user details'
    });
  }
};

// Delete user (soft delete by deactivating)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log admin action
    logger.warn('Admin deleted user', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      deletedUserId: userId,
      deletedUserEmail: user.email,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting user'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserActivity,
  updateUserStatus,
  getSystemStats,
  getUserById,
  deleteUser
};
