import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB_NAME || "dmis";

const run = async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const incidents = db.collection("incidents");

  const oldest = await incidents.find().sort({ date: 1 }).limit(1).toArray();
  const newest = await incidents.find().sort({ date: -1 }).limit(1).toArray();

  console.log("Oldest incident:", oldest[0]?.date || "none");
  console.log("Newest incident:", newest[0]?.date || "none");

  await client.close();
};

run().catch((error) => {
  console.error("Range check failed:", error);
  process.exit(1);
});
