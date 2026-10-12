const ApiError = require('../utils/ApiError');

/** validate(schema, 'body'|'query'|'params') - replaces the source with the parsed (trimmed, typed) value. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', fields));
  }
  if (source === 'query') Object.defineProperty(req, 'validatedQuery', { value: result.data });
  else req[source] = result.data;
  next();
};

const objectId = (name = 'id') => (req, _res, next) =>
  /^[a-f\d]{24}$/i.test(req.params[name]) ? next() : next(new ApiError(400, 'INVALID_ID', 'Invalid identifier.'));

module.exports = { validate, objectId };
