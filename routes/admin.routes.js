const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserActivity,
  updateUserStatus,
  getSystemStats,
  getUserById,
  deleteUser
} = require('../controllers/admin.controller');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin privileges
  // For now, we'll use email-based admin check
  // In production, you should add an 'isAdmin' field to User model
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  console.log(adminEmails);
  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Apply rate limiting and authentication to all admin routes
router.use(apiLimiter);
router.use(authenticate);
router.use(requireAdmin);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Admin only
router.get('/users', getAllUsers);

// @route   GET /api/admin/users/:userId
// @desc    Get user details by ID
// @access  Admin only
router.get('/users/:userId', getUserById);

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status (activate/deactivate)
// @access  Admin only
router.put('/users/:userId/status', updateUserStatus);

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user (soft delete)
// @access  Admin only
router.delete('/users/:userId', deleteUser);

// @route   GET /api/admin/activity
// @desc    Get user activity and analytics
// @access  Admin only
router.get('/activity', getUserActivity);

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Admin only
router.get('/stats', getSystemStats);

// Health check route
// @route   GET /api/admin/health
// @desc    Check if admin service is running
// @access  Admin only
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin service is running',
    admin: {
      id: req.user._id,
      email: req.user.email
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
