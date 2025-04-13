import { z } from "zod";
import express from "express";
import { ApiError } from "../exceptions/ApiError.js";
import { StringObjectId } from "../schemas.js";
import { ObjectId } from "mongodb";

export default function ProjectRoutes({ db, session }) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { name, folderId } = z.object({ 
      name: z.string(),
      folderId: z.string()
    }).parse(req.body);

    // Verify folder exists
    const folder = await db.collection("folders").findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      throw new ApiError(404, "Folder not found");
    }

    const { insertedId } = await db.collection("projects").insertOne({
      authorId: userId,
      name,
      reviewers: [],
      createdAt: new Date(),
      folderId: new ObjectId(folderId)
    });

    res
      .status(201)
      .json(await db.collection("projects").findOne({ _id: insertedId }));
  });

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const projects = await db
      .collection("projects")
      .find(
        { $or: [{ authorId: userId }, { reviewers: userId }] },
        { sort: { createdAt: 1 } },
      )
      .toArray();

    res.status(201).json(projects);
  });

  router.post("/:projectId/reviewers", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { projectId } = z
      .object({ projectId: StringObjectId })
      .parse(req.params);
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const project = await db.collection("projects").findOne({ _id: projectId });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }
    if (!project.authorId.equals(userId)) {
      throw new ApiError(403, "Forbidden: You don't have permission to modify this project");
    }

    const existingReviewer = await db.collection("users").findOne({ email });
    let reviewerId;
    if (existingReviewer) {
      reviewerId = existingReviewer._id;
    } else {
      ({ insertedId: reviewerId } = await db
        .collection("users")
        .insertOne({ email }));
    }

    await db
      .collection("projects")
      .updateOne({ _id: projectId }, { $addToSet: { reviewers: reviewerId } });

    res
      .status(201)
      .json(await db.collection("projects").findOne({ _id: projectId }));
  });

  return router;
}
