import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

async function getToken() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Get the clerk user
    const user = await User.findOne({ email: "clerk@dmis.com" }).select("-password");
    
    if (!user) {
      console.error("❌ Clerk user not found!");
      process.exit(1);
    }

    // Create a token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    
    console.log(`✅ Token for clerk@dmis.com:`);
    console.log(token);
    console.log(`\nUser ID: ${user._id}`);
    console.log(`User Role: ${user.role}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getToken();
