const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { COOKIE, verifyToken } = require('../utils/token');

async function loadUser(req) {
  let token = req.cookies && req.cookies[COOKIE];
  const h = req.headers.authorization;
  if (!token && h && h.startsWith('Bearer ')) token = h.slice(7);
  if (!token) return null;
  let payload;
  try { payload = verifyToken(token); } catch { throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.'); }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  if (user.status === 'suspended') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
  return user;
}

const requireAuth = async (req, _res, next) => {
  try {
    const user = await loadUser(req);
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    req.user = user;
    next();
  } catch (e) { next(e); }
};

const optionalAuth = async (req, _res, next) => {
  try { req.user = (await loadUser(req)) || undefined; next(); } catch { next(); }
};

const requireAdmin = (req, _res, next) =>
  req.user && req.user.role === 'admin' ? next() : next(new ApiError(403, 'FORBIDDEN', 'Administrator access required.'));

module.exports = { requireAuth, optionalAuth, requireAdmin };
