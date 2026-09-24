const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  membershipTier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'expired', 'frozen'],
    default: 'active'
  },
  membershipExpiryDate: { type: Date, required: true },
  emergencyContact: { type: String }
}, { timestamps: true });

// Virtual setter and getter for transient durationMonths property
userSchema.virtual('durationMonths')
  .set(function(val) {
    this._durationMonths = Number(val) || 1;
  })
  .get(function() {
    return this._durationMonths || 1;
  });

// Pre-validate hook for automatic expiry date calculation on new user creation (1 month = 30 days)
userSchema.pre('validate', function(next) {
  if (this.isNew && !this.membershipExpiryDate) {
    const months = this._durationMonths || 1;
    const now = new Date();
    this.membershipExpiryDate = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Helper instance method to calculate remaining days
userSchema.methods.getRemainingDays = function() {
  const now = new Date();
  if (!this.membershipExpiryDate || this.membershipExpiryDate < now) {
    return 0;
  }
  const diffTime = this.membershipExpiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper instance method to check if membership is expired
userSchema.methods.isExpired = function() {
  return !this.membershipExpiryDate || this.membershipExpiryDate < new Date();
};

// Ensure password is never included in JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
