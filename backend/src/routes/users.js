const router = require('express').Router();
const c = require('../controllers/userController');
const v = require('../validators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, c.getMe);
router.patch('/me', requireAuth, validate(v.profile), c.updateMe);

module.exports = router;
