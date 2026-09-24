const mongoose = require('mongoose');

const fitnessClassSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true }, // e.g., "HIIT Bootcamp", "Yoga Flow"
  trainerName: { type: String, required: true },
  scheduleDate: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, default: 60 },
  maxCapacity: { type: Number, required: true, min: 1 },
  enrolledMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('FitnessClass', fitnessClassSchema);
