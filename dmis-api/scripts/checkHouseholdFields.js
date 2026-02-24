import dotenv from "dotenv";
import mongoose from "mongoose";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

dotenv.config();

async function checkFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    const assessments = await HouseholdAssessment.find().limit(5);
    
    if (assessments.length === 0) {
      console.log("❌ No household assessments found in database");
      process.exit(0);
    }

    console.log(`📊 Checking ${assessments.length} household assessment(s):\n`);
    
    assessments.forEach((ha, idx) => {
      console.log(`\n🏠 Household ${idx + 1}:`);
      console.log(`   headOfHousehold:`, ha.headOfHousehold);
      console.log(`   householdSize:`, ha.householdSize);
      console.log(`   Gender exists:`, !!ha.headOfHousehold?.gender);
      console.log(`   Age exists:`, !!ha.headOfHousehold?.age);
      console.log(`   Name exists:`, !!ha.headOfHousehold?.name);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkFields();
