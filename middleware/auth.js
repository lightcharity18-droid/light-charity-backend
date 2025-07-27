const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-here',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Middleware to protect routes
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
      
      // Find user and attach to request
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user not found.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated.'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Middleware to check if user is a donor
const requireDonor = (req, res, next) => {
  if (req.user && req.user.userType === 'donor') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Donor account required.'
    });
  }
};

// Middleware to check if user is a hospital
const requireHospital = (req, res, next) => {
  if (req.user && req.user.userType === 'hospital') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Hospital/Blood bank account required.'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (jwtError) {
        // Token is invalid or expired, but we continue without user
        console.log('Optional auth failed:', jwtError.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here'
      );

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token type.'
        });
      }

      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive.'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh.'
    });
  }
};

module.exports = {
  authenticate,
  requireDonor,
  requireHospital,
  optionalAuth,
  refreshToken,
  generateToken,
  generateRefreshToken
}; 