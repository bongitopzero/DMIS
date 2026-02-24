import mongoose from "mongoose";
import dotenv from "dotenv";
import Disaster from "../models/Disaster.js";

dotenv.config();

async function seedDisasters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Clear existing disasters
    await Disaster.deleteMany({});
    console.log("🗑️ Cleared existing disasters");

    // Create test disasters
    const disasters = [
      {
        name: "Maseru Heavy Rainfall - October 2023",
        type: "heavy_rainfall",
        district: "Maseru",
        village: "Ha Nthathane",
        latitude: -29.61,
        longitude: 27.48,
        affectedPopulation: "500-1000",
        households: "50-100",
        affectedHouses: 75,
        damages: "Flooded homes, damaged crops, washed away livestock",
        damageCost: 150000,
        needs: "Emergency shelter, food, water, medical supplies",
        severity: "high",
        status: "responding"
      },
      {
        name: "Strong Winds - Leribe District",
        type: "strong_winds",
        district: "Leribe",
        village: "Ha Hlalele",
        latitude: -29.33,
        longitude: 27.83,
        affectedPopulation: "300-500",
        households: "30-50",
        affectedHouses: 42,
        damages: "Roof damage, fallen trees, infrastructure damage",
        damageCost: 200000,
        needs: "Building materials, tools, temporary shelter",
        severity: "high",
        status: "responding"
      },
      {
        name: "Mafeteng Flooding - November 2023",
        type: "heavy_rainfall",
        district: "Mafeteng",
        village: "Mafeteng Town",
        latitude: -29.80,
        longitude: 27.28,
        affectedPopulation: "1000-2000",
        households: "100-200",
        affectedHouses: 150,
        damages: "Flash flooding, washed away roads, damaged infrastructure",
        damageCost: 300000,
        needs: "Road rehabilitation, Emergency supplies, Temporary housing",
        severity: "high",
        status: "verified"
      },
      {
        name: "Berea Drought - December 2023",
        type: "drought",
        district: "Berea",
        village: "Ha Kena",
        latitude: -29.49,
        longitude: 27.65,
        affectedPopulation: "2000-5000",
        households: "200-400",
        affectedHouses: 0,
        damages: "Crop failure, livestock deaths, water scarcity",
        damageCost: 180000,
        needs: "Water supply, Food aid, Agricultural support",
        severity: "medium",
        status: "reported"
      }
    ];

    const created = await Disaster.insertMany(disasters);
    console.log(`✅ Created ${created.length} test disasters`);
    
    created.forEach((d) => {
      console.log(`   - ${d.district} - ${d.type} (${d.severity})`);
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedDisasters();
