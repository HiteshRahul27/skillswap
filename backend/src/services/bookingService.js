const { Booking, Availability, SkillListing, User } = require('../models');
const credits = require('./creditService');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');
const { env } = require('../config/env');

const opts = (session) => (session ? { session } : {});
const HOUR = 3600 * 1000;

async function createBooking(learner, { slotId, note }) {
  const slot = await Availability.findById(slotId);
  if (!slot) throw new ApiError(404, 'SLOT_NOT_FOUND', 'That time slot does not exist.');
  const skill = await SkillListing.findById(slot.skill);
  if (!skill || skill.status !== 'active') throw new ApiError(404, 'SKILL_UNAVAILABLE', 'This listing is not available.');
  if (String(skill.teacher) === String(learner._id)) throw new ApiError(403, 'OWN_LISTING', 'You cannot book your own listing.');
  const teacher = await User.findById(skill.teacher);
  if (!teacher || teacher.status !== 'active') throw new ApiError(404, 'SKILL_UNAVAILABLE', 'This listing is not available.');
  if (slot.start <= new Date()) throw new ApiError(400, 'SLOT_IN_PAST', 'That time slot has already started.');
  if (slot.isBooked) throw new ApiError(409, 'SLOT_TAKEN', 'That time slot was just booked by someone else.');

  const conflict = await Booking.exists({
    learner: learner._id,
    status: { $in: ['pending', 'confirmed'] },
    startsAt: { $lt: slot.end },
    endsAt: { $gt: slot.start },
  });
  if (conflict) throw new ApiError(409, 'BOOKING_CONFLICT', 'You already have a session that overlaps this time.');

  // Price and teacher always come from the stored listing, never from the request.
  const booking = new Booking({
    skill: skill._id, slot: slot._id, learner: learner._id, teacher: skill.teacher,
    credits: skill.credits, skillTitle: skill.title, startsAt: slot.start, endsAt: slot.end,
    note: note || '', status: 'pending', activeSlot: slot._id,
  });

  const undo = [];
  try {
    return await runAtomic(async (session) => {
      // 1) claim the slot atomically
      const claimed = await Availability.findOneAndUpdate(
        { _id: slot._id, isBooked: false, start: { $gt: new Date() } },
        { $set: { isBooked: true } },
        { new: true, ...opts(session) }
      );
      if (!claimed) throw new ApiError(409, 'SLOT_TAKEN', 'That time slot was just booked by someone else.');
      undo.push(() => Availability.updateOne({ _id: slot._id }, { $set: { isBooked: false } }));

      // 2) reserve credits atomically (fails with 402 if the balance is too low)
      await credits.reserve({ learnerId: learner._id, booking: booking._id, amount: skill.credits, description: `Reserved for ${skill.title}` }, session);
      undo.push(() => credits.refund({ learnerId: learner._id, booking: booking._id, amount: skill.credits, description: `Reservation reversed: ${skill.title}` }));

      // 3) persist the booking (unique activeSlot is the final guard)
      await booking.save(opts(session));
      return booking;
    });
  } catch (err) {
    if (!env.useTransactions) for (const f of undo.reverse()) await f().catch(() => {});
    if (err && err.code === 11000) throw new ApiError(409, 'SLOT_TAKEN', 'That time slot was just booked by someone else.');
    throw err;
  }
}

const ACTIONS = {
  confirm: { from: ['pending'], to: 'confirmed', who: 'teacher' },
  reject: { from: ['pending'], to: 'rejected', who: 'teacher' },
  cancel: { from: ['pending', 'confirmed'], to: 'cancelled', who: 'either' },
  complete: { from: ['confirmed'], to: 'completed', who: 'teacher' },
};

/**
 * Every transition is one atomic findOneAndUpdate guarded by the expected current status.
 * Only the request that wins that update moves credits, so refunds/rewards cannot repeat.
 */
async function transition(bookingId, actor, action) {
  const rule = ACTIONS[action];
  const existing = await Booking.findById(bookingId);
  const isAdmin = actor.role === 'admin';
  const isTeacher = existing && String(existing.teacher) === String(actor._id);
  const isLearner = existing && String(existing.learner) === String(actor._id);
  if (!existing || (!isTeacher && !isLearner && !isAdmin)) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
  if (rule.who === 'teacher' && !isTeacher) throw new ApiError(403, 'FORBIDDEN', 'Only the teacher can do this.');
  if (!rule.from.includes(existing.status)) throw new ApiError(409, 'INVALID_STATE', `A ${existing.status} booking cannot be ${rule.to}.`);

  const now = new Date();
  if (action === 'complete' && existing.endsAt > now) throw new ApiError(409, 'TOO_EARLY', 'A session can be completed only after it has ended.');
  if (action === 'cancel' && isLearner && !isTeacher && existing.status === 'confirmed'
      && existing.startsAt.getTime() - now.getTime() < env.cancelCutoffHours * HOUR) {
    throw new ApiError(409, 'CANCEL_CUTOFF', `Confirmed sessions cannot be cancelled by the learner within ${env.cancelCutoffHours} hours of the start.`);
  }

  const set = { status: rule.to };
  if (action === 'confirm') set.confirmedAt = now;
  if (action === 'complete') set.completedAt = now;
  if (action === 'reject') set.rejectedAt = now;
  if (action === 'cancel') { set.cancelledAt = now; set.cancelledBy = actor._id; }
  const update = { $set: set };
  if (action !== 'confirm') update.$unset = { activeSlot: 1 };

  return runAtomic(async (session) => {
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, status: { $in: rule.from } },
      update,
      { new: true, ...opts(session) }
    );
    if (!updated) throw new ApiError(409, 'INVALID_STATE', 'This booking was just updated by someone else. Refresh and try again.');

    if (action === 'reject' || action === 'cancel') {
      await credits.refund({ learnerId: updated.learner, booking: updated._id, amount: updated.credits,
        description: `${action === 'reject' ? 'Rejected' : 'Cancelled'}: ${updated.skillTitle}` }, session);
      await Availability.updateOne({ _id: updated.slot }, { $set: { isBooked: false } }, opts(session));
    } else if (action === 'complete') {
      await credits.settle({ learnerId: updated.learner, teacherId: updated.teacher, booking: updated._id,
        amount: updated.credits, title: updated.skillTitle }, session);
    }
    return updated;
  });
}

module.exports = { createBooking, transition };
