import { z } from "zod";
import express from "express";
import { UnauthorizedError, NotFoundError, ForbiddenError } from "../errors.js";
import { StringObjectId } from "../schemas.js";

export default function ProjectRoutes({ db, session }) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { name } = z.object({ name: z.string() }).parse(req.body);

    const { insertedId } = await db.collection("projects").insertOne({
      authorId: userId,
      name,
      reviewers: [],
      createdAt: new Date(),
    });

    res
      .status(201)
      .json(await db.collection("projects").findOne({ _id: insertedId }));
  });

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
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
      throw new UnauthorizedError();
    }

    const { projectId } = z
      .object({ projectId: StringObjectId })
      .parse(req.params);
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const project = await db.collection("projects").findOne({ _id: projectId });
    if (!project) {
      throw NotFoundError();
    }
    if (!project.authorId.equals(userId)) {
      throw new ForbiddenError();
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
