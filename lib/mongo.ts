import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL;

function getMongoClient(): MongoClient {
  if (!uri) {
    throw new Error("DATABASE_URL is not set");
  }
  const g = globalThis as typeof globalThis & { _mongoClient?: MongoClient };
  if (!g._mongoClient) {
    g._mongoClient = new MongoClient(uri);
  }
  return g._mongoClient;
}

export function getMongoDb() {
  return getMongoClient().db();
}

export { getMongoClient };
