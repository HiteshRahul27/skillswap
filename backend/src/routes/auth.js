const router = require('express').Router();
const c = require('../controllers/authController');
const v = require('../validators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, resetLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, validate(v.auth.register), c.register);
router.post('/login', authLimiter, validate(v.auth.login), c.login);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);
router.post('/forgot-password', resetLimiter, validate(v.auth.forgot), c.forgotPassword);
router.post('/reset-password', resetLimiter, validate(v.auth.reset), c.resetPassword);

module.exports = router;
