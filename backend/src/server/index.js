import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import http from 'http';
import { initializeSocket } from '../services/socket.js';
import { setupShutdownHandler } from '../exceptions/index.js';
import { errorMiddleware } from '../middleware/error/index.js';
import { notFound } from '../exceptions/index.js';
import { env } from '../config/validateEnv.js';

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

  registerRoutes(routes) {
    this.app.use('/auth', routes.auth);
    this.app.use('/users', routes.users);
    this.app.use('/projects', routes.projects);
    this.app.use('/folders', routes.folders);
    this.app.use('/files', routes.files);
    this.app.use('/comments', routes.comments);
    this.app.use('/search', routes.search);
    
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
