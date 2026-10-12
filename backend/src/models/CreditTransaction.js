const mongoose = require('mongoose');

const TYPES = ['welcome', 'reservation', 'refund', 'settlement', 'reward'];

const txSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: TYPES, required: true },
    amount: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'amount must be a positive integer' } },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    status: { type: String, enum: ['posted'], default: 'posted' },
    description: { type: String, required: true, maxlength: 200 },
    // Idempotency key, e.g. "reward:<bookingId>". Unique => a reward/refund can never be posted twice.
    key: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

txSchema.index({ user: 1, createdAt: -1 });
txSchema.index({ booking: 1 });

// Immutable ledger: block updates and deletes through Mongoose.
const BLOCKED = ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'];
BLOCKED.forEach((op) => txSchema.pre(op, function () { throw new Error('Ledger entries are immutable'); }));
txSchema.pre('save', function (next) { if (!this.isNew) return next(new Error('Ledger entries are immutable')); next(); });

const CreditTransaction = mongoose.model('CreditTransaction', txSchema);
CreditTransaction.TYPES = TYPES;
module.exports = CreditTransaction;
