const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

const ROUNDS = env.isTest ? 4 : 12;
const hashPassword = (pw) => bcrypt.hash(pw, ROUNDS);
const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);
// Used to keep response timing similar when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

module.exports = { hashPassword, comparePassword, DUMMY_HASH };
