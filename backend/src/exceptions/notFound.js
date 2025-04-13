import { ApiError } from './ApiError.js';

/**
 * Middleware to handle 404 not found routes
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Not found - ${req.originalUrl}`));
};
