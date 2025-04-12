import { z } from "zod";
import express from "express";
import { UnauthorizedError } from "../errors.js";
import { StringObjectId } from "../schemas.js";
import { processMentions, formatMentions } from "../services/mentionService.js";
import { getSocketIO } from "../services/socket.js";

export default function CommentRoutes({ db, session }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const {
      fileId,
      page = "1",
      limit = "20",
    } = z
      .object({
        fileId: StringObjectId,
        page: z.string().optional(),
        limit: z.string().optional(),
      })
      .parse(req.query);

    // Convert pagination parameters to numbers and validate
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Get all comments for this file
    const allComments = await db
      .collection("comments")
      .find({ fileId })
      .sort({ createdAt: 1 })
      .toArray();

    // Create a map to group replies with their parent comments
    const commentGroups = new Map();
    const topLevelComments = [];

    // First, identify all top-level comments and create groups
    allComments.forEach((comment) => {
      if (!comment.parentId) {
        topLevelComments.push(comment);
        commentGroups.set(comment._id.toString(), [comment]);
      }
    });

    // Then, add replies to their respective parent groups
    allComments.forEach((comment) => {
      if (comment.parentId) {
        const parentId = comment.parentId.toString();
        if (commentGroups.has(parentId)) {
          commentGroups.get(parentId).push(comment);
        }
      }
    });

    // Convert the map to a 2D array structure
    const nestedComments = Array.from(commentGroups.values());

    // Sort the outer array by the creation date of the first comment in each group (parent comment)
    nestedComments.sort(
      (a, b) => new Date(a[0].createdAt) - new Date(b[0].createdAt),
    );

    // Apply pagination
    const totalGroups = nestedComments.length;
    const paginatedComments = nestedComments.slice(skip, skip + limitNum);

    // Return paginated results with metadata
    res.json({
      comments: paginatedComments,
      pagination: {
        total: totalGroups,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalGroups / limitNum),
      },
    });
  });

  router.post("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { fileId, body, x, y, parentId, annotation } = z
      .object({
        fileId: StringObjectId,
        body: z.string(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        parentId: StringObjectId.optional(),
        annotation: z.string().optional(), // Base64 encoded image data for annotations
      })
      .parse(req.body);

    // Create the comment object
    const commentData = {
      fileId,
      authorId: userId,
      body,
      x,
      y,
      createdAt: new Date(),
    };

    // Add annotation if provided
    if (annotation) {
      commentData.annotation = annotation;
    }

    // If this is a reply, add the parentId
    if (parentId) {
      // Verify the parent comment exists
      const parentComment = await db
        .collection("comments")
        .findOne({ _id: parentId });
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      commentData.parentId = parentId;
    }

    const { insertedId } = await db
      .collection("comments")
      .insertOne(commentData);

    const newComment = await db.collection("comments").findOne({ _id: insertedId });

    // Get author information to include with the comment
    const author = await db.collection("users").findOne({ _id: userId });
    const commentWithAuthor = { ...newComment, author };

    // Emit real-time event to all users viewing this file
    try {
      const io = getSocketIO();
      
      // Emit to specific room
      io.to(`file-${fileId}`).emit('new-comment', commentWithAuthor);
      
      // Also emit to all connected clients as a fallback
      io.emit('global-new-comment', {
        ...commentWithAuthor,
        fileId: fileId.toString()
      });
    } catch (error) {
      console.error('Socket.IO error when emitting comment:', error.message);
      // Continue with the comment creation process even if socket fails
    }

    // Process mentions and send notifications
    try {
      // Check if the comment contains any mentions
      if (body.includes('@')) {
        // Get file and project information for the email template
        const file = await db.collection("files").findOne({ _id: fileId });
        if (!file) {
          throw new Error('File not found');
        }

        const project = await db.collection("projects").findOne({ _id: file.projectId });
        if (!project) {
          throw new Error('Project not found');
        }

        const commentAuthor = await db.collection("users").findOne({ _id: userId });
        if (!commentAuthor) {
          throw new Error('Author not found');
        }

        // Process mentions and send notifications
        const mentionResults = await processMentions(db, newComment, file, project, commentAuthor);

        // Store mention results in the comment for reference
        if (mentionResults && mentionResults.length > 0) {
          await db.collection("comments").updateOne(
            { _id: insertedId },
            { $set: { mentionNotifications: mentionResults } }
          );
        }
      }
    } catch (error) {
      console.error('Error processing mentions:', error.message);
      // Continue with the comment creation process
    }

    res.status(201).json(newComment);
  });

  return router;
}