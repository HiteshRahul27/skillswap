const mongoose = require('mongoose');
const { env } = require('../config/env');

/**
 * Runs fn(session) inside a MongoDB transaction when USE_TRANSACTIONS=true
 * (requires a replica set, e.g. Atlas). Otherwise runs fn(null): the services then rely on
 * atomic conditional updates + unique ledger keys + compensating actions (see docs/ARCHITECTURE.md).
 */
async function runAtomic(fn) {
  if (!env.useTransactions) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await fn(session); });
    return result;
  } finally {
    session.endSession();
  }
}

module.exports = { runAtomic };
