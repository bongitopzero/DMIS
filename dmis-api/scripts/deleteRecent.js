import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dmis';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);
  const db = mongoose.connection.db;

  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  console.log('Deleting documents with createdAt >=', eightHoursAgo);

  const targets = [
    { name: 'disasters', filter: { createdAt: { $gte: eightHoursAgo } } },
    { name: 'incidents', filter: { createdAt: { $gte: eightHoursAgo } } },
    { name: 'funds', filter: { createdAt: { $gte: eightHoursAgo } } },
    // For users, avoid deleting Administrators
    { name: 'users', filter: { createdAt: { $gte: eightHoursAgo }, role: { $ne: 'Administrator' } } }
  ];

  for (const t of targets) {
    const exists = await db.listCollections({ name: t.name }).toArray();
    if (!exists.length) {
      console.log(`Collection ${t.name} does not exist, skipping.`);
      continue;
    }
    const col = db.collection(t.name);
    const before = await col.countDocuments();
    const recent = await col.countDocuments(t.filter);
    console.log(`\nCollection: ${t.name} — total: ${before}, to delete: ${recent}`);
    if (recent > 0) {
      const res = await col.deleteMany(t.filter);
      console.log(`  Deleted ${res.deletedCount} documents from ${t.name}`);
      const after = await col.countDocuments();
      console.log(`  Now total: ${after}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDeletion complete');
}

run().catch(e => { console.error(e); process.exit(1); });
