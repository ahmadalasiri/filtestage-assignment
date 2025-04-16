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

  return authenticate;
};
