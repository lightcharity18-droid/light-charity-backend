const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const emailService = require('../services/email.service');

// Register a new user (both donor and hospital)
const signup = async (req, res) => {
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

    const { userType, email, password, phone, postalCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    let userData = {
      email,
      password,
      phone,
      postalCode,
      userType
    };

    // Add type-specific fields
    if (userType === 'donor') {
      const { firstName, lastName, dateOfBirth, donorNumber } = req.body;
      userData = {
        ...userData,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        donorNumber: donorNumber || undefined
      };
    } else if (userType === 'hospital') {
      const { name, address, hospitalType = 'hospital' } = req.body;
      userData = {
        ...userData,
        name,
        address,
        hospitalType
      };
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    await user.updateLastLogin();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
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

    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokenExpiry = rememberMe ? '30d' : '7d';
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    await user.updateLastLogin();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// Refresh access token
const refreshAccessToken = async (req, res) => {
  try {
    // User is already attached by refreshToken middleware
    const user = req.user;

    // Generate new access token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user; // Attached by authenticate middleware

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
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

    const userId = req.user._id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.userType;
    delete updates.isActive;
    delete updates.isEmailVerified;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while changing password'
    });
  }
};

// Initiate password reset
const forgotPassword = async (req, res) => {
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

    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL for frontend
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    try {
      // Send password reset email
      await emailService.sendPasswordResetEmail(email, resetToken, resetURL);
      
      console.log('Password reset email sent to:', email);

      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to email',
        // Remove this in production
        ...(process.env.NODE_ENV === 'development' && { resetToken, resetURL })
      });

    } catch (emailError) {
      // Reset the user's password reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Failed to send password reset email:', emailError);
      
      return res.status(500).json({
        success: false,
        message: 'There was an error sending the email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing password reset'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
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

    const { token } = req.params;
    const { password } = req.body;

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate new tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        token: accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resetting password'
    });
  }
};

// Logout (client-side token removal, but we can blacklist tokens if needed)
const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return success as the client will remove the token
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
};

// Deactivate account
const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deactivating account'
    });
  }
};

module.exports = {
  signup,
  login,
  refreshAccessToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  deactivateAccount
}; 