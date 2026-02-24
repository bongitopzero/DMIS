import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

dotenv.config();

async function testAPIResponse() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Get user token
    const user = await User.findOne({ email: "clerk@dmis.com" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Get the first disaster
    const response = await fetch("http://localhost:5000/api/disasters", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const disastersData = await response.json();
    
    if (disastersData.length === 0) {
      console.log("No disasters found");
      process.exit(0);
    }

    const disaster = disastersData[0];
    console.log(`🔍 Testing API response for disaster: ${disaster.type} in ${disaster.district}\n`);

    // Get household assessments
    const assessmentsResponse = await fetch(`http://localhost:5000/api/allocation/assessments/${disaster._id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const assessmentsData = await assessmentsResponse.json();
    
    console.log(`📊 API Response Status: ${assessmentsResponse.status}`);
    console.log(`Count: ${assessmentsData.count}\n`);
    
    if (assessmentsData.assessments.length > 0) {
      const hh = assessmentsData.assessments[0];
      console.log(`✅ First household assessment fields:`);
      console.log(`   _id: ${hh._id}`);
      console.log(`   householdId: ${hh.householdId}`);
      console.log(`   headOfHousehold: ${JSON.stringify(hh.headOfHousehold)}`);
      console.log(`   householdSize: ${hh.householdSize}`);
      console.log(`   village (location.village): ${hh.location?.village}`);
      console.log(`   incomeCategory: ${hh.incomeCategory}`);
      console.log(`   damageDescription: ${hh.damageDescription}`);
      
      console.log(`\n🔑 Field check:`);
      console.log(`   gender exists: ${!!hh.headOfHousehold?.gender}`);
      console.log(`   age exists: ${!!hh.headOfHousehold?.age}`);
      console.log(`   householdSize exists: ${hh.householdSize !== undefined}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testAPIResponse();
