import { ApiError } from "../exceptions/ApiError.js";

/**
 * Authentication middleware factory
 * @param {Object} session - Session service
 * @returns {Object} Authentication middleware functions
 */
export const createAuthMiddleware = (session) => {
  const authenticate = async (req, _res, next) => {
    try {
      const sessionData = await session.get(req);
      if (!sessionData || !sessionData.userId) {
        throw new ApiError(401, "Unauthorized - Authentication required");
      }

      req.user = { userId: sessionData.userId };
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper function to get user ID from request
   * This is used by the socket service to help identify users
   * @param {Object} req - Express request object
   * @returns {String|null} User ID if authenticated, null otherwise
   */
  const getUserFromRequest = async (req) => {
    try {
      const sessionData = await session.get(req);
      return sessionData?.userId || null;
    } catch (error) {
      return null;
    }
  };

  return {
    authenticate,
    getUserFromRequest,
  };
};
