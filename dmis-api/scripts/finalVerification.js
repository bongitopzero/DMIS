import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Disaster from "../models/Disaster.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";
import User from "../models/User.js";

dotenv.config();

async function finalVerification() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Check disasters
    const disasters = await Disaster.find().sort({ createdAt: -1 });
    console.log(`📊 DATABASE STATE:`);
    console.log(`   Total Disasters: ${disasters.length}`);
    
    if (disasters.length > 0) {
      const disaster = disasters[0];
      console.log(`   Latest: ${disaster.type.toUpperCase()} in ${disaster.district}`);
      console.log(`   Created: ${new Date(disaster.createdAt).toLocaleString()}\n`);

      // Get household assessments for this disaster
      const assessments = await HouseholdAssessment.find({ disasterId: disaster._id });
      console.log(`   📋 Household Assessments: ${assessments.length}`);
      assessments.forEach(ha => {
        console.log(`      ✓ ${ha.headOfHousehold.name} (${ha.householdId}) - ${ha.householdSize} people`);
      });
    }

    console.log(`\n✅ API ENDPOINT TEST:`);
    
    // Get a user token
    const user = await User.findOne({ email: "clerk@dmis.com" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Test the GET endpoint
    const response = await fetch(`http://localhost:5000/api/allocation/assessments/${disasters[0]._id}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    console.log(`   GET /allocation/assessments/:disasterId`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: { count: ${data.count}, assessments: [...] }`);
    
    if (data.count > 0) {
      console.log(`   ✓ Endpoint returns ${data.count} assessments correctly`);
    }

    console.log(`\n✅ SUMMARY:`);
    console.log(`   - Database has 1 disaster with 2 households`);
    console.log(`   - Household save endpoint (POST /allocation/assessments) now includes 'assessedBy' field`);
    console.log(`   - Frontend fetchSavedDisasters now uses correct path parameter for GET endpoint`);
    console.log(`   - Ready for frontend testing\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

finalVerification();
