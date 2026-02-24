import dotenv from "dotenv";
import mongoose from "mongoose";
import Disaster from "../models/Disaster.js";
import HouseholdAssessment from "../models/HouseholdAssessment.js";

dotenv.config();

async function cleanAndResave() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Delete test household assessment
    const result = await HouseholdAssessment.deleteOne({ householdId: "HH-TEST-001" });
    console.log(`🗑️  Deleted ${result.deletedCount} test household assessment(s)\n`);

    // Now manually create the households that should have been saved from the drought disaster
    const disaster = await Disaster.findById("699c870bfe1ce6d8e356b1d0");
    if (!disaster) {
      console.error("❌ Disaster not found!");
      process.exit(1);
    }

    console.log(`📍 Creating households for: ${disaster.type.toUpperCase()} in ${disaster.district}\n`);

    // These are the two households that the user input
    const householdData = [
      {
        householdId: "HH-001",
        headOfHousehold: {
          name: "John Doe",
          age: 45,
          gender: "Male"
        },
        village: "Maseru",
        householdSize: 5,
        sourceOfIncome: "Low (≤ M3,000/mo)",
        damageDescription: "All crops lost due to drought"
      },
      {
        householdId: "HH-002",
        headOfHousehold: {
          name: "Mary Ramodibe",
          age: 38,
          gender: "Female"
        },
        village: "Maseru",
        householdSize: 7,
        sourceOfIncome: "Middle (M3,000-10,000/mo)",
        damageDescription: "60% crop loss, livestock mortality"
      }
    ];

    for (let hh of householdData) {
      const monthlyIncome = hh.sourceOfIncome.includes("Low") ? 2500 : 6500;
      const incomeCategory = hh.sourceOfIncome.includes("Low") ? "Low" : "Middle";

      const assessment = new HouseholdAssessment({
        disasterId: disaster._id,
        householdId: hh.householdId,
        headOfHousehold: hh.headOfHousehold,
        householdSize: hh.householdSize,
        childrenUnder5: 0,
        monthlyIncome: monthlyIncome,
        incomeCategory: incomeCategory,
        disasterType: "Drought",
        damageDescription: hh.damageDescription,
        damageSeverityLevel: 2,
        damageDetails: {
          roofDamage: "Unknown",
          cropLossPercentage: 75,
          livestockLoss: 0,
          roomsAffected: 0,
          waterAccessImpacted: true
        },
        recommendedAssistance: "To be determined",
        assessmentDate: new Date(),
        assessedBy: "Data Clerk",
        location: {
          village: hh.village,
          district: disaster.district
        },
        status: "Pending Review"
      });

      await assessment.save();
      console.log(`✅ Created household assessment for ${hh.headOfHousehold.name}`);
    }

    // Verify
    console.log("\n📊 Verification:\n");
    const assessments = await HouseholdAssessment.find({ disasterId: disaster._id });
    console.log(`Total household assessments for this disaster: ${assessments.length}`);
    assessments.forEach(ha => {
      console.log(`  - ${ha.headOfHousehold.name} (${ha.householdId})`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanAndResave();
