function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Use the status code from the error object if present, otherwise default to 500
  // Also respect res.statusCode if it was already set to something other than 200
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (err.status) statusCode = err.status;
  else if (err.statusCode) statusCode = err.statusCode;

  res.status(statusCode);
  res.json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };


