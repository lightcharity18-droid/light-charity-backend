const Donation = require('../models/donation.model');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Schedule a new blood donation
// @route   POST /api/donations/schedule
// @access  Private (authenticated users)
const scheduleDonation = async (req, res) => {
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

    const {
      bloodGroup,
      scheduledDate,
      location,
      notes,
      healthConfirmed
    } = req.body;

    // Get user ID from authenticated request
    const donorId = req.user.id;

    // Verify user exists and is a donor
    const user = await User.findById(donorId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.userType !== 'donor') {
      return res.status(403).json({
        success: false,
        message: 'Only donors can schedule donations'
      });
    }

    // Check if user has a recent donation (within 56 days)
    const recentDonation = await Donation.findOne({
      donorId,
      status: { $in: ['completed', 'scheduled', 'confirmed'] },
      scheduledDate: { $gte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) }
    });

    if (recentDonation) {
      return res.status(400).json({
        success: false,
        message: 'You must wait at least 56 days between donations'
      });
    }

    // Create new donation record
    const donation = new Donation({
      donorId,
      bloodGroup,
      scheduledDate: new Date(scheduledDate),
      location,
      notes,
      healthConfirmed,
      contactPhone: user.phone,
      contactEmail: user.email
    });

    await donation.save();

    // Populate donor information for response
    await donation.populate('donorId', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Donation scheduled successfully',
      data: {
        id: donation._id,
        bloodGroup: donation.bloodGroup,
        scheduledDate: donation.scheduledDate,
        location: donation.location,
        status: donation.status,
        donorName: `${user.firstName} ${user.lastName}`
      }
    });

  } catch (error) {
    console.error('Error scheduling donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule donation',
      error: error.message
    });
  }
};

// @desc    Get user's donation history
// @route   GET /api/donations/my-donations
// @access  Private
const getMyDonations = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { donorId };
    if (status) {
      query.status = status;
    }

    const donations = await Donation.find(query)
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('donorId', 'firstName lastName email phone');

    const total = await Donation.countDocuments(query);

    res.json({
      success: true,
      data: {
        donations,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });

  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
};

// @desc    Get donation by ID
// @route   GET /api/donations/:id
// @access  Private
const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.user.id;

    const donation = await Donation.findOne({ _id: id, donorId })
      .populate('donorId', 'firstName lastName email phone');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    res.json({
      success: true,
      data: donation
    });

  } catch (error) {
    console.error('Error fetching donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation',
      error: error.message
    });
  }
};

// @desc    Cancel a scheduled donation
// @route   PUT /api/donations/:id/cancel
// @access  Private
const cancelDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.user.id;

    const donation = await Donation.findOne({ _id: id, donorId });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed donation'
      });
    }

    if (donation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Donation is already cancelled'
      });
    }

    donation.status = 'cancelled';
    await donation.save();

    res.json({
      success: true,
      message: 'Donation cancelled successfully',
      data: donation
    });

  } catch (error) {
    console.error('Error cancelling donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel donation',
      error: error.message
    });
  }
};

// @desc    Get all donations (admin only)
// @route   GET /api/donations
// @access  Private (admin)
const getAllDonations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, bloodGroup, startDate, endDate } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const donations = await Donation.find(query)
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('donorId', 'firstName lastName email phone');

    const total = await Donation.countDocuments(query);

    res.json({
      success: true,
      data: {
        donations,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching all donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
};

// @desc    Update donation status (admin only)
// @route   PUT /api/donations/:id/status
// @access  Private (admin)
const updateDonationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, unitsDonated, actualDonationDate } = req.body;

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Update fields
    if (status) donation.status = status;
    if (adminNotes !== undefined) donation.adminNotes = adminNotes;
    if (unitsDonated !== undefined) donation.unitsDonated = unitsDonated;
    if (actualDonationDate) donation.actualDonationDate = new Date(actualDonationDate);

    await donation.save();

    // If donation is completed, update user's donation history
    if (status === 'completed' && unitsDonated > 0) {
      await User.findByIdAndUpdate(donation.donorId, {
        $push: {
          donationHistory: {
            date: donation.actualDonationDate || donation.scheduledDate,
            location: donation.location,
            bloodType: donation.bloodGroup,
            quantity: donation.unitsDonated
          }
        }
      });
    }

    await donation.populate('donorId', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Donation status updated successfully',
      data: donation
    });

  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donation status',
      error: error.message
    });
  }
};

// @desc    Get donation statistics
// @route   GET /api/donations/stats
// @access  Private (admin)
const getDonationStats = async (req, res) => {
  try {
    const stats = await Donation.getDonationStats();
    
    // Get upcoming donations count
    const upcomingCount = await Donation.countDocuments({
      scheduledDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Get total donations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyCount = await Donation.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      data: {
        statusBreakdown: stats,
        upcomingDonations: upcomingCount,
        monthlyDonations: monthlyCount
      }
    });

  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation statistics',
      error: error.message
    });
  }
};

module.exports = {
  scheduleDonation,
  getMyDonations,
  getDonationById,
  cancelDonation,
  getAllDonations,
  updateDonationStatus,
  getDonationStats
}; 