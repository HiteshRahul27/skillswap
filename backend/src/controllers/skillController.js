const { SkillListing, Availability, Booking, Review, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler, paging, pageMeta, escapeRegex } = require('../utils/http');
const { skillRatings, teacherRating } = require('../services/ratingService');

const shape = (s, rating, avail) => ({
  id: s._id, title: s.title, category: s.category, description: s.description, level: s.level,
  outcomes: s.outcomes, durationMinutes: s.durationMinutes, credits: s.credits, status: s.status, createdAt: s.createdAt,
  teacher: s.teacher && s.teacher.name ? { id: s.teacher._id, name: s.teacher.name } : { id: s.teacher },
  rating: rating || { avg: null, count: 0 },
  availability: avail || { openSlots: 0, nextStart: null },
});

async function availabilityFor(ids) {
  if (!ids.length) return new Map();
  const slots = await Availability.find({ skill: { $in: ids }, isBooked: false, start: { $gt: new Date() } }).select('skill start').lean();
  const map = new Map();
  for (const sl of slots) {
    const k = String(sl.skill);
    const cur = map.get(k) || { openSlots: 0, nextStart: null };
    cur.openSlots += 1;
    if (!cur.nextStart || sl.start < cur.nextStart) cur.nextStart = sl.start;
    map.set(k, cur);
  }
  return map;
}

async function decorate(listings) {
  const ids = listings.map((l) => l._id);
  const [ratings, avail] = await Promise.all([skillRatings(ids), availabilityFor(ids)]);
  return listings.map((l) => shape(l, ratings.get(String(l._id)), avail.get(String(l._id))));
}

exports.list = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const { skip, limit, page } = paging(q);
  const filter = { status: 'active' };
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ title: rx }, { description: rx }, { category: rx }]; }
  if (q.category) filter.category = q.category;
  if (q.level) filter.level = q.level;
  if (q.minCredits !== undefined || q.maxCredits !== undefined) {
    filter.credits = {};
    if (q.minCredits !== undefined) filter.credits.$gte = q.minCredits;
    if (q.maxCredits !== undefined) filter.credits.$lte = q.maxCredits;
  }
  const sort = q.sort === 'price_asc' ? { credits: 1, _id: -1 } : q.sort === 'price_desc' ? { credits: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const [items, total] = await Promise.all([
    SkillListing.find(filter).sort(sort).skip(skip).limit(limit).populate('teacher', 'name'),
    SkillListing.countDocuments(filter),
  ]);
  ok(res, await decorate(items), 200, pageMeta(page, limit, total));
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await SkillListing.find({ teacher: req.user._id }).sort({ createdAt: -1 }).populate('teacher', 'name');
  ok(res, await decorate(items));
});

exports.get = asyncHandler(async (req, res) => {
  const s = await SkillListing.findById(req.params.id).populate('teacher', 'name bio status');
  const isOwner = s && req.user && String(s.teacher._id) === String(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';
  if (!s || (s.status !== 'active' && !isOwner && !isAdmin)) throw new ApiError(404, 'SKILL_NOT_FOUND', 'This listing could not be found.');
  const [slots, reviews, tRating] = await Promise.all([
    Availability.find({ skill: s._id, start: { $gt: new Date() } }).sort({ start: 1 }).limit(60),
    Review.find({ skill: s._id }).sort({ createdAt: -1 }).limit(10).populate('reviewer', 'name'),
    teacherRating(s.teacher._id),
  ]);
  const [deco] = await decorate([s]);
  ok(res, {
    ...deco,
    teacher: { id: s.teacher._id, name: s.teacher.name, bio: s.teacher.bio, rating: tRating },
    slots: slots.map((x) => ({ id: x._id, start: x.start, end: x.end, isBooked: x.isBooked })),
    reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewer: r.reviewer && { id: r.reviewer._id, name: r.reviewer.name } })),
    isOwner: Boolean(isOwner),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const s = await SkillListing.create({ ...req.body, teacher: req.user._id });
  ok(res, shape(s), 201);
});

async function ownedOr404(req) {
  const s = await SkillListing.findById(req.params.id);
  if (!s) throw new ApiError(404, 'SKILL_NOT_FOUND', 'This listing could not be found.');
  if (String(s.teacher) !== String(req.user._id)) throw new ApiError(403, 'FORBIDDEN', 'You can only change your own listings.');
  return s;
}

exports.update = asyncHandler(async (req, res) => {
  const s = await ownedOr404(req);
  if (s.status === 'removed') throw new ApiError(403, 'LISTING_REMOVED', 'This listing was removed by a moderator.');
  // Price changes never affect existing bookings: bookings keep their own price snapshot.
  Object.assign(s, req.body);
  await s.save();
  ok(res, shape(s));
});

exports.remove = asyncHandler(async (req, res) => {
  const s = await ownedOr404(req);
  if (await Booking.exists({ skill: s._id, status: { $in: ['pending', 'confirmed'] } })) {
    throw new ApiError(409, 'HAS_ACTIVE_BOOKINGS', 'This listing has upcoming bookings. Cancel or complete them before deleting it.');
  }
  await Availability.deleteMany({ skill: s._id });
  await s.deleteOne();
  ok(res, { deleted: true });
});

exports.stats = asyncHandler(async (_req, res) => {
  const [members, listings, completedSessions] = await Promise.all([
    User.countDocuments({ status: 'active' }),
    SkillListing.countDocuments({ status: 'active' }),
    Booking.countDocuments({ status: 'completed' }),
  ]);
  ok(res, { members, listings, completedSessions });
});
