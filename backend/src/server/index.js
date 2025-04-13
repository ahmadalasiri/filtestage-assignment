import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import http from 'http';
import { initializeSocket } from './socket.js';
import { setupShutdownHandler } from '../exceptions/index.js';
import { errorMiddleware } from '../middleware/error/index.js';
import { notFound } from '../exceptions/index.js';
import { env } from '../config/validateEnv.js';
import { createAuthMiddleware } from '../middleware/auth/authMiddleware.js';

// Import route handlers
import AuthRoutes from '../routes/auth.js';
import UserRoutes from '../routes/user.js';
import ProjectRoutes from '../routes/projects.js';
import FileRoutes from '../routes/files.js';
import CommentRoutes from '../routes/comments.js';
import FolderRoutes from '../routes/folders.js';
import SearchRoutes from '../routes/search.js';

export class Server {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      corsOrigin: config.corsOrigin || env.FRONTEND_ORIGIN,
      cookieSecret: config.cookieSecret || env.COOKIE_SECRET,
      ...config
    };

    this.server = http.createServer(this.app);
    this.db = config.db;
    this.io = null;
    this.session = config.session;
    this.auth = createAuthMiddleware(this.session);

    this.configureMiddleware();
  }

  configureMiddleware() {
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true
    }));
    this.app.use(cookieParser(this.config.cookieSecret));
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
      search: SearchRoutes({ db, session })
    };

    // Public routes (no authentication required)
    this.app.use('/auth', routes.auth);

    // Protected routes (authentication required)
    this.app.use('/users', this.auth.authenticate, routes.users);
    this.app.use('/projects', this.auth.authenticate, routes.projects);
    this.app.use('/folders', this.auth.authenticate, routes.folders);
    this.app.use('/files', this.auth.authenticate, routes.files);
    this.app.use('/comments', this.auth.authenticate, routes.comments);
    this.app.use('/search', this.auth.authenticate, routes.search);

    // Error handling
    this.app.use(notFound);
    this.app.use(errorMiddleware);
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
        console.log(`Server running on port: ${port}`);
        resolve();
      });
    });
  }
}
