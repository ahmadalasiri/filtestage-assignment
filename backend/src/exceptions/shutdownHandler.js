import logger from "../utils/logger.js";

/**
 * Graceful shutdown handler for the application
 * Handles process termination signals and uncaught exceptions
 * @param {object} server - HTTP server instance
 * @param {object} client - MongoDB client
 */
export const setupShutdownHandler = (server, client) => {
  // Handle process kill signal (SIGINT)
  process.on("SIGINT", async () => {
    logger.info("👋 SIGINT RECEIVED. Shutting down gracefully");

    try {
      // Close server to stop accepting new connections
      server.close(() => {
        logger.info("HTTP server closed.");
      });

      // Close database connection
      if (client) {
        await client.close();
        logger.info("MongoDB connection closed.");
      }

      logger.info("Process terminated gracefully");
      process.exit(0); // Exit with success code
    } catch (err) {
      logger.error("Error during graceful shutdown", {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1); // Exit with error code
    }
  });

  process.on("uncaughtException", (error) => {
    logger.error("UNCAUGHT EXCEPTION! 💥", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("UNHANDLED REJECTION! 💥", {
      reason: reason instanceof Error ? reason.message : reason,
      stack:
        reason instanceof Error ? reason.stack : "No stack trace available",
      promise,
    });
    process.exit(1);
  });
};
