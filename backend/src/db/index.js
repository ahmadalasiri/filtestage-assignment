import { MongoClient } from "mongodb";
import logger from "../utils/logger.js";

export class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(mongoUri) {
    try {
      this.client = new MongoClient(mongoUri);

      await this.client.connect();

      this.db = this.client.db("filestage");

      const host = this.client.options.hosts[0];
      logger.info(`MongoDB Connected: ${host}`);

      return this.db;
    } catch (error) {
      logger.error(`Failed to connect to database: ${error.message}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      logger.info("Database connection closed");
    }
  }
}
