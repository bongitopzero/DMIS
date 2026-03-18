import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Disaster from '../models/Disaster.js';

dotenv.config();

function parseHouseholdsFromString(str) {
  if (!str || typeof str !== 'string') return 0;
  const nums = str.match(/\d+/g);
  if (!nums || nums.length === 0) return 0;
  return Math.max(...nums.map(n => parseInt(n, 10)));
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const disasters = await Disaster.find({});
  console.log(`Found ${disasters.length} disasters`);

  let updated = 0;
  for (const d of disasters) {
    let val = d.numberOfHouseholdsAffected || 0;
    if (!val || val === 0) {
      if (d.totalAffectedHouseholds && d.totalAffectedHouseholds > 0) val = d.totalAffectedHouseholds;
      else if (d.households) val = parseHouseholdsFromString(d.households);
      else if (d.affectedPopulation) {
        const popNum = parseHouseholdsFromString(d.affectedPopulation);
        if (popNum > 0) val = Math.max(1, Math.round(popNum / 5));
      }
    }

    if (val && val > 0 && val !== d.numberOfHouseholdsAffected) {
      d.numberOfHouseholdsAffected = val;
      await d.save();
      updated++;
      console.log(`Updated ${d._id}: numberOfHouseholdsAffected=${val}`);
    }
  }

  console.log(`Backfill complete. Updated ${updated} disasters.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
