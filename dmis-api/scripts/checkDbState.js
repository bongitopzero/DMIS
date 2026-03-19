import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dmis';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('\nCollections in DB:');
  collections.forEach(c => console.log('- ' + c.name));

  const keyCollections = ['disasters','incidents','householdallocations','users','funds','allocationplans'];
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  for (const name of keyCollections) {
    const exists = collections.find(c => c.name === name);
    if (!exists) continue;
    const col = db.collection(name);
    const total = await col.countDocuments();
    const recent = await col.countDocuments({ createdAt: { $gte: eightHoursAgo } });
    console.log(`\nCollection: ${name}`);
    console.log(`  total documents: ${total}`);
    console.log(`  documents created in last 8 hours: ${recent}`);
    const sample = await col.find({}).sort({ createdAt: -1 }).limit(3).toArray();
    if (sample.length) {
      console.log('  latest documents:');
      sample.forEach((d, i) => {
        console.log(`   [${i+1}] _id=${d._id} createdAt=${d.createdAt}`);
      });
    }
  }

  // Also check for seed marker documents (common patterns)
  const tmpCollections = await db.listCollections({name: 'tmp_disasters'}).toArray();
  if (tmpCollections.length) console.log('\nFound tmp_disasters collection (seed data presence)');

  await mongoose.disconnect();
  console.log('\nDone');
}

run().catch(e => { console.error(e); process.exit(1); });
