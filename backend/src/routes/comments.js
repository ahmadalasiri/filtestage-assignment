import { z } from "zod";
import express from "express";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";
import { handleCommentMentions } from "../services/mentionService.js";

export default function CommentRoutes({ db, session }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const {
      fileId,
      page = 1,
      limit = 20,
    } = z
      .object({
        fileId: StringObjectId,
        page: z.string().optional(),
        limit: z.string().optional(),
      })
      .parse(req.query);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

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
      throw new ApiError(401, "Not authenticated");
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

    if (annotation) {
      commentData.annotation = annotation;
    }

    if (parentId) {
      commentData.parentId = parentId;
    }

    const { insertedId } = await db
      .collection("comments")
      .insertOne(commentData);

    const newComment = await db
      .collection("comments")
      .findOne({ _id: insertedId });

    // Get author information to include with the comment
    const author = await db.collection("users").findOne({ _id: userId });
    const commentWithAuthor = { ...newComment, author };

    // Process mentions
    await handleCommentMentions(db, newComment);

    res.status(201).json(commentWithAuthor);
  });

  return router;
}
