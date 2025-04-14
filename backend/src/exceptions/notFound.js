import { ApiError } from "./ApiError.js";
import logger from "../utils/logger.js";

export const notFoundHandler = (req, _res, next) => {
  const err = new ApiError(404, `Route not found: ${req.originalUrl}`);

  logger.warn(`NOT_FOUND ⚠️ Route not found: ${req.originalUrl}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  next(err);
};
