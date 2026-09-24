const checkActiveMember = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please log in.'
    });
  }

  const isExpired = req.user.membershipExpiryDate ? new Date(req.user.membershipExpiryDate) < new Date() : true;
  if (req.user.membershipStatus !== 'active' || isExpired) {
    return res.status(400).json({
      success: false,
      message: 'Membership is expired or inactive'
    });
  }

  next();
};

module.exports = { checkActiveMember };
