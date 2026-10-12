const router = require('express').Router();
const c = require('../controllers/bookingController');
const v = require('../validators');
const { validate, objectId } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.post('/', validate(v.booking.create), c.create);
router.get('/', c.list);
router.get('/:id', objectId(), c.get);
router.post('/:id/confirm', objectId(), c.confirm);
router.post('/:id/reject', objectId(), c.reject);
router.post('/:id/cancel', objectId(), c.cancel);
router.post('/:id/complete', objectId(), c.complete);

module.exports = router;
