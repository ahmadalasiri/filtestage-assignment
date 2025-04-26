import { z } from "zod";
import express from "express";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";
import { handleCommentMentions } from "../services/mentionService.js";

export default function CommentRoutes({ db, session }) {
  const router = express.Router();

  // Enhanced endpoint to only return parent comments with pagination
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

    // Get total count for pagination
    const totalParentComments = await db
      .collection("comments")
      .countDocuments({ fileId, parentId: { $exists: false } });

    // Use aggregation pipeline to get comments with author info and reply counts in one query
    const commentsPipeline = [
      // Match parent comments for the specified file
      {
        $match: {
          fileId,
          parentId: { $exists: false },
        },
      },
      // Sort by creation time
      {
        $sort: {
          createdAt: 1,
        },
      },
      // Apply pagination
      {
        $skip: skip,
      },
      {
        $limit: limitNum,
      },
      // Lookup author information
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      // Convert author array to single object
      {
        $addFields: {
          author: { $arrayElemAt: ["$authorInfo", 0] },
        },
      },
      // Lookup reply count
      {
        $lookup: {
          from: "comments",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$parentId", "$$commentId"] },
              },
            },
            {
              $count: "replyCount",
            },
          ],
          as: "replyData",
        },
      },
      // Convert reply count array to single value
      {
        $addFields: {
          replyCount: {
            $cond: {
              if: { $gt: [{ $size: "$replyData" }, 0] },
              then: { $arrayElemAt: ["$replyData.replyCount", 0] },
              else: 0,
            },
          },
        },
      },
      // Remove temporary fields
      {
        $project: {
          authorInfo: 0,
          replyData: 0,
        },
      },
    ];

    const commentsWithAuthors = await db
      .collection("comments")
      .aggregate(commentsPipeline)
      .toArray();

    res.json({
      comments: commentsWithAuthors,
      pagination: {
        total: totalParentComments,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalParentComments / limitNum),
      },
    });
  });

  // Get children comments for a specific parent comment
  router.get("/:parentId/replies", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { parentId } = z
      .object({
        parentId: StringObjectId,
      })
      .parse(req.params);

    const { page = 1, limit = 20 } = z
      .object({
        page: z.string().optional(),
        limit: z.string().optional(),
      })
      .parse(req.query);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Verify parent comment exists
    const parentComment = await db
      .collection("comments")
      .findOne({ _id: parentId });
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }

    // Get total count for pagination
    const totalChildComments = await db
      .collection("comments")
      .countDocuments({ parentId });

    // Use aggregation pipeline to get child comments with author info
    const childCommentsPipeline = [
      // Match child comments for the specified parent
      {
        $match: {
          parentId,
        },
      },
      // Sort by creation time
      {
        $sort: {
          createdAt: 1,
        },
      },
      // Apply pagination
      {
        $skip: skip,
      },
      {
        $limit: limitNum,
      },
      // Lookup author information
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      // Convert author array to single object and remove temporary fields
      {
        $addFields: {
          author: { $arrayElemAt: ["$authorInfo", 0] },
        },
      },
      {
        $project: {
          authorInfo: 0,
        },
      },
    ];

    const commentsWithAuthors = await db
      .collection("comments")
      .aggregate(childCommentsPipeline)
      .toArray();

    res.json({
      comments: commentsWithAuthors,
      pagination: {
        total: totalChildComments,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalChildComments / limitNum),
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

    // Get the file to check deadline
    const file = await db.collection("files").findOne({ _id: fileId });
    if (!file) {
      throw new ApiError(404, "File not found");
    }

    // Get the project to check if the user is a reviewer
    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    const isFileOwner = file.authorId.equals(userId);
    const isReviewer = project.reviewers.some((reviewer) =>
      reviewer.equals(userId),
    );

    // Check deadline only for reviewers, not for file owners
    if (isReviewer && !isFileOwner && file.deadline) {
      const now = new Date();
      const deadline = new Date(file.deadline);

      if (now > deadline) {
        throw new ApiError(
          403,
          "Review deadline has passed. Comments can no longer be added.",
        );
      }
    }

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
      // Verify parent comment exists
      const parentComment = await db
        .collection("comments")
        .findOne({ _id: parentId });
      if (!parentComment) {
        throw new ApiError(404, "Parent comment not found");
      }

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
