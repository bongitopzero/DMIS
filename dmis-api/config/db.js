import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB_NAME || "dmis";

const client = new MongoClient(uri);
let db;

export async function connectDB() {
  if (db) {
    return db;
  }

  await client.connect();
  db = client.db(dbName);
  console.log("✅ MongoDB Connected (native driver)");
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return db;
}
