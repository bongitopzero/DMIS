import dotenv from "dotenv";
import mongoose from "mongoose";
import Disaster from "../models/Disaster.js";

dotenv.config();

async function resetDisasterStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Find the drought disaster and reset status to "reported"
    const result = await Disaster.updateOne(
      { type: "drought" },
      { status: "reported" }
    );

    console.log(`📝 Updated disaster status back to "reported"`);
    console.log(`Modified: ${result.modifiedCount} document(s)\n`);

    // Show current status
    const disaster = await Disaster.findOne({ type: "drought" });
    if (disaster) {
      console.log(`Current status: ${disaster.status}`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Done! Ready to test the workflow.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

resetDisasterStatus();
