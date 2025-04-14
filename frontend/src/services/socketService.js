import { io } from "socket.io-client";
import { useEffect, useState, useRef, useCallback } from "react";

let socket = null;
let currentUserId = null;

/**
 * Initialize the Socket.IO connection
 * @returns {object} Socket.IO client instance
 */
export const initializeSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_ORIGIN, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      // Always try manual authentication on connection, even if cookie auth might work
      if (currentUserId) {
        console.log("Attempting authentication on initial connection");
        setTimeout(() => manualAuthenticate(), 200);
      }
    });

    // Listen for authentication success
    socket.on("authentication_success", (data) => {
      console.log("Socket authentication successful:", data);
    });

    // Listen for authentication requests from the server
    socket.on("need_authentication", (data) => {
      console.log("Server requested authentication:", data);
      if (currentUserId) {
        console.log("Responding with manual authentication");
        manualAuthenticate();
      }
    });

    socket.on("error", (error) => {
      console.warn("Socket error:", error);
      // If it's an authentication error and we have a userId, try manual authentication
      if (
        error.message &&
        error.message.includes("Authentication") &&
        currentUserId
      ) {
        console.log(
          "Authentication error detected, trying manual authentication"
        );
        manualAuthenticate();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      // If we have a userId, let's try to reconnect with manual auth in case cookies are the issue
      if (currentUserId) {
        setTimeout(() => {
          console.log("Attempting reconnection with manual authentication...");
          // Ensure socket is connected before authentication
          if (socket.connected) {
            manualAuthenticate();
          }
        }, 1000);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      // If we're disconnected due to a transport error, try to reconnect
      if (reason === "transport error" && currentUserId) {
        console.log("Attempting to reconnect after transport error...");
        socket.connect();
      }
    });
  }

  return socket;
};

/**
 * Manually authenticate with the socket server if cookie-based auth fails
 * This is a fallback method that uses a simpler token-based approach
 */
const manualAuthenticate = () => {
  if (!currentUserId || !socket) return;

  console.log(
    "Attempting manual socket authentication with user ID:",
    currentUserId
  );

  // Log connection status before attempting authentication
  console.log(
    "Socket connection status before manual auth:",
    socket.connected ? "Connected" : "Disconnected"
  );

  // Only emit if socket is connected
  if (socket.connected) {
    // Send a correctly formatted userId
    socket.emit("authenticate", {
      userId: currentUserId.toString(),
      timestamp: Date.now(), // Add a timestamp to help with debugging
    });
    console.log("Manual authentication request sent");

    // Set up a retry if we don't get a success response soon
    setTimeout(() => {
      // Check if we're authenticated by trying to join a dummy room
      // This will trigger an error if we're not authenticated
      socket.emit("join-file-room", "auth-check");
    }, 1000);
  } else {
    console.log("Cannot authenticate - socket not connected");
    // Try to connect first
    socket.connect();

    // Set up a retry after connection
    setTimeout(() => {
      if (socket.connected) {
        manualAuthenticate();
      } else {
        console.log("Socket still not connected after reconnection attempt");
      }
    }, 1000);
  }
};

/**
 * Set the current user ID for socket identification
 * @param {string} userId - The ID of the current user
 */
export const setSocketUser = (userId) => {
  currentUserId = userId;
  const activeSocket = getSocket();

  // If socket is connected but possibly not authenticated, try manual authentication
  if (activeSocket.connected) {
    manualAuthenticate();
  }
};

/**
 * Get the Socket.IO client instance
 * @returns {object} Socket.IO client instance
 */
export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Hook to join a file room and listen for new comments
 * @param {string} fileId - The ID of the file to join
 * @param {function} onNewComment - Callback function when a new comment is received
 * @param {string} userId - The ID of the current user
 */
export const useFileSocket = (fileId, onNewComment, userId) => {
  const [isConnected, setIsConnected] = useState(false);

  // Use a ref to store the callback to avoid dependency changes
  const onNewCommentRef = useRef(onNewComment);

  // Update the ref when the callback changes
  useEffect(() => {
    onNewCommentRef.current = onNewComment;
  }, [onNewComment]);

  // Set the user ID for socket identification
  useEffect(() => {
    if (userId) {
      setSocketUser(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!fileId) return;

    const socket = getSocket();

    // Handle connection status
    const handleConnect = () => {
      setIsConnected(true);
      // Join the file room
      socket.emit("join-file-room", fileId);
      console.log(`Socket connected and joined file room: file-${fileId}`);
    };

    const handleDisconnect = (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    };

    // Listen for new comments
    const handleNewComment = (comment) => {
      // Make sure we have a valid comment with required fields
      if (!comment || !comment._id || !comment.body) {
        console.error("Received invalid comment data");
        return;
      }

      if (onNewCommentRef.current) {
        onNewCommentRef.current(comment);
      }
    };

    // Handle socket errors
    const handleError = (error) => {
      console.error("Socket error:", error);
      // If authentication error, try manual authentication
      if (error.message && error.message.includes("Authentication") && userId) {
        manualAuthenticate();
        // Try to join the room again after authentication
        setTimeout(() => {
          socket.emit("join-file-room", fileId);
        }, 500);
      }
    };

    // Set up event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("new-comment", handleNewComment);
    socket.on("error", handleError);

    // If already connected, join the room immediately
    if (socket.connected) {
      socket.emit("join-file-room", fileId);
      setIsConnected(true);
    }

    // Clean up event listeners when component unmounts
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("new-comment", handleNewComment);
      socket.off("error", handleError);

      // Leave the file room
      if (socket.connected) {
        socket.emit("leave-file-room", fileId);
      }
    };
  }, [fileId, userId]); // Add userId to dependencies to re-establish connection when user changes

  return { isConnected };
};

/**
 * Emit a new comment to all users in a file room
 * @param {object} comment - The comment object to broadcast
 * @param {string} fileId - The ID of the file the comment belongs to
 * @returns {boolean} - Whether the emission was successful
 */
export const emitNewComment = (comment, fileId) => {
  const socket = getSocket();
  if (!socket || !socket.connected) {
    console.error("Socket not connected, can't emit new comment");
    return false;
  }

  try {
    socket.emit("new-comment", {
      comment,
      fileId,
    });
    return true;
  } catch (error) {
    console.error("Error emitting new comment:", error);
    return false;
  }
};
