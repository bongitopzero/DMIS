#!/usr/bin/env node
/* Safe normalization script for `district` fields in `incidents` and `disasters`.
   Usage:
     node normalizeDistrictsSafe.js --dry-run
     node normalizeDistrictsSafe.js --apply

   The script prints a report of distinct district values and their normalized
   forms. With `--apply` it will update documents in both collections.
*/
import mongoose from 'mongoose';
import Disaster from '../models/Disaster.js';
import Incident from '../models/Incident.js';
import dotenv from 'dotenv';

dotenv.config();

function normalizeDistrictName(val) {
  if (!val) return val;
  let s = val.toString().trim();
  s = s.replace(/[’‘]/g, "'");
  s = s.replace(/\s+/g, ' ');
  s = s.toLowerCase()
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return s;
}

async function gatherDistinct(collection, field) {
  return collection.distinct(field);
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.length === 0;
  const apply = args.includes('--apply');

  console.log('Connecting to DB...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || undefined });
  console.log('Connected. Gathering distinct district values...');

  const disasterDistinct = await gatherDistinct(Disaster, 'district');
  const incidentDistinct = await gatherDistinct(Incident, 'district');

  const all = Array.from(new Set([...(disasterDistinct||[]), ...(incidentDistinct||[])]));

  const mapping = {};
  all.forEach(orig => {
    mapping[orig] = normalizeDistrictName(orig);
  });

  console.log('\nDistrict normalization report:');
  Object.keys(mapping).sort().forEach(k => {
    console.log(`- "${k}"  ->  "${mapping[k]}"`);
  });

  if (apply) {
    console.log('\nApplying normalized values to documents...');
    let dCount = 0, iCount = 0;
    for (const orig of Object.keys(mapping)) {
      const norm = mapping[orig];
      if (orig === norm) continue;
      const dRes = await Disaster.updateMany({ district: orig }, { $set: { district: norm } });
      const iRes = await Incident.updateMany({ district: orig }, { $set: { district: norm } });
      dCount += dRes.modifiedCount || dRes.nModified || 0;
      iCount += iRes.modifiedCount || iRes.nModified || 0;
    }
    console.log(`Updated ${dCount} disaster documents and ${iCount} incident documents.`);
  } else {
    console.log('\nDry-run mode (no changes). To apply changes run with --apply');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
