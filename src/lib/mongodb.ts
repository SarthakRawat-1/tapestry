/**
 * MongoDB client with connection caching for serverless environments.
 * Reuses the MongoClient promise across hot reloads in development
 * and across invocations in production (Vercel serverless).
 */

import { MongoClient, Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || "history";

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (process.env.NODE_ENV === "development") {
    // In dev, reuse the client across hot reloads
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export { getClientPromise as clientPromise };

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}
