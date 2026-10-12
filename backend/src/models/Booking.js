const mongoose = require('mongoose');

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

const bookingSchema = new mongoose.Schema(
  {
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillListing', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Price snapshot taken from the listing at booking time (never from the client).
    credits: { type: Number, required: true, min: 1, validate: Number.isInteger },
    skillTitle: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    // Set only while the booking holds its slot (pending/confirmed). Unique+sparse => no double booking.
    activeSlot: { type: mongoose.Schema.Types.ObjectId },
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
  },
  { timestamps: true }
);

bookingSchema.index({ activeSlot: 1 }, { unique: true, sparse: true });
bookingSchema.index({ learner: 1, startsAt: 1 });
bookingSchema.index({ teacher: 1, startsAt: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
Booking.STATUSES = STATUSES;
module.exports = Booking;
