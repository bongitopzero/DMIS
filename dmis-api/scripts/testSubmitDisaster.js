import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Disaster from "../models/Disaster.js";

dotenv.config();

async function testSubmitDisaster() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // Get user token
    const user = await User.findOne({ email: "clerk@dmis.com" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Get first disaster
    const disaster = await Disaster.findOne();
    if (!disaster) {
      console.log("No disasters in database");
      process.exit(0);
    }

    console.log(`🔍 Testing PUT /disasters/:id endpoint\n`);
    console.log(`Disaster ID: ${disaster._id}`);
    console.log(`Current Status: ${disaster.status}`);
    console.log(`New Status: submitted\n`);

    const response = await fetch(`http://localhost:5000/api/disasters/${disaster._id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "submitted" })
    });

    const data = await response.json();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log(`\n✅ SUCCESS! Disaster status updated to: ${data.status}`);
    } else {
      console.log(`\n❌ FAILED!`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testSubmitDisaster();
