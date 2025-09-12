const express = require('express');
const router = express.Router();
const donationCenterController = require('../controllers/donationCenter.controller');
const { authenticate, requireHospital } = require('../middleware/auth');

// Public routes
router.get('/', donationCenterController.getAllCenters);
router.get('/:id', donationCenterController.getCenterById);

// Google Places API routes
router.get('/places/search', donationCenterController.searchPlaces);
router.get('/places/details', donationCenterController.getPlaceDetails);
router.post('/places/autocomplete', donationCenterController.autocompletePlaces);

// Route calculation routes
router.post('/routes/calculate', donationCenterController.calculateRoute);
router.post('/routes/multiple', donationCenterController.calculateMultipleRoutes);

// Admin routes (protected - only hospitals can manage donation centers)
router.post('/', authenticate, requireHospital, donationCenterController.createCenter);
router.put('/:id', authenticate, requireHospital, donationCenterController.updateCenter);
router.delete('/:id', authenticate, requireHospital, donationCenterController.deleteCenter);

module.exports = router;