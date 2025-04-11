import { MongoClient } from "mongodb";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Session from "./src/session.js";
import AuthRoutes from "./src/routes/auth.js";
import UserRoutes from "./src/routes/user.js";
import ProjectRoutes from "./src/routes/projects.js";
import FileRoutes from "./src/routes/files.js";
import CommentRoutes from "./src/routes/comments.js";
import { errorHandler } from "./src/errors.js";

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log("Connected to database");

  const db = client.db("filestage");

  const session = await Session({ db });

  const app = express();

  app.use(express.json());
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.use("/auth", AuthRoutes({ db, session }));
  app.use("/users", UserRoutes({ db, session }));
  app.use("/projects", ProjectRoutes({ db, session }));
  app.use("/files", FileRoutes({ db, session }));
  app.use("/comments", CommentRoutes({ db, session }));

  app.use(errorHandler);

  app.listen(process.env.PORT, () =>
    console.log(`Server running on port: ${process.env.PORT}`),
  );

  process.on("SIGINT", async () => {
    await client.close();
    process.exit();
  });
}

main();
