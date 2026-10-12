const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

const notFound = (req, _res, next) => next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let { status = 500, code = 'SERVER_ERROR', message = 'Something went wrong.', fields } = err;
  if (err.name === 'CastError') { status = 400; code = 'INVALID_ID'; message = 'Invalid identifier.'; }
  else if (err.name === 'ValidationError' && err.errors) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Please correct the highlighted fields.';
    fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Malformed JSON body.'; }
  else if (err.code === 11000) { status = 409; code = 'DUPLICATE'; message = 'That record already exists.'; }
  else if (!(err instanceof ApiError) && !err.status) { status = 500; }

  if (status >= 500) {
    if (!env.isTest || process.env.DEBUG_ERRORS) console.error(`[error] ${req.method} ${req.path}: ${err.message}`); // never logs bodies/secrets
    message = 'Something went wrong on our side. Please try again.';
  }
  res.status(status).json({ success: false, error: { code, message, ...(fields ? { fields } : {}) } });
};

module.exports = { notFound, errorHandler };
