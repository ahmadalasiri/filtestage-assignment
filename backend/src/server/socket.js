import { Server as SocketServer } from "socket.io";
import { env } from "../config/validateEnv.js";
import { ApiError } from "../exceptions/ApiError.js";

let io;
// Map to store user socket connections
const socketUserMap = new Map();

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP server instance
 * @param {object} session - Session service
 * @returns {object} Socket.IO server instance
 */
export const initializeSocket = (server, session) => {
  io = new SocketServer(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      // Log raw cookie header for debugging
      const cookieHeader = socket.handshake.headers.cookie;
      console.log(`Socket ${socket.id} cookies: ${cookieHeader}`);

      // Get session data from the socket handshake
      const sessionData = await session.getFromSocket(socket);

      if (!sessionData || !sessionData.userId) {
        console.log(
          "Socket auth failed: No valid session data",
          socket.id,
          socket.handshake.headers.cookie ? "Has cookies" : "No cookies"
        );
        // Allow unauthenticated connections but mark them
        socket.data.authenticated = false;
        socket.data.userId = null;
        return next();
      }

      // Store user ID in socket data
      socket.data.authenticated = true;
      socket.data.userId = sessionData.userId;
      socketUserMap.set(socket.id, sessionData.userId);

      console.log(
        `Socket ${socket.id} authenticated as user ${sessionData.userId}`
      );
      next();
    } catch (error) {
      console.error(
        "Socket authentication error:",
        error,
        "Socket ID:",
        socket.id
      );
      // Allow unauthenticated connections but mark them
      socket.data.authenticated = false;
      socket.data.userId = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    const userInfo = socket.data.authenticated
      ? `User: ${socket.data.userId}`
      : "Not authenticated";

    console.log(`Client connected: ${socket.id} - ${userInfo}`);

    // Manual authentication fallback for clients with cookie issues
    socket.on("authenticate", (token) => {
      // Log the authentication attempt with the token received
      console.log(`Socket ${socket.id} manual authentication attempt:`, token);

      // This is a simplified approach, you would implement proper token verification
      if (token && token.userId) {
        try {
          // Validate that the userId is in a valid format (you'd typically verify it against your database)
          // For now we're just ensuring it's a non-empty string
          if (typeof token.userId === "string" && token.userId.trim() !== "") {
            console.log(
              `Socket ${socket.id} manually authenticated as user: ${token.userId}`
            );
            socket.data.authenticated = true;
            socket.data.userId = token.userId;
            socketUserMap.set(socket.id, token.userId);

            // Emit an authentication success event that the client can listen for
            socket.emit("authentication_success", {
              userId: token.userId,
              message: "Manual authentication successful",
            });

            return;
          }
        } catch (error) {
          console.error("Error during manual authentication:", error);
        }
      }

      // If we reached here, authentication failed
      console.log(`Socket ${socket.id} manual authentication failed`);
      socket.emit("error", {
        message: "Authentication failed - invalid token",
      });
    });

    // Join room for specific file (require authentication)
    socket.on("join-file-room", (fileId) => {
      // Special case for auth-check, don't emit error but log authentication status
      if (fileId === "auth-check") {
        const status = socket.data.authenticated
          ? "authenticated"
          : "not authenticated";
        console.log(`Auth check for socket ${socket.id}: ${status}`);

        // If authenticated, send success response
        if (socket.data.authenticated) {
          socket.emit("authentication_success", {
            userId: socket.data.userId,
            message: "Authentication verified via auth-check",
          });
        } else {
          // If not authenticated, try to salvage by asking for manual authentication
          socket.emit("need_authentication", {
            message: "Authentication required - please authenticate manually",
          });
        }
        return;
      }

      // Normal file room join logic
      if (!socket.data.authenticated) {
        socket.emit("error", {
          message: "Authentication required to join file rooms",
        });
        return;
      }

      console.log(
        `User ${socket.data.userId} joining room for file: ${fileId}`
      );
      socket.join(`file-${fileId}`);
    });

    // Leave file room
    socket.on("leave-file-room", (fileId) => {
      console.log(
        `User ${socket.data.userId || "unknown"} leaving room for file: ${fileId}`
      );
      socket.leave(`file-${fileId}`);
    });

    // Handle new comment from client (require authentication)
    socket.on("new-comment", ({ comment, fileId }) => {
      if (!socket.data.authenticated) {
        socket.emit("error", {
          message: "Authentication required to post comments",
        });
        return;
      }

      console.log(
        `User ${socket.data.userId} sent a new comment for file: ${fileId}`
      );

      // Broadcast to all other users in the file room
      socket.to(`file-${fileId}`).emit("new-comment", comment);
    });

    socket.on("disconnect", () => {
      const userInfo = socket.data.authenticated
        ? `User: ${socket.data.userId}`
        : "Not authenticated";

      console.log(`Client disconnected: ${socket.id} - ${userInfo}`);
      // Clean up the socket-user mapping
      socketUserMap.delete(socket.id);
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
