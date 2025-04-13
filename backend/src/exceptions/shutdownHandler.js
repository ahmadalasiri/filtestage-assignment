import { MongoClient } from 'mongodb';

/**
 * Graceful shutdown handler for the application
 * Handles process termination signals and uncaught exceptions
 * @param {object} server - HTTP server instance
 * @param {object} client - MongoDB client
 */
export const setupShutdownHandler = (server, client) => {
  // Handle process kill signal (SIGINT)
  process.on('SIGINT', async () => {
    console.log('👋 SIGINT RECEIVED. Shutting down gracefully');

    try {
      // Close server to stop accepting new connections
      server.close(() => {
        console.log('HTTP server closed.');
      });

      // Close database connection
      if (client) {
        await client.close();
        console.log('MongoDB connection closed.');
      }

      console.log('💥 Process terminated!');
      process.exit(0); // Exit with success code
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1); // Exit with error code
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥');
    console.error(err.name, err.message);
    console.error(err.stack);

    // TODO: Notify developers
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥');
    console.error(err.name, err.message);
    console.error(err.stack);

    // TODO: Notify developers
    process.exit(1);
  });
};
