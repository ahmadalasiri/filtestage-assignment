import logger from '../utils/logger.js';
import { ApiError } from '../exceptions/ApiError.js';

// Central error handler middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Something went wrong';

  // Log different levels based on the error severity
  if (statusCode >= 500) {
    logger.error(`${status.toUpperCase()} 💥 ${message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode,
      stack: err.stack
    });
  } else if (statusCode >= 400) {
    logger.warn(`${status.toUpperCase()} ⚠️ ${message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode
    });
  }

  // In development, include the stack trace
  const response = {
    status,
    message,
    error: {
      statusCode,
      status
    }
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  const err = new ApiError(404, `Route not found: ${req.originalUrl}`);

  logger.warn(`NOT_FOUND ⚠️ Route not found: ${req.originalUrl}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  next(err);
};
