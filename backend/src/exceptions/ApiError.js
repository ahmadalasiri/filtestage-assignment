/**
 * ApiError class for handling operational errors (e.g., invalid input, not found, etc.)
 */
export class ApiError extends Error {
  /**
   * Create a new ApiError
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
