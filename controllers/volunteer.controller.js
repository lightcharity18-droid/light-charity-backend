const Volunteer = require('../models/volunteer.model');
const { validationResult } = require('express-validator');

// Submit volunteer application
const submitApplication = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { firstName, lastName, email, phone, interests, availability, message } = req.body;

        // Check if email already exists
        const existingApplication = await Volunteer.findOne({ email });
        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'An application with this email already exists'
            });
        }

        // Create new volunteer application
        const volunteerApplication = new Volunteer({
            firstName,
            lastName,
            email,
            phone,
            interests: interests || [],
            availability: availability || [],
            message
        });

        await volunteerApplication.save();

        res.status(201).json({
            success: true,
            message: 'Volunteer application submitted successfully',
            data: {
                id: volunteerApplication._id,
                firstName: volunteerApplication.firstName,
                lastName: volunteerApplication.lastName,
                email: volunteerApplication.email,
                applicationDate: volunteerApplication.applicationDate
            }
        });

    } catch (error) {
        console.error('Error submitting volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get all volunteer applications (for admin)
const getAllApplications = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        if (status) {
            query.status = status;
        }

        const applications = await Volunteer.find(query)
            .sort({ applicationDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v');

        const total = await Volunteer.countDocuments(query);

        res.json({
            success: true,
            data: applications,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalApplications: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching volunteer applications:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get single volunteer application by ID
const getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Volunteer.findById(id).select('-__v');
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer application not found'
            });
        }

        res.json({
            success: true,
            data: application
        });

    } catch (error) {
        console.error('Error fetching volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update volunteer application status
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['pending', 'contacted', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const updateData = { status };
        if (notes) updateData.notes = notes;
        if (status === 'contacted') updateData.contactedDate = new Date();

        const application = await Volunteer.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Volunteer application not found'
            });
        }

        res.json({
            success: true,
            message: 'Application status updated successfully',
            data: application
        });

    } catch (error) {
        console.error('Error updating volunteer application:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get volunteer statistics
const getVolunteerStats = async (req, res) => {
    try {
        const stats = await Volunteer.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalApplications = await Volunteer.countDocuments();
        const thisMonthApplications = await Volunteer.countDocuments({
            applicationDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        });

        const statusCounts = {};
        stats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
        });

        res.json({
            success: true,
            data: {
                total: totalApplications,
                thisMonth: thisMonthApplications,
                pending: statusCounts.pending || 0,
                contacted: statusCounts.contacted || 0,
                approved: statusCounts.approved || 0,
                rejected: statusCounts.rejected || 0
            }
        });

    } catch (error) {
        console.error('Error fetching volunteer statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    submitApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    getVolunteerStats
}; 