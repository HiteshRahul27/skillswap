const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const make = (max, windowMs) =>
  rateLimit({
    windowMs, max: env.isTest ? 10000 : max, standardHeaders: true, legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } }),
  });

module.exports = {
  authLimiter: make(20, 15 * 60 * 1000),
  resetLimiter: make(5, 15 * 60 * 1000),
  apiLimiter: make(600, 15 * 60 * 1000),
};
