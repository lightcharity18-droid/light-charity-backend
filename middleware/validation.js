const { body, param } = require('express-validator');

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .toLowerCase()
  .trim()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

const phoneValidation = body('phone')
  .isMobilePhone()
  .withMessage('Please provide a valid phone number');

const postalCodeValidation = body('postalCode')
  .isLength({ min: 3, max: 10 })
  .withMessage('Postal code must be between 3 and 10 characters');

// Login validation
const validateLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value')
];

// Signup validation for donors
const validateDonorSignup = [
  body('userType')
    .equals('donor')
    .withMessage('User type must be donor'),
  emailValidation,
  passwordValidation,
  body('firstName')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  phoneValidation,
  body('dateOfBirth')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 16) {
        throw new Error('You must be at least 16 years old to register');
      }
      if (age > 80) {
        throw new Error('Age cannot exceed 80 years');
      }
      return true;
    }),
  postalCodeValidation,
  body('donorNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Donor number must be between 5 and 20 characters')
];

// Signup validation for hospitals
const validateHospitalSignup = [
  body('userType')
    .equals('hospital')
    .withMessage('User type must be hospital'),
  emailValidation,
  passwordValidation,
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Hospital/Blood bank name must be between 2 and 100 characters'),
  phoneValidation,
  body('address')
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  postalCodeValidation,
  body('hospitalType')
    .optional()
    .isIn(['hospital', 'blood_bank', 'clinic'])
    .withMessage('Hospital type must be hospital, blood_bank, or clinic')
];

// Combined signup validation
const validateSignup = [
  body('userType')
    .isIn(['donor', 'hospital'])
    .withMessage('User type must be either donor or hospital'),
  emailValidation,
  passwordValidation,
  phoneValidation,
  postalCodeValidation,
  // Donor-specific fields
  body('firstName')
    .if(body('userType').equals('donor'))
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .if(body('userType').equals('donor'))
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('dateOfBirth')
    .if(body('userType').equals('donor'))
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 16) {
        throw new Error('You must be at least 16 years old to register');
      }
      if (age > 80) {
        throw new Error('Age cannot exceed 80 years');
      }
      return true;
    }),
  body('donorNumber')
    .if(body('userType').equals('donor'))
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Donor number must be between 5 and 20 characters'),
  // Hospital-specific fields
  body('name')
    .if(body('userType').equals('hospital'))
    .isLength({ min: 2, max: 100 })
    .withMessage('Hospital/Blood bank name must be between 2 and 100 characters'),
  body('address')
    .if(body('userType').equals('hospital'))
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('hospitalType')
    .if(body('userType').equals('hospital'))
    .optional()
    .isIn(['hospital', 'blood_bank', 'clinic'])
    .withMessage('Hospital type must be hospital, blood_bank, or clinic')
];

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Hospital/Blood bank name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('postalCode')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Postal code must be between 3 and 10 characters'),
  body('donorNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Donor number must be between 5 and 20 characters'),
  body('bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-')
];

// Change password validation
const validateChangePassword = [
  body('currentPassword')
    .optional()
    .custom((value, { req }) => {
      // If currentPassword is provided, it should not be empty
      if (value !== undefined && value === '') {
        throw new Error('Current password cannot be empty if provided');
      }
      return true;
    }),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      // Only check if current password is different if current password is provided
      if (req.body.currentPassword && value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Forgot password validation
const validateForgotPassword = [
  emailValidation
];

// Reset password validation
const validateResetPassword = [
  param('token')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Refresh token validation
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Community validation
const validateCommunityCreation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Community name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),
  body('category')
    .isIn(['blood_donation', 'health_awareness', 'volunteer', 'general', 'emergency'])
    .withMessage('Invalid category'),
  body('type')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Type must be either public or private'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const validateCommunityUpdate = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Community name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),
  body('category')
    .optional()
    .isIn(['blood_donation', 'health_awareness', 'volunteer', 'general', 'emergency'])
    .withMessage('Invalid category'),
  body('type')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Type must be either public or private'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

// Message validation
const validateMessageSend = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .trim(),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Reply to must be a valid message ID')
];

const validateMessageEdit = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .trim()
];

const validateReaction = [
  body('emoji')
    .isIn(['👍', '❤️', '😊', '😮', '😢', '😡'])
    .withMessage('Invalid emoji reaction')
];

module.exports = {
  validateLogin,
  validateSignup,
  validateDonorSignup,
  validateHospitalSignup,
  validateProfileUpdate,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  validateCommunityCreation,
  validateCommunityUpdate,
  validateMessageSend,
  validateMessageEdit,
  validateReaction
}; 