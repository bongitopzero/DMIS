import mongoose from 'mongoose';
import 'dotenv/config';

async function checkRealHouseholdData() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('🔍 Checking ALL Household Assessment Data\n');

    // Get all households
    const allHouseholds = await db.collection('household_assessments')
      .find({})
      .toArray();

    console.log(`Total households in collection: ${allHouseholds.length}\n`);

    // Group by disaster
    const disasters = await db.collection('disasters')
      .find({ status: 'verified' })
      .toArray();

    for (const disaster of disasters) {
      const households = await db.collection('household_assessments')
        .find({ disasterId: disaster._id })
        .toArray();

      console.log(`\n📌 ${disaster.disasterCode || disaster._id} (${disaster.type} - ${disaster.district})`);
      console.log(`   Found ${households.length} households:\n`);

      households.forEach((h, idx) => {
        console.log(`   ${idx + 1}. ${h.headOfHousehold?.name || 'Unknown'}`);
        console.log(`      Created: ${h.createdAt || 'N/A'}`);
        console.log(`      Assessed by: ${h.assessedBy || 'N/A'}`);
        console.log(`      Status: ${h.status || 'N/A'}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRealHouseholdData();
