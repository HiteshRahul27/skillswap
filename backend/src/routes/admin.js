const router = require('express').Router();
const c = require('../controllers/adminController');
const v = require('../validators');
const { validate, objectId } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);
router.get('/users', c.users);
router.patch('/users/:id/status', objectId(), validate(v.admin.userStatus), c.setUserStatus);
router.get('/skills', c.skills);
router.patch('/skills/:id/moderation', objectId(), validate(v.admin.moderate), c.moderateSkill);
router.get('/bookings', c.bookings);
router.get('/ledger', c.ledger);
router.get('/ledger/audit', c.auditLedger);

module.exports = router;
