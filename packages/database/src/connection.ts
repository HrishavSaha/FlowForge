import {
  MongoClient,
  Db,
  type MongoClientOptions
} from "mongodb";

import { getDatabaseConfig } from "./config.js";

let client: MongoClient | null = null;
let database: Db | null = null;

let connectionPromise: Promise<Db> | null = null;

export async function connectDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const config = getDatabaseConfig();

      const mongoClient = new MongoClient(config.uri, {
        maxPoolSize: 20,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 5000
      } as MongoClientOptions);

      await mongoClient.connect();

      client = mongoClient;
      database = mongoClient.db(config.databaseName);

      console.log(
        `Connected to MongoDB database: ${config.databaseName}`
      );

      return database;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!database) {
    return connectDatabase();
  }

  return database;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();

    client = null;
    database = null;
    connectionPromise = null;

    console.log("MongoDB connection closed");
  }
}