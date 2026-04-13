import { MongoClient, type Db } from "mongodb";
import { ENV } from "@/lib/env";

declare global {
  var __kroweMongoClient: MongoClient | undefined;
  var __kroweMongoClientPromise: Promise<MongoClient> | undefined;
}

let cachedClient = global.__kroweMongoClient;
let cachedPromise = global.__kroweMongoClientPromise;

function createClient(): MongoClient {
  if (!ENV.MONGODB_URI) {
    throw new Error("MongoDB is not configured: MONGODB_URI is missing");
  }
  return new MongoClient(ENV.MONGODB_URI);
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;

  if (!cachedPromise) {
    const client = createClient();
    cachedPromise = client.connect();
    global.__kroweMongoClientPromise = cachedPromise;
  }

  cachedClient = await cachedPromise;
  global.__kroweMongoClient = cachedClient;
  return cachedClient;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(ENV.MONGODB_DB_NAME);
}
