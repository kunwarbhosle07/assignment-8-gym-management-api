const mongoose = require('mongoose');
const FitnessClass = require('../models/FitnessClass');

// GET /api/classes - Fetch all upcoming classes (scheduleDate >= now)
exports.getUpcomingClasses = async (req, res, next) => {
  try {
    const filter = {
      scheduleDate: { $gte: new Date() }
    };

    if (req.query.trainer) {
      filter.trainerName = new RegExp(req.query.trainer, 'i');
    }

    const classes = await FitnessClass.find(filter).sort({ scheduleDate: 1 });

    res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/classes/:id - Get class details with enrolled members list
exports.getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id).populate(
      'enrolledMembers',
      'username email membershipTier'
    );

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    res.status(200).json({
      success: true,
      data: fitnessClass
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/classes - Create a new workout class
exports.createClass = async (req, res, next) => {
  try {
    const { title, trainerName, scheduleDate, durationMinutes, maxCapacity } = req.body;

    if (!title || !trainerName || !scheduleDate || maxCapacity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, trainerName, scheduleDate, and maxCapacity are required'
      });
    }

    const parsedDate = new Date(scheduleDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduleDate'
      });
    }

    if (Number(maxCapacity) < 1) {
      return res.status(400).json({
        success: false,
        message: 'maxCapacity must be at least 1'
      });
    }

    const fitnessClass = new FitnessClass({
      title,
      trainerName,
      scheduleDate: parsedDate,
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : 60,
      maxCapacity: Number(maxCapacity),
      enrolledMembers: []
    });

    await fitnessClass.save();

    res.status(201).json({
      success: true,
      message: 'Fitness class created successfully',
      data: fitnessClass
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// POST /api/classes/:id/book - Enroll logged-in user
exports.bookClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    // Check if user is already enrolled
    const isEnrolled = fitnessClass.enrolledMembers.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'User is already enrolled in this class'
      });
    }

    // Check capacity constraint
    if (fitnessClass.enrolledMembers.length >= fitnessClass.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Class capacity reached'
      });
    }

    // Atomic update to avoid race conditions
    const updatedClass = await FitnessClass.findOneAndUpdate(
      {
        _id: id,
        enrolledMembers: { $ne: userId },
        $expr: { $lt: [{ $size: '$enrolledMembers' }, '$maxCapacity'] }
      },
      { $push: { enrolledMembers: userId } },
      { new: true }
    ).populate('enrolledMembers', 'username email membershipTier');

    if (!updatedClass) {
      return res.status(400).json({
        success: false,
        message: 'Class capacity reached'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in class',
      data: updatedClass
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/classes/:id/cancel - Cancel member booking from class
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    const fitnessClass = await FitnessClass.findById(id);

    if (!fitnessClass) {
      return res.status(404).json({
        success: false,
        message: 'Fitness class not found'
      });
    }

    const isEnrolled = fitnessClass.enrolledMembers.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'User is not enrolled in this class'
      });
    }

    fitnessClass.enrolledMembers = fitnessClass.enrolledMembers.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );

    await fitnessClass.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: fitnessClass
    });
  } catch (error) {
    next(error);
  }
};
