import express from "express";
import { z } from "zod";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";

export default function UserRoutes({ db, session }) {
  const router = express.Router();

  // Get user suggestions for mentions
  router.get("/suggestions", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { query, projectId } = z
      .object({
        query: z.string().optional().default(''),
        projectId: StringObjectId.optional(),
      })
      .parse(req.query);

    // Create a pattern for the email search
    // Use a string pattern that can be properly serialized in logs
    const emailPattern = query || '';

    // Start with a simple query that excludes the current user
    let userQuery = {
      _id: { $ne: userId }
    };

    // Add email filter if query is provided
    if (emailPattern) {
      userQuery.email = { $regex: emailPattern, $options: 'i' };
    }

    // If projectId is provided, filter by project access
    if (projectId) {
      try {
        const project = await db.collection("projects").findOne({ _id: projectId });

        if (project) {
          // Get all users who are either the author or reviewers of the project
          const projectUserIds = [
            project.authorId,
            ...(project.reviewers || []),
          ].filter(Boolean).map(id => id.toString());

          // Get all users and filter manually to avoid ObjectId comparison issues
          const allUsers = await db.collection("users").find().toArray();

          // Filter users who are part of the project and not the current user
          const filteredUsers = allUsers.filter(user => {
            const userIdStr = user._id.toString();
            return projectUserIds.includes(userIdStr) && userIdStr !== userId.toString();
          });

          // Return the filtered users directly
          return res.json(filteredUsers.map(user => ({
            _id: user._id,
            email: user.email
          })));

          // Skip the regular query path since we're returning directly
        } else {
          console.log(`No project found with ID: ${projectId}`);
        }
      } catch (error) {
        console.error(`Error filtering by project: ${error.message}`);
        // If there's an error with the project filter, just return all users
      }
    }

    try {
      const users = await db
        .collection("users")
        .find(userQuery)
        .limit(10)
        .project({ _id: 1, email: 1 })
        .toArray();

      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user by ID
  router.get("/:userId", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { userId: targetUserId } = z
      .object({ userId: StringObjectId })
      .parse(req.params);

    const user = await db
      .collection("users")
      .findOne({ _id: targetUserId }, { password: 0 });
    if (!user) {
      throw new NotFoundError();
    }

    res.status(200).json(user);
  });



  return router;
}
