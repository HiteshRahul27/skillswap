const { Booking } = require('../models');
const bookingService = require('../services/bookingService');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler, paging, pageMeta } = require('../utils/http');

const shape = (b, viewerId) => ({
  id: b._id, status: b.status, credits: b.credits, skillTitle: b.skillTitle, skill: b.skill && b.skill._id ? b.skill._id : b.skill,
  startsAt: b.startsAt, endsAt: b.endsAt, note: b.note, createdAt: b.createdAt,
  confirmedAt: b.confirmedAt, completedAt: b.completedAt, cancelledAt: b.cancelledAt, rejectedAt: b.rejectedAt,
  learner: b.learner && b.learner.name ? { id: b.learner._id, name: b.learner.name } : { id: b.learner },
  teacher: b.teacher && b.teacher.name ? { id: b.teacher._id, name: b.teacher.name } : { id: b.teacher },
  role: viewerId ? (String(b.teacher._id || b.teacher) === String(viewerId) ? 'teacher' : 'learner') : undefined,
});

exports.create = asyncHandler(async (req, res) => {
  const b = await bookingService.createBooking(req.user, { slotId: req.body.slot, note: req.body.note });
  ok(res, shape(b, req.user._id), 201);
});

exports.list = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 20, 50);
  const role = req.query.role === 'teacher' ? 'teacher' : 'learner';
  const filter = { [role]: req.user._id };
  if (Booking.STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ startsAt: -1 }).skip(skip).limit(limit).populate('learner teacher', 'name'),
    Booking.countDocuments(filter),
  ]);
  ok(res, items.map((b) => shape(b, req.user._id)), 200, pageMeta(page, limit, total));
});

exports.get = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('learner teacher', 'name');
  const mine = b && [String(b.learner._id), String(b.teacher._id)].includes(String(req.user._id));
  if (!b || (!mine && req.user.role !== 'admin')) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
  ok(res, shape(b, req.user._id));
});

const act = (action) => asyncHandler(async (req, res) => {
  const b = await bookingService.transition(req.params.id, req.user, action);
  ok(res, shape(b, req.user._id));
});
exports.confirm = act('confirm');
exports.reject = act('reject');
exports.cancel = act('cancel');
exports.complete = act('complete');
