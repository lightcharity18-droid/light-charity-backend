const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../services/email.service');
const logger = require('../services/logger.service');

// Validation middleware
const validatePartnershipForm = [
  body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
  body('website').optional().trim().isURL().withMessage('Please enter a valid URL'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('cityProvinceCountry').trim().notEmpty().withMessage('City/Province/Country is required'),
  body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address'),
  body('partnershipTypes').isArray().notEmpty().withMessage('Please select at least one partnership type'),
  body('goals').trim().isLength({ min: 50 }).withMessage('Please provide more detail about your goals'),
  body('alignedCauses').trim().isLength({ min: 50 }).withMessage('Please provide more detail about aligned causes'),
  body('contributionTypes').isArray().notEmpty().withMessage('Please select at least one contribution type'),
  body('duration').isIn(['one-time', '6-months', '1-year', 'ongoing']).withMessage('Invalid duration selected'),
  body('authorization').isBoolean().equals('true').withMessage('Authorization is required'),
];

// Submit partnership application
router.post('/', validatePartnershipForm, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const formData = req.body;

    // Log the partnership application
    logger.info('New partnership application received', {
      organization: formData.organizationName,
      email: formData.email,
    });

    // Send email notification to admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New Partnership Application Received',
      html: `
        <h2>New Partnership Application</h2>
        <p><strong>Organization:</strong> ${formData.organizationName}</p>
        <p><strong>Contact:</strong> ${formData.contactPerson}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Partnership Types:</strong> ${formData.partnershipTypes.join(', ')}</p>
        <p><strong>Duration:</strong> ${formData.duration}</p>
        <h3>Goals</h3>
        <p>${formData.goals}</p>
        <h3>Aligned Causes</h3>
        <p>${formData.alignedCauses}</p>
      `,
    });

    // Send confirmation email to applicant
    await sendEmail({
      to: formData.email,
      subject: 'Partnership Application Received - LightCharity',
      html: `
        <h2>Thank you for your interest in partnering with LightCharity!</h2>
        <p>We have received your partnership application and will review it shortly. Our team will contact you within 3-5 business days to discuss the next steps.</p>
        <p>If you have any immediate questions, please don't hesitate to contact us at partnerships@lightcharity.org.</p>
        <br>
        <p>Best regards,</p>
        <p>The LightCharity Team</p>
      `,
    });

    res.status(200).json({
      message: 'Partnership application submitted successfully',
    });
  } catch (error) {
    logger.error('Error processing partnership application', { error });
    res.status(500).json({
      message: 'Failed to process partnership application',
      error: error.message,
    });
  }
});

module.exports = router;
