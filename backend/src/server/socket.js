import { Server as SocketServer } from "socket.io";
import { env } from "../config/validateEnv.js";

let io;

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

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join room for specific file
    socket.on("join-file-room", (fileId) => {
      socket.join(`file-${fileId}`);
    });

    // Leave file room
    socket.on("leave-file-room", (fileId) => {
      socket.leave(`file-${fileId}`);
    });

    // Handle new comment from client
    socket.on("new-comment", ({ comment, fileId }) => {
      // Broadcast to all other users in the file room
      socket.to(`file-${fileId}`).emit("new-comment", comment);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
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
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
