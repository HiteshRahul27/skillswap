const { User, SkillListing, Booking, CreditTransaction } = require('../models');
const credits = require('../services/creditService');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler, paging, pageMeta, escapeRegex } = require('../utils/http');

exports.users = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 20, 100);
  const filter = {};
  if (['active', 'suspended'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  ok(res, items.map((u) => u.toSafe()), 200, pageMeta(page, limit, total));
});

exports.setUserStatus = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  if (u.role === 'admin') throw new ApiError(403, 'FORBIDDEN', 'Administrator accounts cannot be suspended here.');
  u.status = req.body.status;
  await u.save();
  // Suspended teachers disappear from the marketplace.
  if (u.status === 'suspended') await SkillListing.updateMany({ teacher: u._id, status: 'active' }, { $set: { status: 'inactive' } });
  ok(res, u.toSafe());
});

exports.skills = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 20, 100);
  const filter = ['active', 'inactive', 'removed'].includes(req.query.status) ? { status: req.query.status } : {};
  const [items, total] = await Promise.all([
    SkillListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('teacher', 'name email'),
    SkillListing.countDocuments(filter),
  ]);
  ok(res, items.map((s) => ({ id: s._id, title: s.title, category: s.category, credits: s.credits, status: s.status, createdAt: s.createdAt, teacher: s.teacher && { id: s.teacher._id, name: s.teacher.name, email: s.teacher.email } })), 200, pageMeta(page, limit, total));
});

exports.moderateSkill = asyncHandler(async (req, res) => {
  const s = await SkillListing.findById(req.params.id);
  if (!s) throw new ApiError(404, 'SKILL_NOT_FOUND', 'Listing not found.');
  s.status = req.body.status; // 'removed' hides it; 'active' restores it
  await s.save();
  ok(res, { id: s._id, status: s.status });
});

exports.bookings = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 20, 100);
  const filter = Booking.STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('learner teacher', 'name'),
    Booking.countDocuments(filter),
  ]);
  ok(res, items.map((b) => ({ id: b._id, status: b.status, credits: b.credits, skillTitle: b.skillTitle, startsAt: b.startsAt, learner: b.learner && { id: b.learner._id, name: b.learner.name }, teacher: b.teacher && { id: b.teacher._id, name: b.teacher.name } })), 200, pageMeta(page, limit, total));
});

exports.ledger = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 25, 100);
  const filter = {};
  if (/^[a-f\d]{24}$/i.test(String(req.query.user))) filter.user = req.query.user;
  if (CreditTransaction.TYPES.includes(req.query.type)) filter.type = req.query.type;
  const [items, total] = await Promise.all([
    CreditTransaction.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate('user', 'name'),
    CreditTransaction.countDocuments(filter),
  ]);
  ok(res, items.map((t) => ({ id: t._id, user: t.user && { id: t.user._id, name: t.user.name }, type: t.type, amount: t.amount, booking: t.booking, description: t.description, key: t.key, createdAt: t.createdAt })), 200, pageMeta(page, limit, total));
});

exports.auditLedger = asyncHandler(async (_req, res) => ok(res, await credits.auditLedger()));
