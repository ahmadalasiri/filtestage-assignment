import logger from "../utils/logger.js";
import { ApiError } from "./ApiError.js";

const handleMulterError = (err) => {
  let message = "";
  let statusCode = 400;
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    message = "Unexpected file upload";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    message = "File size exceeded";
    statusCode = 413; // Payload Too Large
  } else {
    message = err.message;
  }
  return new ApiError(statusCode, message);
};

// Handler for development environment
const sendForDev = (err, req, res) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  logger.error(
    `${status.toUpperCase()} 💥 ${err.message || "Something went wrong"}`,
    {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      statusCode,
      stack: err.stack,
    }
  );

  res.status(statusCode).json({
    status,
    message: err.message,
    stack: err.stack,
    error: {
      statusCode,
      status,
    },
  });
};

// Handler for production environment
const sendForProd = (err, req, res) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // Log the error for internal tracking
  if (statusCode >= 500) {
    logger.error(
      `${status.toUpperCase()} 💥 ${err.message || "Something went wrong"}`,
      {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        statusCode,
        stack: err.stack,
      }
    );
  } else {
    logger.warn(
      `${status.toUpperCase()} ⚠️ ${err.message || "Something went wrong"}`,
      {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        statusCode,
      }
    );
  }

  // For operational errors, send detailed but safe message to client
  if (err.isOperational) {
    res.status(statusCode).json({
      status,
      message: err.message,
      error: {
        statusCode,
        status,
      },
    });
  }
  // For programming or unknown errors, send generic message
  else {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error: {
        statusCode: 500,
        status: "error",
      },
    });
  }
};

// Central error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Set default values but don't try to modify the original error object directly
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const message = err.message || "Something went wrong";

  if (process.env.NODE_ENV === "production") {
    let error = {
      ...err,
      statusCode,
      status,
      message,
    };

    if (err.name === "MulterError") error = handleMulterError(err);

    sendForProd(error, req, res);
  } else {
    const devError = {
      statusCode,
      status,
      message,
      stack: err.stack,
    };
    sendForDev(devError, req, res);
  }
};
