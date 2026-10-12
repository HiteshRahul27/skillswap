// Read-only: compares every wallet with the totals recomputed from the ledger.
const { validateEnv } = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const credits = require('../src/services/creditService');

(async () => {
  validateEnv();
  await connectDB();
  const r = await credits.auditLedger();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.consistent ? 0 : 2);
})().catch((e) => { console.error(e.message); process.exit(1); });
