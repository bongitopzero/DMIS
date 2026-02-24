import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Disaster from "../models/Disaster.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

dotenv.config();

async function debugData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Check users
    const users = await User.find();
    console.log(`📊 Total Users: ${users.length}`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });

    console.log("\n");

    // Check disasters with full details
    const disasters = await Disaster.find();
    console.log(`📊 Total Disasters: ${disasters.length}`);
    disasters.forEach(d => {
      console.log(`   - ${d.type.toUpperCase()} in ${d.district}`);
      console.log(`     Created: ${new Date(d.createdAt).toLocaleString()}`);
      console.log(`     Reporter: ${d.reportedBy}`);
    });

    console.log("\n");

    // Check ALL HouseholdAssessments
    const allAssessments = await HouseholdAssessment.find();
    console.log(`📊 Total HouseholdAssessments: ${allAssessments.length}`);
    allAssessments.forEach(ha => {
      console.log(`   - ${ha.headOfHousehold.name} (ID: ${ha.householdId})`);
      console.log(`     Disaster ID: ${ha.disasterId}`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Debug complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

debugData();
