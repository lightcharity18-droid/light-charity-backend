const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  scheduleDonation,
  getMyDonations,
  getDonationById,
  cancelDonation,
  getAllDonations,
  updateDonationStatus,
  getDonationStats
} = require('../controllers/donation.controller');

// Import middleware
const { authenticate } = require('../middleware/auth');

// Validation middleware
const validateScheduleDonation = [
  body('bloodGroup')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
  body('location')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  body('healthConfirmed')
    .isBoolean()
    .withMessage('Health confirmation must be a boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('Health confirmation is required');
      }
      return true;
    })
];

const validateUpdateStatus = [
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid status'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must not exceed 1000 characters'),
  body('unitsDonated')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Units donated must be between 0 and 10'),
  body('actualDonationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

// Public routes (if any)
// Currently all routes require authentication

// Protected routes (require authentication)
router.use(authenticate);

// @route   POST /api/donations/schedule
// @desc    Schedule a new blood donation
// @access  Private
router.post('/schedule', validateScheduleDonation, scheduleDonation);

// @route   GET /api/donations/my-donations
// @desc    Get user's donation history
// @access  Private
router.get('/my-donations', getMyDonations);

// @route   GET /api/donations/:id
// @desc    Get specific donation by ID
// @access  Private
router.get('/:id', getDonationById);

// @route   PUT /api/donations/:id/cancel
// @desc    Cancel a scheduled donation
// @access  Private
router.put('/:id/cancel', cancelDonation);

// Admin routes (these should ideally have admin role verification)
// For now, we'll use authentication only

// @route   GET /api/donations
// @desc    Get all donations (admin)
// @access  Private (admin)
router.get('/', getAllDonations);

// @route   PUT /api/donations/:id/status
// @desc    Update donation status (admin)
// @access  Private (admin)
router.put('/:id/status', validateUpdateStatus, updateDonationStatus);

// @route   GET /api/donations/stats
// @desc    Get donation statistics (admin)
// @access  Private (admin)
router.get('/stats', getDonationStats);

module.exports = router; 