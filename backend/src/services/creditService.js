const { Wallet, CreditTransaction } = require('../models');
const ApiError = require('../utils/ApiError');

const opts = (session) => (session ? { session } : {});
const assertAmount = (n) => {
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, 'INVALID_AMOUNT', 'Credit amounts must be positive integers.');
};

/**
 * Posts one ledger row. The unique `key` makes every posting idempotent: a second attempt with the
 * same key raises a duplicate-key error, which we translate to `null` ("already posted").
 */
async function post({ user, wallet, type, amount, booking, description, key }, session) {
  assertAmount(amount);
  try {
    const [tx] = await CreditTransaction.create(
      [{ user, wallet, type, amount, booking, description, key }],
      opts(session)
    );
    return tx;
  } catch (err) {
    if (err && err.code === 11000) return null;
    throw err;
  }
}

async function createWalletWithWelcome(userId, welcomeCredits, session) {
  const [wallet] = await Wallet.create([{ user: userId, available: welcomeCredits }], opts(session));
  if (welcomeCredits > 0) {
    await post({
      user: userId, wallet: wallet._id, type: 'welcome', amount: welcomeCredits,
      description: 'Welcome credits', key: `welcome:${userId}`,
    }, session);
  }
  return wallet;
}

const getWallet = (userId) => Wallet.findOne({ user: userId });

/** available -= amount, reserved += amount, only if enough available. Atomic: cannot overspend. */
async function reserve({ learnerId, booking, amount, description }, session) {
  assertAmount(amount);
  const wallet = await Wallet.findOneAndUpdate(
    { user: learnerId, available: { $gte: amount } },
    { $inc: { available: -amount, reserved: amount } },
    { new: true, ...opts(session) }
  );
  if (!wallet) throw new ApiError(402, 'INSUFFICIENT_CREDITS', 'You do not have enough available credits for this session.');
  await post({ user: learnerId, wallet: wallet._id, type: 'reservation', amount, booking, description, key: `reservation:${booking}` }, session);
  return wallet;
}

/** reserved -> available. Callers must already hold the booking state transition (single winner). */
async function refund({ learnerId, booking, amount, description }, session) {
  assertAmount(amount);
  const wallet = await Wallet.findOneAndUpdate(
    { user: learnerId, reserved: { $gte: amount } },
    { $inc: { reserved: -amount, available: amount } },
    { new: true, ...opts(session) }
  );
  if (!wallet) throw new ApiError(409, 'LEDGER_INCONSISTENT', 'Reserved credits not found for this booking.');
  const tx = await post({ user: learnerId, wallet: wallet._id, type: 'refund', amount, booking, description, key: `refund:${booking}` }, session);
  return { wallet, tx };
}

/** Learner: reserved -> spent. Teacher: +available, +earned. */
async function settle({ learnerId, teacherId, booking, amount, title }, session) {
  assertAmount(amount);
  const learnerWallet = await Wallet.findOneAndUpdate(
    { user: learnerId, reserved: { $gte: amount } },
    { $inc: { reserved: -amount, spent: amount } },
    { new: true, ...opts(session) }
  );
  if (!learnerWallet) throw new ApiError(409, 'LEDGER_INCONSISTENT', 'Reserved credits not found for this booking.');
  const teacherWallet = await Wallet.findOneAndUpdate(
    { user: teacherId },
    { $inc: { available: amount, earned: amount } },
    { new: true, ...opts(session) }
  );
  if (!teacherWallet) throw new ApiError(409, 'LEDGER_INCONSISTENT', 'Teacher wallet not found.');
  await post({ user: learnerId, wallet: learnerWallet._id, type: 'settlement', amount, booking, description: `Session completed: ${title}`, key: `settlement:${booking}` }, session);
  await post({ user: teacherId, wallet: teacherWallet._id, type: 'reward', amount, booking, description: `Teaching reward: ${title}`, key: `reward:${booking}` }, session);
}

/** Recomputes expected balances from the ledger and compares them with the cached wallets. */
async function auditLedger({ userId } = {}) {
  const match = userId ? { user: new (require('mongoose').Types.ObjectId)(userId) } : {};
  const rows = await CreditTransaction.aggregate([
    { $match: match },
    { $group: { _id: { user: '$user', type: '$type' }, total: { $sum: '$amount' } } },
  ]);
  const byUser = new Map();
  for (const r of rows) {
    const k = String(r._id.user);
    byUser.set(k, { ...(byUser.get(k) || {}), [r._id.type]: r.total });
  }
  const wallets = await Wallet.find(userId ? { user: userId } : {}).lean();
  const issues = [];
  for (const w of wallets) {
    const t = byUser.get(String(w.user)) || {};
    const n = (x) => t[x] || 0;
    const expected = {
      available: n('welcome') + n('refund') + n('reward') - n('reservation'),
      reserved: n('reservation') - n('refund') - n('settlement'),
      spent: n('settlement'),
      earned: n('reward'),
    };
    for (const f of Object.keys(expected)) {
      if (w[f] !== expected[f]) issues.push({ user: w.user, field: f, wallet: w[f], expected: expected[f] });
    }
  }
  return { walletsChecked: wallets.length, consistent: issues.length === 0, issues };
}

module.exports = { createWalletWithWelcome, getWallet, reserve, refund, settle, auditLedger, post };
