const OrganDonation = require('../models/organDonation.model');
const User = require('../models/User');

// Register for organ donation
const registerOrganDonation = async (req, res) => {
  try {
    const {
      organsToDonate,
      registrationDate,
      location,
      notes,
      medicalHistory,
      healthConfirmed,
      familyConsent,
      emergencyContact,
      bloodType
    } = req.body;

    const donorId = req.user.id;

    // Validate required fields
    if (!organsToDonate || organsToDonate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one organ must be selected for donation'
      });
    }

    if (!registrationDate) {
      return res.status(400).json({
        success: false,
        message: 'Registration date is required'
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }

    if (!healthConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Health confirmation is required'
      });
    }

    if (!familyConsent) {
      return res.status(400).json({
        success: false,
        message: 'Family consent is required'
      });
    }

    // Check if user already has an organ donation registration
    const existingRegistration = await OrganDonation.findOne({ 
      donorId, 
      status: { $in: ['registered', 'active'] } 
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active organ donation registration'
      });
    }

    // Get user information
    const user = await User.findById(donorId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create organ donation registration
    const organDonation = new OrganDonation({
      donorId,
      organsToDonate,
      registrationDate: new Date(registrationDate),
      location,
      notes,
      medicalHistory,
      healthConfirmed,
      familyConsent,
      emergencyContact,
      bloodType,
      contactPhone: user.phone,
      contactEmail: user.email,
      status: 'registered'
    });

    await organDonation.save();

    // Populate donor information for response
    await organDonation.populate('donorId', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Organ donation registration successful',
      data: organDonation
    });

  } catch (error) {
    console.error('Error registering organ donation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's organ donation registration
const getUserOrganDonation = async (req, res) => {
  try {
    const donorId = req.user.id;

    const organDonation = await OrganDonation.findOne({ donorId })
      .populate('donorId', 'firstName lastName email phone');

    if (!organDonation) {
      return res.status(404).json({
        success: false,
        message: 'No organ donation registration found'
      });
    }

    res.status(200).json({
      success: true,
      data: organDonation
    });

  } catch (error) {
    console.error('Error fetching organ donation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update organ donation registration
const updateOrganDonation = async (req, res) => {
  try {
    const donorId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.donorId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Update lastUpdated field
    updateData.lastUpdated = new Date();

    const organDonation = await OrganDonation.findOneAndUpdate(
      { donorId },
      updateData,
      { new: true, runValidators: true }
    ).populate('donorId', 'firstName lastName email phone');

    if (!organDonation) {
      return res.status(404).json({
        success: false,
        message: 'No organ donation registration found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Organ donation registration updated successfully',
      data: organDonation
    });

  } catch (error) {
    console.error('Error updating organ donation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Cancel organ donation registration
const cancelOrganDonation = async (req, res) => {
  try {
    const donorId = req.user.id;

    const organDonation = await OrganDonation.findOneAndUpdate(
      { donorId, status: { $in: ['registered', 'active'] } },
      { 
        status: 'cancelled',
        lastUpdated: new Date()
      },
      { new: true }
    ).populate('donorId', 'firstName lastName email phone');

    if (!organDonation) {
      return res.status(404).json({
        success: false,
        message: 'No active organ donation registration found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Organ donation registration cancelled successfully',
      data: organDonation
    });

  } catch (error) {
    console.error('Error cancelling organ donation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all organ donations (admin only)
const getAllOrganDonations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, organType } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (organType) {
      filter.organsToDonate = organType;
    }

    const organDonations = await OrganDonation.find(filter)
      .populate('donorId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OrganDonation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: organDonations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching organ donations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get organ donation statistics (admin only)
const getOrganDonationStats = async (req, res) => {
  try {
    const [statusStats, organTypeStats, totalCount] = await Promise.all([
      OrganDonation.getOrganDonationStats(),
      OrganDonation.getOrganTypeStats(),
      OrganDonation.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations: totalCount,
        statusBreakdown: statusStats,
        organTypeBreakdown: organTypeStats
      }
    });

  } catch (error) {
    console.error('Error fetching organ donation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get active organ donors (admin only)
const getActiveOrganDonors = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const activeDonors = await OrganDonation.getActiveDonors(parseInt(limit));

    res.status(200).json({
      success: true,
      data: activeDonors
    });

  } catch (error) {
    console.error('Error fetching active organ donors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  registerOrganDonation,
  getUserOrganDonation,
  updateOrganDonation,
  cancelOrganDonation,
  getAllOrganDonations,
  getOrganDonationStats,
  getActiveOrganDonors
};
