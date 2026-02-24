import mongoose from 'mongoose';
import 'dotenv/config';

async function fullDiagnose() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('📊 FULL DATABASE DIAGNOSTIC\n');

    // Get all households
    const allHouseholds = await db.collection('householdassessments').find({}).toArray();
    console.log(`Total households in collection: ${allHouseholds.length}\n`);

    // Group by disaster
    const byDisaster = {};
    allHouseholds.forEach(h => {
      const did = h.disasterId?.toString() || 'null';
      if (!byDisaster[did]) {
        byDisaster[did] = [];
      }
      byDisaster[did].push({
        name: h.headOfHousehold?.name || 'Unknown',
        id: h._id
      });
    });

    // Get verified disasters and their IDs
    const disasters = await db.collection('disasters').find({ status: 'verified' }).toArray();
    console.log(`Verified Disasters: ${disasters.length}\n`);

    disasters.forEach(d => {
      console.log(`${d.type} (${d._id}):`);
      const households = byDisaster[d._id.toString()] || [];
      console.log(`  Households in DB: ${households.length}`);
      households.forEach(h => console.log(`    - ${h.name}`));
    });

    console.log('\n🔍 Checking for Orphan Households:');
    for (const [did, households] of Object.entries(byDisaster)) {
      const disaster = disasters.find(d => d._id.toString() === did);
      if (!disaster) {
        console.log(`  ⚠️  ${households.length} households for unknown disaster ${did}`);
        households.forEach(h => console.log(`    - ${h.name} (${h.id})`));
      }
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fullDiagnose();
