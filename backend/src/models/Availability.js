const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillListing', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

availabilitySchema.index({ skill: 1, start: 1 }, { unique: true });
availabilitySchema.index({ teacher: 1, start: 1, end: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
