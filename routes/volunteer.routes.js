const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
    submitApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    getVolunteerStats
} = require('../controllers/volunteer.controller');

// Validation middleware for volunteer application
const validateVolunteerApplication = [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('First name can only contain letters and spaces'),
    
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Last name can only contain letters and spaces'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('phone')
        .trim()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    
    body('interests')
        .optional()
        .isArray()
        .withMessage('Interests must be an array')
        .custom((value) => {
            const validInterests = ['Event Support', 'Office Support', 'Outreach', 'Logistics', 'Donor Relations', 'Marketing'];
            if (Array.isArray(value)) {
                const invalidInterests = value.filter(interest => !validInterests.includes(interest));
                if (invalidInterests.length > 0) {
                    throw new Error(`Invalid interests: ${invalidInterests.join(', ')}`);
                }
            }
            return true;
        }),
    
    body('availability')
        .optional()
        .isArray()
        .withMessage('Availability must be an array')
        .custom((value) => {
            const validAvailability = ['Weekdays', 'Weekends', 'Mornings', 'Afternoons', 'Evenings'];
            if (Array.isArray(value)) {
                const invalidAvailability = value.filter(avail => !validAvailability.includes(avail));
                if (invalidAvailability.length > 0) {
                    throw new Error(`Invalid availability options: ${invalidAvailability.join(', ')}`);
                }
            }
            return true;
        }),
    
    body('message')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message must not exceed 1000 characters')
];

// Public routes
router.post('/apply', validateVolunteerApplication, submitApplication);

// Admin routes (you might want to add authentication middleware here)
router.get('/applications', getAllApplications);
router.get('/applications/stats', getVolunteerStats);
router.get('/applications/:id', getApplicationById);
router.put('/applications/:id/status', updateApplicationStatus);

module.exports = router; 