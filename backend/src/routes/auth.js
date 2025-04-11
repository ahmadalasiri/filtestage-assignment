import { z } from "zod";
import express from "express";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import { ValidationError, UnauthorizedError } from "../errors.js";

export default function AuthRoutes({ db, session }) {
  const router = express.Router();

  const CredentialsSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  router.post("/signup", async (req, res) => {
    const { email, password } = CredentialsSchema.parse(req.body);

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser && existingUser.password) {
      throw new ValidationError("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let userId;
    if (existingUser) {
      await db
        .collection("users")
        .updateOne(
          { _id: existingUser._id },
          { $set: { password: hashedPassword } },
        );
    } else {
      ({ insertedId: userId } = await db
        .collection("users")
        .insertOne({ email, password: hashedPassword }));
    }

    await session.create(res, { userId });
    res.status(201).json({ userId });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = CredentialsSchema.parse(req.body);

    const user = await db.collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    await session.create(res, { userId: user._id });
    res.json({ userId: user._id });
  });

  router.get("/session", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    res.json({ userId });
  });

  router.post("/remove-account", async (req, res) => {
    const { userId } = await session.get(req);
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    await db.collection("users").deleteOne({ _id: userId });
    await db.collection("projects").deleteMany({ authorId: userId });
    const files = await db
      .collection("files")
      .find({ authorId: userId })
      .toArray();
    await Promise.all(files.map((file) => fs.unlink(file.path)));
    await db.collection("files").deleteMany({ authorId: userId });
    await session.remove(req, res);
    res.status(200).end();
  });

  router.post("/logout", async (req, res) => {
    await session.remove(req, res);
    res.status(200).end();
  });

  return router;
}
