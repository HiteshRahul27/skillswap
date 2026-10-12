const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const COOKIE = 'skillswap_token';

const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const verifyToken = (t) => jwt.verify(t, env.jwtSecret);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

const randomToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

module.exports = { COOKIE, signToken, verifyToken, cookieOptions, randomToken, sha256 };
