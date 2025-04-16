import express from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../exceptions/ApiError.js";

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
      throw new ApiError(401, "Not authenticated");
    }

    if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) {
      throw new ApiError(400, "Invalid file type");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(req.body.projectId) });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }
    if (!project.authorId.equals(userId)) {
      throw new ApiError(403, "Forbidden");
    }

    let deadline = null;
    if (req.body.deadline) {
      deadline = new Date(req.body.deadline);
      if (isNaN(deadline) || deadline <= new Date()) {
        throw new ApiError(
          400,
          "Deadline must be a valid future date and time",
        );
      }
    }

    const { insertedId } = await db.collection("files").insertOne({
      projectId: project._id,
      authorId: userId,
      name: req.file.originalname,
      path: req.file.path,
      createdAt: new Date(),
      deadline: deadline,
      version: 1,
      originalFileId: null,
    });

    res
      .status(201)
      .json(await db.collection("files").findOne({ _id: insertedId }));
  });

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(req.query.projectId) });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    if (
      !project.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      throw new ApiError(403, "Forbidden");
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
      throw new ApiError(401, "Not authenticated");
    }

    const file = await db.collection("files").findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!file) {
      throw new ApiError(404, "File not found");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });

    if (
      !file.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      console.log(file.authorId, userId, project.reviewers);
      throw new ApiError(403, "Forbidden");
    }

    res.json(file);
  });

  router.get("/:id/content", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!file) {
      throw new ApiError(404, "File not found");
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });

    if (
      !file.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      throw new ApiError(403, "Forbidden");
    }

    res.sendFile(path.join(process.cwd(), file.path));
  });

  router.patch("/:id/deadline", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const fileId = new ObjectId(req.params.id);
    const file = await db.collection("files").findOne({ _id: fileId });
    if (!file) {
      throw new ApiError(404, "File not found");
    }

    if (!file.authorId.equals(userId)) {
      throw new ApiError(403, "Forbidden");
    }

    let deadline = null;
    if (req.body.deadline) {
      deadline = new Date(req.body.deadline);
      if (isNaN(deadline)) {
        throw new ApiError(400, "Invalid date and time format");
      }
    }

    await db
      .collection("files")
      .updateOne({ _id: fileId }, { $set: { deadline } });

    const updatedFile = await db.collection("files").findOne({ _id: fileId });
    res.json(updatedFile);
  });

  router.post("/:id/versions", upload.single("file"), async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      // User not authenticated
      throw new ApiError(401, "Not authenticated");
    }

    if (!req.file || !["image/jpeg", "image/png"].includes(req.file.mimetype)) {
      throw new ApiError(400, "Invalid file type");
    }

    const fileId = new ObjectId(req.params.id);
    const file = await db.collection("files").findOne({ _id: fileId });

    if (!file) {
      throw new ApiError(404, "Original file not found");
    }

    let originalFileId = file._id;
    if (file.originalFileId) {
      originalFileId = file.originalFileId;
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: file.projectId });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    if (
      !project.authorId.equals(userId) &&
      !project.reviewers.some((reviewer) => reviewer.equals(userId))
    ) {
      // User does not have permissions for this project
      throw new ApiError(403, "Forbidden");
    }

    const latestVersion = await db
      .collection("files")
      .find({
        originalFileId: originalFileId,
      })
      .sort({ version: -1 })
      .limit(1)
      .toArray();

    const nextVersion =
      latestVersion.length > 0 ? latestVersion[0].version + 1 : 2;

    const { insertedId } = await db.collection("files").insertOne({
      projectId: file.projectId,
      authorId: userId,
      name: req.file.originalname || file.name,
      path: req.file.path,
      createdAt: new Date(),
      version: nextVersion,
      originalFileId: originalFileId,
    });

    res
      .status(201)
      .json(await db.collection("files").findOne({ _id: insertedId }));
  });

  return router;
}
