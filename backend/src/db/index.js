import { MongoClient } from 'mongodb';

export class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(mongoUri) {
    try {
      this.client = new MongoClient(mongoUri);
      await this.client.connect();

      this.db = this.client.db('filestage');
      console.log(`MongoDB Connected: ${this.client.options.hosts[0]}`);

      return this.db;
    } catch (error) {
      console.error(`Failed to connect to database: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('Database connection closed');
    }
  }
}
