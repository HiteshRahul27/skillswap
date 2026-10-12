const mongoose = require('mongoose');

const int = { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: 'must be an integer' } };

/**
 * Cached balances. The CreditTransaction ledger is the source of truth; balances are changed
 * ONLY by creditService via atomic conditional $inc updates.
 *   available = welcome + refund + reward - reservation
 *   reserved  = reservation - refund - settlement
 *   spent     = settlement          earned = reward
 */
const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    available: int,
    reserved: int,
    earned: int,
    spent: int,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
