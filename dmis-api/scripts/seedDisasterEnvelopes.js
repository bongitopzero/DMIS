import mongoose from "mongoose";
import dotenv from "dotenv";
import DisasterBudgetEnvelope from "../models/DisasterBudgetEnvelope.js";

dotenv.config();

async function seedDisasterEnvelopes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Clear existing envelopes
    await DisasterBudgetEnvelope.deleteMany({});
    console.log("🧹 Cleared existing disaster budget envelopes");

    // National expenditure
    const nationalExpenditure = 82648374;
    const disasterBudget = nationalExpenditure;

    // Create envelopes for disaster types used in BudgetAllocation
    const envelopes = [
      {
        disasterType: "drought",
        allocatedAmount: Math.round(disasterBudget * 0.3),
        remainingAmount: Math.round(disasterBudget * 0.3),
        percentageRemaining: 100,
        approvalStatus: "Approved",
        fiscalYear: "2026/2027",
        notes: "Budget allocated for drought disasters",
      },
      {
        disasterType: "heavy_rainfall",
        allocatedAmount: Math.round(disasterBudget * 0.3),
        remainingAmount: Math.round(disasterBudget * 0.3),
        percentageRemaining: 100,
        approvalStatus: "Approved",
        fiscalYear: "2026/2027",
        notes: "Budget allocated for heavy rainfall disasters",
      },
      {
        disasterType: "strong_winds",
        allocatedAmount: Math.round(disasterBudget * 0.3),
        remainingAmount: Math.round(disasterBudget * 0.3),
        percentageRemaining: 100,
        approvalStatus: "Approved",
        fiscalYear: "2026/2027",
        notes: "Budget allocated for strong winds disasters",
      },
      {
        disasterType: "strategic_reserve",
        allocatedAmount: Math.round(disasterBudget * 0.1),
        remainingAmount: Math.round(disasterBudget * 0.1),
        percentageRemaining: 100,
        approvalStatus: "Approved",
        fiscalYear: "2026/2027",
        notes: "Emergency fund for unexpected large disasters",
      },
    ];

    const createdEnvelopes = await DisasterBudgetEnvelope.insertMany(envelopes);
    console.log(`✅ Created ${createdEnvelopes.length} disaster budget envelopes`);

    // Log totals
    const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocatedAmount, 0);
    console.log(`💰 Total allocated: M${totalAllocated.toLocaleString()}`);
    console.log(`📊 National budget: M${nationalExpenditure.toLocaleString()}`);

    console.log("🎉 Disaster budget envelopes seeded successfully!");
    console.log("\nEnvelope breakdown:");
    envelopes.forEach(env => {
      console.log(`  ${env.disasterType}: M${env.allocatedAmount.toLocaleString()}`);
    });

  } catch (error) {
    console.error("❌ Error seeding disaster envelopes:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

seedDisasterEnvelopes();