import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const testUsers = [
      {
        name: "DMA Coordinator",
        email: "coordinator@dmis.com",
        password: "coordinator123",
        role: "Coordinator"
      },
      {
        name: "Finance Officer",
        email: "finance@dmis.com",
        password: "finance123",
        role: "Finance Officer"
      },
      {
        name: "Data Clerk",
        email: "clerk@dmis.com",
        password: "clerk123",
        role: "Data Clerk",
        ministry: "Ministry of Health"
      },
      {
        name: "System Administrator",
        email: "admin@dmis.com",
        password: "admin123",
        role: "Administrator"
      }
    ];

    const salt = await bcrypt.genSalt(10);
    let created = 0;
    let skipped = 0;

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        ministry: userData.ministry || null
      });

      console.log(`✅ Created: ${userData.email} (${userData.role})`);
      created++;
    }

    console.log("\n====================================");
    console.log(`✅ Created: ${created} users`);
    console.log(`⏭️  Skipped: ${skipped} users`);
    console.log("====================================\n");
    
    console.log("Login Credentials:");
    console.log("------------------");
    testUsers.forEach(user => {
      console.log(`${user.role}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createTestUsers();
