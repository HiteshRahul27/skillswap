const router = require('express').Router();
const c = require('../controllers/availabilityController');
const v = require('../validators');
const { validate, objectId } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, c.list);
router.post('/', requireAuth, validate(v.slot.create), c.create);
router.patch('/:id', requireAuth, objectId(), validate(v.slot.update), c.update);
router.delete('/:id', requireAuth, objectId(), c.remove);

module.exports = router;
