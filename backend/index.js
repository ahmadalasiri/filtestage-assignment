import { MongoClient } from "mongodb";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";

import Session from "./src/session.js";
import AuthRoutes from "./src/routes/auth.js";
import UserRoutes from "./src/routes/user.js";
import ProjectRoutes from "./src/routes/projects.js";
import FileRoutes from "./src/routes/files.js";
import CommentRoutes from "./src/routes/comments.js";
import FolderRoutes from "./src/routes/folders.js";
import SearchRoutes from "./src/routes/search.js";
import { initializeSocket } from "./src/services/socket.js";
import { notFound, setupShutdownHandler } from "./src/exceptions/index.js";
import { ApiError } from "./src/exceptions/ApiError.js";
import { errorMiddleware } from "./src/middleware/error/index.js";

dotenv.config();

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log("Connected to database");

  const db = client.db("filestage");

  const session = await Session({ db });

  const app = express();
  const server = http.createServer(app);

  app.use(morgan("dev"));
  app.use(express.json());
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.use("/auth", AuthRoutes({ db, session }));
  app.use("/users", UserRoutes({ db, session }));
  app.use("/projects", ProjectRoutes({ db, session }));
  app.use("/folders", FolderRoutes({ db, session }));
  app.use("/files", FileRoutes({ db, session }));
  app.use("/comments", CommentRoutes({ db, session }));
  app.use("/search", SearchRoutes({ db, session }));

  // Initialize Socket.IO
  const io = initializeSocket(server);

  // Handle 404 routes
  app.use((req, res, next) => {
    next(new ApiError(404, `Not found - ${req.originalUrl}`));
  });

  // Global error handling middleware
  app.use(errorMiddleware);

  server.listen(process.env.PORT, () =>
    console.log(`Server running on port: ${process.env.PORT}`)
  );

  // Set up graceful shutdown handler
  setupShutdownHandler(server, client);
}

main();

