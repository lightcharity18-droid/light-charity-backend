const express = require('express');
const router = express.Router();

// Import controllers
const {
  signup,
  login,
  refreshAccessToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  deactivateAccount,
  googleAuth
} = require('../controllers/auth.controller');

// Import middleware
const { authenticate, refreshToken } = require('../middleware/auth');
const {
  validateLogin,
  validateSignup,
  validateProfileUpdate,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken
} = require('../middleware/validation');

// Public routes (no authentication required)

// @route   POST /api/auth/signup
// @desc    Register a new user (donor or hospital)
// @access  Public
router.post('/signup', validateSignup, signup);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/google
// @desc    Google OAuth authentication
// @access  Public
router.post('/google', googleAuth);

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh-token', validateRefreshToken, refreshToken, refreshAccessToken);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using reset token
// @access  Public
router.post('/reset-password/:token', validateResetPassword, resetPassword);

// Protected routes (authentication required)

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, validateProfileUpdate, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, validateChangePassword, changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user (mainly for client-side cleanup)
// @access  Private
router.post('/logout', authenticate, logout);

// @route   PUT /api/auth/deactivate
// @desc    Deactivate user account
// @access  Private
router.put('/deactivate', authenticate, deactivateAccount);

// Health check route
// @route   GET /api/auth/health
// @desc    Check if auth service is running
// @access  Public
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 