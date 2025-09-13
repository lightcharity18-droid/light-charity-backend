const express = require('express');
const router = express.Router();
const {
  registerOrganDonation,
  getUserOrganDonation,
  updateOrganDonation,
  cancelOrganDonation,
  getAllOrganDonations,
  getOrganDonationStats,
  getActiveOrganDonors
} = require('../controllers/organDonation.controller');
const { authenticate } = require('../middleware/auth');

// User routes (require authentication)
router.post('/register', authenticate, registerOrganDonation);
router.get('/my-registration', authenticate, getUserOrganDonation);
router.put('/update', authenticate, updateOrganDonation);
router.put('/cancel', authenticate, cancelOrganDonation);

// Admin routes (require authentication and admin role)
router.get('/all', authenticate, getAllOrganDonations);
router.get('/stats', authenticate, getOrganDonationStats);
router.get('/active-donors', authenticate, getActiveOrganDonors);

module.exports = router;
