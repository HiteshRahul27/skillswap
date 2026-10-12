const { User } = require('../models');
const credits = require('../services/creditService');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler } = require('../utils/http');
const { runAtomic } = require('../utils/atomic');
const { env } = require('../config/env');
const { hashPassword, comparePassword, DUMMY_HASH } = require('../utils/password');
const { COOKIE, signToken, cookieOptions, randomToken, sha256 } = require('../utils/token');
const { sendMail, isConfigured } = require('../utils/mailer');

const setSession = (res, user) => res.cookie(COOKIE, signToken(user._id), cookieOptions());
const dupEmail = () => new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'An account with this email already exists.' });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw dupEmail();
  const passwordHash = await hashPassword(password);
  let user;
  let wallet;
  try {
    await runAtomic(async (session) => {
      [user] = await User.create([{ name, email, passwordHash }], session ? { session } : {});
      wallet = await credits.createWalletWithWelcome(user._id, env.welcomeCredits, session);
    });
  } catch (err) {
    if (user && !env.useTransactions) await User.deleteOne({ _id: user._id }).catch(() => {}); // compensate half-created account
    if (err && err.code === 11000) throw dupEmail();
    throw err;
  }
  setSession(res, user);
  ok(res, { user: user.toSafe(), wallet: { available: wallet.available, reserved: wallet.reserved } }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const match = await comparePassword(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !match) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (user.status === 'suspended') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
  setSession(res, user);
  ok(res, { user: user.toSafe() });
});

exports.logout = (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
  ok(res, { loggedOut: true });
};

exports.me = asyncHandler(async (req, res) => {
  const wallet = await credits.getWallet(req.user._id);
  ok(res, { user: req.user.toSafe(), wallet });
});

const GENERIC = 'If an account exists for that email, a reset link is on its way.';

exports.forgotPassword = asyncHandler(async (req, res) => {
  if (!isConfigured() && env.isProd) throw new ApiError(503, 'EMAIL_NOT_CONFIGURED', 'Password reset email is not configured on this server.');
  const user = await User.findOne({ email: req.body.email });
  if (!user || user.status !== 'active') return ok(res, { message: GENERIC });

  const token = randomToken();
  user.resetTokenHash = sha256(token); // only the hash is stored
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

  if (isConfigured()) {
    await sendMail({ to: user.email, subject: 'Reset your SkillSwap password', text: `Use this link within 30 minutes to reset your password:\n\n${resetUrl}\n\nIf you did not ask for this, ignore this email.` });
    return ok(res, { message: GENERIC });
  }
  // Development only: no SMTP configured, so nothing was emailed. Expose the link instead.
  if (!env.isTest) console.log(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
  ok(res, { message: 'Email delivery is not configured, so no email was sent. Development reset link provided below.', devResetUrl: resetUrl });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const passwordHash = await hashPassword(password);
  // Single atomic step: match unexpired token, set password, burn the token.
  const result = await User.updateOne(
    { resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } },
    { $set: { passwordHash }, $unset: { resetTokenHash: 1, resetTokenExpires: 1 } }
  );
  if (result.modifiedCount !== 1) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired. Request a new one.');
  ok(res, { message: 'Your password has been updated. You can now sign in.' });
});
