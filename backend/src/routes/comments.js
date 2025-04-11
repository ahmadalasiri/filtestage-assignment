import { z } from "zod";
import express from "express";
import { UnauthorizedError } from "../errors.js";
import { StringObjectId } from "../schemas.js";

export default function FileRoutes({ db, session }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { fileId } = z.object({ fileId: StringObjectId }).parse(req.query);

    const comments = await db
      .collection("comments")
      .find({ fileId }, { sort: { createdAt: 1 }, limit: 100 })
      .toArray();

    res.json(comments);
  });

  router.post("/", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { fileId, body, x, y } = z
      .object({
        fileId: StringObjectId,
        body: z.string(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
      })
      .parse(req.body);

    const { insertedId } = await db.collection("comments").insertOne({
      fileId,
      authorId: userId,
      body,
      x,
      y,
      createdAt: new Date(),
    });

    res
      .status(201)
      .json(await db.collection("comments").findOne({ _id: insertedId }));
  });

  return router;
}
