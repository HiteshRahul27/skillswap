const router = require('express').Router();
const c = require('../controllers/walletController');
const { requireAuth } = require('../middleware/auth');

// Read-only: there is intentionally no endpoint that writes balances or ledger rows.
router.use(requireAuth);
router.get('/', c.get);
router.get('/transactions', c.transactions);
router.get('/summary', c.summary);

module.exports = router;
