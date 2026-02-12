import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

const fixAdminRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Update admin@dmis.com to have Administrator role
    const result = await User.updateOne(
      { email: "admin@dmis.com" },
      { $set: { role: "Administrator", name: "System Administrator" } }
    );

    console.log(`✅ Updated admin user: ${result.modifiedCount} user(s) modified`);

    // Display all users
    const allUsers = await User.find().select('-password');
    console.log("\n📋 All Users:");
    allUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.role} (${user.name})`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

fixAdminRole();
