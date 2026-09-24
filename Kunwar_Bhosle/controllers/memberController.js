const mongoose = require('mongoose');
const User = require('../models/User');

// PATCH /api/members/:id/renew - Renew / extend membership expiry date
exports.renewMembership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { additionalMonths, tier } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Member ID format'
      });
    }

    if (!additionalMonths || typeof additionalMonths !== 'number' || additionalMonths <= 0) {
      return res.status(400).json({
        success: false,
        message: 'additionalMonths must be a positive number'
      });
    }

    const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    if (tier && !validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      });
    }

    const member = await User.findById(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const now = new Date();
    // If expired, extend from today; if still active, extend from current expiry date
    let baseDate = (member.membershipExpiryDate && new Date(member.membershipExpiryDate) > now)
      ? new Date(member.membershipExpiryDate)
      : now;

    const newExpiry = new Date(baseDate.getTime() + additionalMonths * 30 * 24 * 60 * 60 * 1000);

    member.membershipExpiryDate = newExpiry;
    member.membershipStatus = 'active';

    if (tier) {
      member.membershipTier = tier;
    }

    await member.save();

    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      data: member
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/members/expired - Get list of all expired memberships
exports.getExpiredMemberships = async (req, res, next) => {
  try {
    const expiredMembers = await User.find({
      membershipExpiryDate: { $lt: new Date() }
    }).select('-password');

    res.status(200).json({
      success: true,
      data: expiredMembers
    });
  } catch (error) {
    next(error);
  }
};
