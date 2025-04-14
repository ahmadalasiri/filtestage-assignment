import express from "express";
import { z } from "zod";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";
import { ObjectId } from "mongodb";

export default function UserRoutes({ db, session }) {
  const router = express.Router();

  router.get("/suggestions", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { query, projectId } = z
      .object({
        query: z.string().optional().default(""),
        projectId: StringObjectId,
      })
      .parse(req.query);

    const emailPattern = query || "";

    const project = await db.collection("projects").findOne({ _id: projectId });

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert project member IDs to ObjectId instances for accurate comparison
    const projectUserObjectIds = [
      project.authorId,
      ...(project.reviewers || []),
    ]
      .filter(Boolean)
      .map((id) => {
        // Handle cases where the ID might already be an ObjectId or a string
        return id instanceof ObjectId ? id : new ObjectId(id.toString());
      });

    const userSuggestions = await db
      .collection("users")
      .aggregate([
        {
          // Match only users who are part of the project and not the current user
          $match: {
            _id: {
              $in: projectUserObjectIds,
              $ne:
                userId instanceof ObjectId
                  ? userId
                  : new ObjectId(userId.toString()),
            },
            // Apply email pattern matching if provided
            ...(emailPattern && {
              email: { $regex: emailPattern, $options: "i" },
            }),
          },
        },
        {
          $limit: 10,
        },
        {
          // Project only the fields we need
          $project: {
            _id: 1,
            email: 1,
          },
        },
      ])
      .toArray();

    return res.json(userSuggestions);
  });

  // Get user by ID
  router.get("/:userId", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { userId: targetUserId } = z
      .object({ userId: StringObjectId })
      .parse(req.params);

    const user = await db
      .collection("users")
      .findOne({ _id: targetUserId }, { projection: { password: 0 } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json(user);
  });

  return router;
}
