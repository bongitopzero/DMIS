import mongoose from 'mongoose';
import 'dotenv/config';

async function diagnose() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    //查询所有households
    console.log('📊 All households in database:');
    const households = await db.collection('householdassessments').find({}).toArray();
    console.log(`Total count: ${households.length}\n`);

    // Group by disaster
    const byDisaster = {};
    households.forEach(h => {
      const did = h.disasterId?.toString() || 'null';
      if (!byDisaster[did]) {
        byDisaster[did] = [];
      }
      byDisaster[did].push(h.headOfHousehold?.name || 'Unknown');
    });

    console.log('By Disaster ID:');
    Object.entries(byDisaster).forEach(([id, names]) => {
      console.log(`  ${id}: ${names.length} households`);
      names.forEach(n => console.log(`    - ${n}`));
    });

    // Check disasters
    console.log('\n📌 Verified Disasters:');
    const disasters = await db.collection('disasters').find({ status: 'verified' }).toArray();
    disasters.forEach(d => {
      console.log(`  ${d.type}: ${d._id.toString()}`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnose();
