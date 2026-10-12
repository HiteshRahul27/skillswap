const mongoose = require('mongoose');

const CATEGORIES = ['Programming', 'Design', 'Languages', 'Mathematics', 'Science', 'Music', 'Business', 'Writing', 'Study Skills', 'Other'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const skillSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 1500 },
    level: { type: String, enum: LEVELS, required: true },
    outcomes: { type: [{ type: String, trim: true, maxlength: 140 }], default: [], validate: (v) => v.length <= 6 },
    durationMinutes: { type: Number, required: true, min: 15, max: 240, validate: Number.isInteger },
    credits: { type: Number, required: true, min: 1, max: 100, validate: { validator: Number.isInteger, message: 'credits must be a positive integer' } },
    // active: visible; inactive: hidden by owner; removed: hidden by admin moderation
    status: { type: String, enum: ['active', 'inactive', 'removed'], default: 'active' },
  },
  { timestamps: true }
);

skillSchema.index({ status: 1, category: 1, level: 1, credits: 1, createdAt: -1 });

const SkillListing = mongoose.model('SkillListing', skillSchema);
SkillListing.CATEGORIES = CATEGORIES;
SkillListing.LEVELS = LEVELS;
module.exports = SkillListing;
