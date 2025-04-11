import express from "express";
import { z } from "zod";
import { UnauthorizedError, NotFoundError } from "../errors.js";
import { StringObjectId } from "../schemas.js";

export default function UserRoutes({ db, session }) {
  const router = express.Router();

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
