import dotenv from "dotenv";
import mongoose from "mongoose";
import Disaster from "../models/Disaster.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

dotenv.config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Check all disasters
    const disasters = await Disaster.find();
    console.log(`📊 Total Disasters: ${disasters.length}\n`);

    for (let d of disasters) {
      console.log(`🔍 Disaster: ${d.type.toUpperCase()} in ${d.district}`);
      console.log(`   ID: ${d._id}`);
      console.log(`   Created: ${new Date(d.createdAt).toLocaleString()}\n`);

      // Check household assessments
      const assessments = await HouseholdAssessment.find({ disasterId: d._id });
      console.log(`   📋 Household Assessments found: ${assessments.length}`);
      
      if (assessments.length > 0) {
        assessments.forEach((ha, idx) => {
          console.log(`      ${idx + 1}. ${ha.headOfHousehold.name} (ID: ${ha.householdId})`);
          console.log(`         Age: ${ha.headOfHousehold.age}, Gender: ${ha.headOfHousehold.gender}`);
          console.log(`         Household Size: ${ha.householdSize}`);
        });
      }
    }

    // Also check all HouseholdAssessments directly
    const allAssessments = await HouseholdAssessment.find();
    console.log(`\n\n📊 Total HouseholdAssessments in DB: ${allAssessments.length}`);

    await mongoose.disconnect();
    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkData();
