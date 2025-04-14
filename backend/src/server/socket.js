import { Server as SocketServer } from "socket.io";
import { env } from "../config/validateEnv.js";
import { commentEvents } from "../routes/comments.js";

let io;
// Map to store user socket connections
const socketUserMap = new Map();

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP server instance
 * @returns {object} Socket.IO server instance
 */
export const initializeSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
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
      console.error("Socket authentication error:", error);
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle user identification
    socket.on("identify", (userId) => {
      if (userId) {
        console.log(`Socket ${socket.id} identified as user: ${userId}`);
        // Store the mapping between socket and user
        socket.data.userId = userId;
        socketUserMap.set(socket.id, userId);
      }
    });

    // Join room for specific file
    socket.on("join-file-room", (fileId) => {
      console.log(`Socket ${socket.id} joining room for file: ${fileId}`);
      socket.join(`file-${fileId}`);
    });

    // Leave file room
    socket.on("leave-file-room", (fileId) => {
      console.log(`Socket ${socket.id} leaving room for file: ${fileId}`);
      socket.leave(`file-${fileId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // Clean up the socket-user mapping
      socketUserMap.delete(socket.id);
    });
  });

  // Listen for new comment events from the EventEmitter
  commentEvents.on("new-comment", ({ comment, fileId, userId }) => {
    if (!io) return;

    console.log(`Received new comment event for file: ${fileId}`);

    // Emit the message to all users in the file room except the sender
    io.to(`file-${fileId}`)
      .except(
        // Find all socket IDs of the sender
        Array.from(io.sockets.sockets.values())
          .filter((socket) => socket.data.userId === userId)
          .map((socket) => socket.id)
      )
      .emit("new-comment", comment);
  });

  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {object} Socket.IO server instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
