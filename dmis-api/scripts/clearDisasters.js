import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");
    
    // Drop the disasters collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    const disasterCollection = collections.find(c => c.name === 'disasters');
    
    if (disasterCollection) {
      await mongoose.connection.db.collection('disasters').drop();
      console.log("🗑️  Dropped 'disasters' collection");
    } else {
      console.log("ℹ️  No 'disasters' collection found");
    }
    
    console.log("✅ Database cleared successfully\n");
    console.log("💡 Now run: node scripts/importExcel.js to re-import data");
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearDatabase();
