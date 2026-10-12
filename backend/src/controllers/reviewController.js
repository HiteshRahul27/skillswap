const { Review, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler, paging, pageMeta } = require('../utils/http');

exports.create = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment } = req.body;
  const b = await Booking.findById(bookingId);
  if (!b || String(b.learner) !== String(req.user._id)) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
  if (String(b.teacher) === String(req.user._id)) throw new ApiError(403, 'SELF_REVIEW', 'You cannot review yourself.');
  if (b.status !== 'completed') throw new ApiError(409, 'NOT_COMPLETED', 'You can review a session only after it is completed.');
  try {
    const r = await Review.create({ booking: b._id, skill: b.skill, reviewer: req.user._id, teacher: b.teacher, rating, comment: comment || '' });
    ok(res, { id: r._id, rating: r.rating, comment: r.comment }, 201);
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, 'ALREADY_REVIEWED', 'You have already reviewed this session.');
    throw e;
  }
});

exports.list = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 10, 50);
  const filter = {};
  if (/^[a-f\d]{24}$/i.test(String(req.query.skill))) filter.skill = req.query.skill;
  if (/^[a-f\d]{24}$/i.test(String(req.query.teacher))) filter.teacher = req.query.teacher;
  if (/^[a-f\d]{24}$/i.test(String(req.query.booking))) filter.booking = req.query.booking;
  if (!Object.keys(filter).length) throw new ApiError(400, 'FILTER_REQUIRED', 'Provide skill, teacher or booking.');
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reviewer', 'name'),
    Review.countDocuments(filter),
  ]);
  ok(res, items.map((r) => ({ id: r._id, booking: r.booking, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewer: r.reviewer && { id: r.reviewer._id, name: r.reviewer.name } })), 200, pageMeta(page, limit, total));
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (!r) throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
  if (String(r.reviewer) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own reviews.');
  await r.deleteOne();
  ok(res, { deleted: true });
});
