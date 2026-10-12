const { Availability, SkillListing, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler } = require('../utils/http');

const shape = (a) => ({ id: a._id, skill: a.skill, start: a.start, end: a.end, isBooked: a.isBooked });

exports.list = asyncHandler(async (req, res) => {
  const skillId = req.query.skill;
  if (!/^[a-f\d]{24}$/i.test(String(skillId))) throw new ApiError(400, 'INVALID_ID', 'A valid skill id is required.');
  const skill = await SkillListing.findById(skillId);
  if (!skill) throw new ApiError(404, 'SKILL_NOT_FOUND', 'This listing could not be found.');
  const owner = req.user && String(skill.teacher) === String(req.user._id);
  if (skill.status !== 'active' && !owner) throw new ApiError(404, 'SKILL_NOT_FOUND', 'This listing could not be found.');
  const filter = { skill: skill._id };
  if (!owner) filter.start = { $gt: new Date() };
  const slots = await Availability.find(filter).sort({ start: 1 }).limit(200);
  ok(res, slots.map(shape));
});

async function assertNoOverlap(teacher, start, end, exceptId) {
  const clash = await Availability.exists({ teacher, ...(exceptId ? { _id: { $ne: exceptId } } : {}), start: { $lt: end }, end: { $gt: start } });
  if (clash) throw new ApiError(409, 'SLOT_OVERLAP', 'This overlaps another time slot you offer.', { start: 'Overlaps one of your other slots' });
}

exports.create = asyncHandler(async (req, res) => {
  const { skill: skillId, start, end } = req.body;
  const skill = await SkillListing.findById(skillId);
  if (!skill) throw new ApiError(404, 'SKILL_NOT_FOUND', 'This listing could not be found.');
  if (String(skill.teacher) !== String(req.user._id)) throw new ApiError(403, 'FORBIDDEN', 'You can only manage slots on your own listings.');
  if (start <= new Date()) throw new ApiError(400, 'SLOT_IN_PAST', 'Choose a start time in the future.', { start: 'Must be in the future' });
  const minutes = (end - start) / 60000;
  if (minutes !== skill.durationMinutes) throw new ApiError(400, 'DURATION_MISMATCH', `Slot length must match the session duration (${skill.durationMinutes} minutes).`, { end: `Must be ${skill.durationMinutes} minutes after the start` });
  await assertNoOverlap(req.user._id, start, end);
  const slot = await Availability.create({ skill: skill._id, teacher: req.user._id, start, end });
  ok(res, shape(slot), 201);
});

async function ownedSlot(req) {
  const slot = await Availability.findById(req.params.id);
  if (!slot) throw new ApiError(404, 'SLOT_NOT_FOUND', 'Time slot not found.');
  if (String(slot.teacher) !== String(req.user._id)) throw new ApiError(403, 'FORBIDDEN', 'You can only manage your own slots.');
  if (slot.isBooked || (await Booking.exists({ activeSlot: slot._id }))) throw new ApiError(409, 'SLOT_BOOKED', 'This slot is booked. Cancel the booking first.');
  return slot;
}

exports.update = asyncHandler(async (req, res) => {
  const slot = await ownedSlot(req);
  const skill = await SkillListing.findById(slot.skill);
  const { start, end } = req.body;
  if (start <= new Date()) throw new ApiError(400, 'SLOT_IN_PAST', 'Choose a start time in the future.', { start: 'Must be in the future' });
  if ((end - start) / 60000 !== skill.durationMinutes) throw new ApiError(400, 'DURATION_MISMATCH', `Slot length must match the session duration (${skill.durationMinutes} minutes).`, { end: `Must be ${skill.durationMinutes} minutes after the start` });
  await assertNoOverlap(req.user._id, start, end, slot._id);
  slot.start = start; slot.end = end;
  await slot.save();
  ok(res, shape(slot));
});

exports.remove = asyncHandler(async (req, res) => {
  const slot = await ownedSlot(req);
  await slot.deleteOne();
  ok(res, { deleted: true });
});
