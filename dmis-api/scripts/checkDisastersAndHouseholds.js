import mongoose from 'mongoose';
import 'dotenv/config';

async function checkDisastersAndHouseholds() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('🔍 Checking Disasters and Associated Households\n');

    // Get verified disasters with their codes
    const disasters = await db.collection('disasters')
      .find({ status: 'verified' })
      .toArray();

    console.log(`Found ${disasters.length} verified disasters:\n`);

    for (const d of disasters) {
      console.log(`Disaster: ${d.disasterCode || d._id}`);
      console.log(`  Type: ${d.type}`);
      console.log(`  District: ${d.district}`);
      console.log(`  ID: ${d._id}`);

      // Count households for this disaster
      const householdCount = await db.collection('household_assessments')
        .countDocuments({ disasterId: d._id });
      
      console.log(`  Households in DB: ${householdCount}`);
      console.log(`  Households field: ${d.numberOfHouseholdsAffected || 'N/A'}\n`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDisastersAndHouseholds();
