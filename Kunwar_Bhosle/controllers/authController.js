const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');

// Register new member
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, membershipTier, durationMonths, emergencyContact } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    const trimmedUsername = String(username).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already in use'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user instance
    const user = new User({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword,
      membershipTier: membershipTier || 'Bronze',
      emergencyContact
    });

    // Set virtual durationMonths so pre-validate hook computes membershipExpiryDate
    user.durationMonths = durationMonths !== undefined ? Number(durationMonths) : 1;

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      data: user
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

// Login member
exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info && info.message ? info.message : 'Invalid credentials'
      });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: user
      });
    });
  })(req, res, next);
};

// Fetch profile of active member
exports.getMe = async (req, res, next) => {
  try {
    // Re-fetch user to ensure up-to-date data
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const userObj = user.toObject();
    delete userObj.password;

    const remainingDays = user.getRemainingDays ? user.getRemainingDays() : 0;
    const isExpired = user.isExpired ? user.isExpired() : (user.membershipExpiryDate < new Date());

    res.status(200).json({
      success: true,
      data: {
        ...userObj,
        remainingDays,
        membershipStatus: isExpired ? 'expired' : user.membershipStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout member
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
};
