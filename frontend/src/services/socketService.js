import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";

let socket = null;

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
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("error", (error) => {
      console.warn("Socket error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
  }

  return socket;
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
 */
export const useFileSocket = (fileId, onNewComment) => {
  const [isConnected, setIsConnected] = useState(false);

  // Use a ref to store the callback to avoid dependency changes
  const onNewCommentRef = useRef(onNewComment);

  // Update the ref when the callback changes
  useEffect(() => {
    onNewCommentRef.current = onNewComment;
  }, [onNewComment]);

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

    // Set up event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("new-comment", handleNewComment);

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

      // Leave the file room
      if (socket.connected) {
        socket.emit("leave-file-room", fileId);
      }
    };
  }, [fileId]); // Only fileId as dependency

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
