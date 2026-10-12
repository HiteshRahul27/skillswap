const router = require('express').Router();
const c = require('../controllers/reviewController');
const v = require('../validators');
const { validate, objectId } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.get('/', c.list);
router.post('/', requireAuth, validate(v.review.create), c.create);
router.delete('/:id', requireAuth, objectId(), c.remove);

module.exports = router;
