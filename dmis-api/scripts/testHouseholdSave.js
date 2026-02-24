import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function testHouseholdSave() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Get the clerk user
    const user = await User.findOne({ email: "clerk@dmis.com" });
    
    if (!user) {
      console.error("❌ Clerk user not found!");
      process.exit(1);
    }

    // Create a token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    
    console.log(`📍 Testing API with token for: ${user.email}`);
    console.log(`🎯 Disaster ID: 699c870bfe1ce6d8e356b1d0\n`);

    // Test data
    const householdPayload = {
      disasterId: "699c870bfe1ce6d8e356b1d0",
      householdId: "HH-TEST-001",
      headOfHousehold: {
        name: "Test User",
        age: 45,
        gender: "Male"
      },
      householdSize: 5,
      childrenUnder5: 0,
      monthlyIncome: 2500,
      incomeCategory: "Low",
      disasterType: "Drought",
      damageDescription: "Test damage",
      damageSeverityLevel: 2,
      assessedBy: "Data Clerk",
      damageDetails: {
        roofDamage: "Unknown",
        cropLossPercentage: 0,
        livestockLoss: 0,
        roomsAffected: 0,
        waterAccessImpacted: false
      },
      recommendedAssistance: "To be determined",
      location: {
        village: "Maseru",
        district: "Maseru"
      }
    };

    console.log("📦 Testing POST /api/allocation/assessments");
    console.log("Payload:", JSON.stringify(householdPayload, null, 2));
    console.log("\n");

    const response = await fetch("http://localhost:5000/api/allocation/assessments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(householdPayload)
    });

    const responseData = await response.json();
    console.log("Status:", response.status);
    console.log("Response:");
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log("\n✅ SUCCESS! Household assessment saved to database");
    } else {
      console.log("\n❌ FAILED! Check error above");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    process.exit(1);
  }
}

testHouseholdSave();
