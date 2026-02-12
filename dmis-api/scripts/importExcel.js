import xlsx from "xlsx";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Disaster model
import Disaster from "../models/Disaster.js";

const excelFiles = [
  {
    path: "c:\\Users\\PC\\Downloads\\HEAVY RAINS DAMAGE IN MASERU final_Oct23.xlsx",
    type: "heavy_rainfall",
    district: "Maseru"
  },
  {
    path: "c:\\Users\\PC\\Downloads\\Costed consolidated list of affected houses by strong winds1234.xlsx",
    type: "strong_winds",
    district: null // Will be extracted from data
  },
  {
    path: "c:\\Users\\PC\\Downloads\\Costed consolidated list of affected houses by strong winds12-0.xlsx",
    type: "strong_winds",
    district: null
  },
  {
    path: "c:\\Users\\PC\\Downloads\\HEAVY RAINS AND STRONG WINDS DAMAGE IN MAFETENG final.xlsx",
    type: "heavy_rainfall", // Will check for both types
    district: "Mafeteng"
  },
  {
    path: "c:\\Users\\PC\\Downloads\\HH affected by strong winds at Ha Hlalele in Ketane Oct 2023.xlsx",
    type: "strong_winds",
    district: "Leribe" // Ketane is in Leribe district
  },
  {
    path: "c:\\Users\\PC\\Downloads\\MASERU LOCAL PURCHASE 1.xlsx",
    type: "heavy_rainfall",
    district: "Maseru"
  }
];

// District mapping helper
const districtMapping = {
  "maseru": "Maseru",
  "mafeteng": "Mafeteng",
  "berea": "Berea",
  "leribe": "Leribe",
  "butha-buthe": "Butha-Buthe",
  "mokhotlong": "Mokhotlong",
  "qacha's nek": "Qacha's Nek",
  "quthing": "Quthing",
  "mohale's hoek": "Mohale's Hoek",
  "thaba-tseka": "Thaba-Tseka"
};

function normalizeDistrict(district) {
  if (!district) return null;
  const normalized = district.toLowerCase().trim();
  return districtMapping[normalized] || district;
}

function extractNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }
  return 0;
}

function determinePopulationInterval(population) {
  if (population <= 50) return "0-50";
  if (population <= 100) return "51-100";
  if (population <= 250) return "101-250";
  if (population <= 500) return "251-500";
  if (population <= 1000) return "501-1000";
  if (population <= 2500) return "1001-2500";
  if (population <= 5000) return "2501-5000";
  return "5000+";
}

function determineHouseholdInterval(households) {
  if (households <= 10) return "0-10";
  if (households <= 25) return "11-25";
  if (households <= 50) return "26-50";
  if (households <= 100) return "51-100";
  if (households <= 250) return "101-250";
  if (households <= 500) return "251-500";
  return "500+";
}

function determineSeverity(affectedHouses, damageCost) {
  if (affectedHouses > 100 || damageCost > 500000) return "high";
  if (affectedHouses > 50 || damageCost > 200000) return "medium";
  return "low";
}

async function importExcelFile(fileConfig) {
  try {
    console.log(`\n📂 Reading: ${path.basename(fileConfig.path)}`);
    
    const workbook = xlsx.readFile(fileConfig.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`   Found ${rows.length} rows`);

    const disasters = [];

    for (const row of rows) {
      try {
        // Try to extract district from row data
        let district = fileConfig.district;
        if (!district && row.District) {
          district = normalizeDistrict(row.District);
        }
        if (!district && row.district) {
          district = normalizeDistrict(row.district);
        }
        if (!district) {
          district = "Maseru"; // Default fallback
        }

        // Extract affected houses/households
        let affectedHouses = 0;
        if (row.Affected_Houses) affectedHouses = extractNumericValue(row.Affected_Houses);
        else if (row.affected_houses) affectedHouses = extractNumericValue(row.affected_houses);
        else if (row["Number of Houses"]) affectedHouses = extractNumericValue(row["Number of Houses"]);
        else if (row.Houses) affectedHouses = extractNumericValue(row.Houses);

        // Extract damage cost
        let damageCost = 0;
        if (row.Total_Cost) damageCost = extractNumericValue(row.Total_Cost);
        else if (row.total_cost) damageCost = extractNumericValue(row.total_cost);
        else if (row["Damage Cost"]) damageCost = extractNumericValue(row["Damage Cost"]);
        else if (row.Cost) damageCost = extractNumericValue(row.Cost);

        // Estimate affected population (average 5 people per household)
        const estimatedPopulation = affectedHouses * 5;

        // Extract location
        let location = row.Location || row.location || row.Village || row.village || row.Area || district;

        // Extract date
        let date = new Date();
        if (row.Date) {
          try {
            date = new Date(row.Date);
            if (isNaN(date.getTime())) date = new Date();
          } catch {
            date = new Date();
          }
        }

        const disaster = {
          type: fileConfig.type,
          district: district,
          location: location,
          affectedPopulation: determinePopulationInterval(estimatedPopulation),
          households: determineHouseholdInterval(affectedHouses),
          affectedHouses: affectedHouses,
          damages: `Property damage: M${damageCost.toLocaleString()}. ${affectedHouses} houses affected.`,
          damageCost: damageCost,
          needs: fileConfig.type === "strong_winds" 
            ? "Shelter, Emergency Repairs, Building Materials"
            : "Shelter, Food, Medical Supplies, Cleaning Supplies",
          severity: determineSeverity(affectedHouses, damageCost),
          status: "verified", // Historical data is already verified
          date: date,
          verifiedAt: date,
          source: "Historical Spreadsheet Import",
          createdAt: date,
          updatedAt: date
        };

        disasters.push(disaster);
      } catch (rowError) {
        console.error(`   ⚠️  Error processing row:`, rowError.message);
      }
    }

    // Insert disasters into database
    if (disasters.length > 0) {
      const result = await Disaster.insertMany(disasters, { ordered: false });
      console.log(`   ✅ Imported ${result.length} disasters`);
      return result.length;
    } else {
      console.log(`   ⚠️  No valid data found in file`);
      return 0;
    }

  } catch (error) {
    console.error(`   ❌ Error importing ${path.basename(fileConfig.path)}:`, error.message);
    return 0;
  }
}

async function importAllFiles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");
    console.log("=" .repeat(60));
    console.log("IMPORTING HISTORICAL DISASTER DATA");
    console.log("=" .repeat(60));

    let totalImported = 0;

    for (const fileConfig of excelFiles) {
      const imported = await importExcelFile(fileConfig);
      totalImported += imported;
    }

    console.log("\n" + "=" .repeat(60));
    console.log(`📊 IMPORT SUMMARY: ${totalImported} total disasters imported`);
    console.log("=" .repeat(60));

    // Show summary by type and district
    const summary = await Disaster.aggregate([
      {
        $group: {
          _id: { type: "$type", district: "$district" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.district": 1, "_id.type": 1 } }
    ]);

    console.log("\nDisaster Distribution:");
    summary.forEach(item => {
      console.log(`  ${item._id.district} - ${item._id.type}: ${item.count} incidents`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

importAllFiles();
