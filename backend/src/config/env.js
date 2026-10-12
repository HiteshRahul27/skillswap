require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const num = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const str = (k, d = '') => (process.env[k] !== undefined ? process.env[k] : d);

const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: num('PORT', 5000),
  mongoUri: str('MONGO_URI'),
  jwtSecret: str('JWT_SECRET'),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),
  clientUrl: str('CLIENT_URL', 'http://localhost:5173'),
  welcomeCredits: num('WELCOME_CREDITS', 10),
  cancelCutoffHours: num('CANCEL_CUTOFF_HOURS', 12),
  useTransactions: str('USE_TRANSACTIONS', 'false') === 'true',
  cookieSameSite: str('COOKIE_SAMESITE', 'lax'),
  smtp: {
    host: str('SMTP_HOST'),
    port: num('SMTP_PORT', 587),
    user: str('SMTP_USER'),
    pass: str('SMTP_PASS'),
    from: str('SMTP_FROM', 'SkillSwap <no-reply@example.com>'),
  },
  get isProd() { return this.nodeEnv === 'production'; },
  get isTest() { return this.nodeEnv === 'test'; },
};

/** Throws a readable error when required configuration is missing. */
function validateEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGO_URI is not set (see backend/.env.example).');
  if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET must be set and at least 32 characters long.');
  if (!Number.isInteger(env.welcomeCredits) || env.welcomeCredits < 0) problems.push('WELCOME_CREDITS must be a non-negative integer.');
  if (problems.length) throw new Error('Configuration error:\n - ' + problems.join('\n - '));
}

module.exports = { env, validateEnv };
