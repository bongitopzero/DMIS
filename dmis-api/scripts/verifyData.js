import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Disaster from "../models/Disaster.js";
import User from "../models/User.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

async function verifyData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");
    
    // Get all disasters
    const disasters = await Disaster.find().populate('reportedBy', 'name email');
    
    console.log(`📊 Total Disasters: ${disasters.length}\n`);
    
    for (const disaster of disasters) {
      console.log(`🔍 Disaster: ${disaster.type.toUpperCase()} in ${disaster.district}`);
      console.log(`   ID: ${disaster._id}`);
      console.log(`   Created: ${new Date(disaster.createdAt).toLocaleString()}`);
      console.log(`   Households Affected: ${disaster.numberOfHouseholdsAffected}`);
      console.log(`   Severity: ${disaster.severity}`);
      console.log(`   Status: ${disaster.status}\n`);

      // Get household assessments for this disaster
      const assessments = await HouseholdAssessment.find({ disasterId: disaster._id });
      console.log(`   📋 Household Assessments: ${assessments.length}`);
      
      if (assessments.length > 0) {
        for (let i = 0; i < assessments.length; i++) {
          const hh = assessments[i];
          console.log(`\n      Household ${i + 1}:`);
          console.log(`        ID: ${hh.householdId}`);
          console.log(`        Head: ${hh.headOfHousehold?.name} (${hh.headOfHousehold?.age} years)`);
          console.log(`        Village: ${hh.location?.village}`);
          console.log(`        Size: ${hh.householdSize} members`);
          console.log(`        Income: ${hh.incomeCategory}`);
          console.log(`        House State: ${hh.stateOfHouse || 'Unknown'}`);
          console.log(`        Estimated Cost: M${hh.estimatedCost || 0}`);
          console.log(`        Damage: ${hh.damageDescription}`);
        }
      } else {
        console.log(`      ⚠️  No household assessments found for this disaster`);
      }
      
      console.log(`\n${'='.repeat(60)}\n`);
    }

    console.log("✅ Verification complete!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyData();
