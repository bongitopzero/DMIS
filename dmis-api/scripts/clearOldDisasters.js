import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Disaster from "../models/Disaster.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

async function clearOldDisasters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");
    
    // Get all disasters sorted by creation date (newest first)
    const allDisasters = await Disaster.find().sort({ createdAt: -1 });
    
    if (allDisasters.length === 0) {
      console.log("ℹ️  No disasters found in database");
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📊 Found ${allDisasters.length} disasters\n`);
    
    // Keep the latest disaster, delete all others
    const latestDisaster = allDisasters[0];
    const disastersToDelete = allDisasters.slice(1);

    if (disastersToDelete.length === 0) {
      console.log("✅ Only 1 disaster exists - nothing to delete");
      console.log(`📌 Keeping: ${latestDisaster.type} in ${latestDisaster.district} (${new Date(latestDisaster.createdAt).toLocaleString()})`);
    } else {
      console.log(`🗑️  Deleting ${disastersToDelete.length} old disasters...\n`);

      // Delete old disasters and their household assessments
      for (const disaster of disastersToDelete) {
        console.log(`  Deleting: ${disaster.type} in ${disaster.district}`);
        
        // Delete associated household assessments
        const deletedAssessments = await HouseholdAssessment.deleteMany({ disasterId: disaster._id });
        console.log(`    └─ Removed ${deletedAssessments.deletedCount} household assessments`);
        
        // Delete the disaster
        await Disaster.deleteOne({ _id: disaster._id });
      }

      console.log(`\n✅ Deletion complete!\n`);
      console.log(`📌 Kept the latest disaster:`);
      console.log(`    Type: ${latestDisaster.type}`);
      console.log(`    District: ${latestDisaster.district}`);
      console.log(`    Date: ${new Date(latestDisaster.createdAt).toLocaleString()}`);
      console.log(`    Households: ${latestDisaster.numberOfHouseholdsAffected}`);
    }

    // Get final count
    const finalCount = await Disaster.countDocuments();
    console.log(`\n📊 Final database state: ${finalCount} disaster(s)`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

clearOldDisasters();
