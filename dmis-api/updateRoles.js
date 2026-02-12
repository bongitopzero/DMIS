import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

const updateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Find all users with "Director" role and update to "Coordinator"
    const result = await User.updateMany(
      { role: "Director" },
      { $set: { role: "Coordinator" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users from Director to Coordinator`);

    // Display all users
    const allUsers = await User.find().select('-password');
    console.log("\n📋 All Users:");
    allUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.role}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

updateRoles();
