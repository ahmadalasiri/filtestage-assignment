import { ApiError } from '../../exceptions/ApiError.js';

/**
 * Global error handling middleware
 * Handles all errors and sends appropriate responses
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export const errorMiddleware = (err, req, res, next) => {
  // Set default error values
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Something went wrong';
  err.status = err.status || 'error';

  // Handle specific error types
  if (process.env.NODE_ENV === 'development') {
    sendDevelopmentResponse(err, req, res);
  } else {
    // Handle MongoDB and other operational errors
    let error = { ...err };
    error.message = err.message;

    // MongoDB CastError (invalid ID)
    if (err.name === 'CastError') {
      error = handleCastError(err);
    }

    // MongoDB Duplicate Key Error
    if (err.code === 11000) {
      error = handleDuplicateFieldError(err);
    }

    // MongoDB Validation Error
    if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
      error = new ApiError(401, 'Invalid token. Please log in again.');
    }
    if (err.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Your token has expired. Please log in again.');
    }

    sendProductionResponse(error, req, res);
  }
};

/**
 * Handle MongoDB CastError
 * @param {object} err - Error object
 * @returns {ApiError} - Formatted API error
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(400, message);
};

/**
 * Handle MongoDB Duplicate Key Error
 * @param {object} err - Error object
 * @returns {ApiError} - Formatted API error
 */
const handleDuplicateFieldError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = ${value}. Please use another value.`;
  return new ApiError(400, message);
};

/**
 * Handle MongoDB Validation Error
 * @param {object} err - Error object
 * @returns {ApiError} - Formatted API error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new ApiError(400, message);
};

/**
 * Send detailed error response in development environment
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const sendDevelopmentResponse = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Send sanitized error response in production environment
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const sendProductionResponse = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  
  // Programming or unknown error: don't leak error details
  console.error('ERROR 💥', err);
  
  // Send generic message
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};
