import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { initializeSocket } from "./socket.js";
import { setupShutdownHandler } from "../exceptions/index.js";
import { errorHandler } from "../exceptions/errorHandler.js";
import { notFoundHandler } from "../exceptions/index.js";
import { env } from "../config/validateEnv.js";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";
import morganMiddleware from "../middleware/morganLogger.js";

// Import route handlers
import AuthRoutes from "../routes/auth.js";
import UserRoutes from "../routes/user.js";
import ProjectRoutes from "../routes/projects.js";
import FileRoutes from "../routes/files.js";
import CommentRoutes from "../routes/comments.js";
import FolderRoutes from "../routes/folders.js";
import SearchRoutes from "../routes/search.js";
import morgan from "morgan";

export class Server {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      corsOrigin: env.FRONTEND_ORIGIN,
      cookieSecret: env.COOKIE_SECRET,
      ...config,
    };

    this.server = http.createServer(this.app);
    this.db = config.db;
    this.io = null;
    this.session = config.session;
    this.auth = createAuthMiddleware(this.session);

    this.configureMiddleware();
  }

  configureMiddleware() {
    // this.app.use(morganMiddleware);
    this.app.use(morgan("dev"));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(
      cors({
        origin: [this.config.corsOrigin, "https://filestage.ahmadalasiri.info"],
        credentials: true,
      })
    );
    this.app.use(cookieParser(this.config.cookieSecret));

    this.app.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });
  }

  registerRoutes() {
    // Get the MongoDB database instance from the database service
    const db = this.db.db;
    const session = this.session;

    // Create route handlers
    const routes = {
      auth: AuthRoutes({ db, session }),
      users: UserRoutes({ db, session }),
      projects: ProjectRoutes({ db, session }),
      folders: FolderRoutes({ db, session }),
      files: FileRoutes({ db, session }),
      comments: CommentRoutes({ db, session }),
      search: SearchRoutes({ db, session }),
    };

    // Public routes (no authentication required)
    this.app.use("/auth", routes.auth);

    // Protected routes (authentication required)
    this.app.use("/users", this.auth.authenticate, routes.users);
    this.app.use("/projects", this.auth.authenticate, routes.projects);
    this.app.use("/folders", this.auth.authenticate, routes.folders);
    this.app.use("/files", this.auth.authenticate, routes.files);
    this.app.use("/comments", this.auth.authenticate, routes.comments);
    this.app.use("/search", this.auth.authenticate, routes.search);

    // Error handling
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  initializeSocketIO() {
    this.io = initializeSocket(this.server);
    return this.io;
  }

  setupShutdown() {
    setupShutdownHandler(this.server, this.db);
  }

  start(port) {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        logger.info(`Server running on port: ${port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        resolve();
      });
    });
  }
}
