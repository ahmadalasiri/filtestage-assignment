import express from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../errors.js";

export default function FileRoutes({ db, session }) {
  const router = express.Router();

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  const upload = multer({ dest: "uploads/" });

  router.post("/", upload.single("file"), async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) {
      throw new ValidationError("Invalid file type");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(req.body.projectId) });
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    if (!project.authorId.equals(userId)) {
      throw new ForbiddenError();
    }

    let deadline = null;
    if (req.body.deadline) {
      deadline = new Date(req.body.deadline);
      if (isNaN(deadline) || deadline <= new Date()) {
        throw new ValidationError("Deadline must be a valid future date and time");
      }
    }

    const { insertedId } = await db.collection("files").insertOne({
      projectId: project._id,
      authorId: userId,
      name: req.file.originalname,
      path: req.file.path,
      createdAt: new Date(),
      deadline: deadline,
    });

    res
      .status(201)
      .json(await db.collection("files").findOne({ _id: insertedId }));
  });

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(req.query.projectId) });
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    if (
      !project.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      throw new ForbiddenError();
    }

    res.json(
      await db
        .collection("files")
        .find({ projectId: project._id }, { sort: { createdAt: 1 } })
        .toArray(),
    );
  });

  router.get("/:id", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!file) {
      throw new NotFoundError("File not found");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });

    if (
      !file.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      throw new ForbiddenError();
    }

    res.json(file);
  });

  router.get("/:id/content", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!file) {
      throw new NotFoundError("File not found");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });

    if (
      !file.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      throw new ForbiddenError();
    }

    res.sendFile(path.join(process.cwd(), file.path));
  });

  // Add endpoint to update file deadline
  router.patch("/:id/deadline", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const fileId = new ObjectId(req.params.id);
    const file = await db.collection("files").findOne({ _id: fileId });
    if (!file) {
      throw new NotFoundError("File not found");
    }

    if (!file.authorId.equals(userId)) {
      throw new ForbiddenError("Only the file owner can update the deadline");
    }

    let deadline = null;
    if (req.body.deadline) {
      deadline = new Date(req.body.deadline);
      if (isNaN(deadline)) {
        throw new ValidationError("Invalid date and time format");
      }
    }

    await db.collection("files").updateOne(
      { _id: fileId },
      {
        $set: {
          deadline: deadline
        }
      }
    );

    const updatedFile = await db.collection("files").findOne({ _id: fileId });
    res.json(updatedFile);
  });

  return router;
}
