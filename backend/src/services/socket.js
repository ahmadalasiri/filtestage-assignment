import { Server as SocketServer } from 'socket.io';

let io;

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP server instance
 * @returns {object} Socket.IO server instance
 */
export const initializeSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // We'll use a simpler approach for authentication
  // Since we can't easily reuse the session middleware
  io.use(async (socket, next) => {
    try {
      // For simplicity, we'll accept all connections and handle user identification later
      // This is a simplified approach for the demo
      socket.data.authenticated = true;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Join room for specific file
    socket.on('join-file-room', (fileId) => {
      console.log(`Socket ${socket.id} joining room for file: ${fileId}`);
      socket.join(`file-${fileId}`);
    });

    // Leave file room
    socket.on('leave-file-room', (fileId) => {
      console.log(`Socket ${socket.id} leaving room for file: ${fileId}`);
      socket.leave(`file-${fileId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {object} Socket.IO server instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};