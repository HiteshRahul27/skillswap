const { CreditTransaction, Booking } = require('../models');
const credits = require('../services/creditService');
const { ok, asyncHandler, paging, pageMeta } = require('../utils/http');

exports.get = asyncHandler(async (req, res) => {
  const w = await credits.getWallet(req.user._id);
  ok(res, { available: w.available, reserved: w.reserved, earned: w.earned, spent: w.spent });
});

exports.transactions = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paging(req.query, 15, 50);
  const filter = { user: req.user._id };
  if (CreditTransaction.TYPES.includes(req.query.type)) filter.type = req.query.type;
  const [items, total] = await Promise.all([
    CreditTransaction.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    CreditTransaction.countDocuments(filter),
  ]);
  ok(res, items.map((t) => ({ id: t._id, type: t.type, amount: t.amount, status: t.status, description: t.description, booking: t.booking, createdAt: t.createdAt })), 200, pageMeta(page, limit, total));
});

// Dashboard helper: counts for the signed-in user.
exports.summary = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [pendingIncoming, pendingOutgoing, upcoming, completedLearning, completedTeaching] = await Promise.all([
    Booking.countDocuments({ teacher: uid, status: 'pending' }),
    Booking.countDocuments({ learner: uid, status: 'pending' }),
    Booking.countDocuments({ $or: [{ learner: uid }, { teacher: uid }], status: 'confirmed', startsAt: { $gt: new Date() } }),
    Booking.countDocuments({ learner: uid, status: 'completed' }),
    Booking.countDocuments({ teacher: uid, status: 'completed' }),
  ]);
  ok(res, { pendingIncoming, pendingOutgoing, upcoming, completedLearning, completedTeaching });
});
