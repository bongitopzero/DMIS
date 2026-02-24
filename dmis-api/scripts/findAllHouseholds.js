import mongoose from 'mongoose';
import 'dotenv/config';

async function findAllHouseholds() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    // Get ALL households regardless of ID
    const allDocs = await db.collection('householdassessments')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`📋 ALL ${allDocs.length} Households in Collection:\n`);
    
    allDocs.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.headOfHousehold?.name || 'Unknown'}`);
      console.log(`   ID: ${doc._id}`);
      console.log(`   Disaster ID: ${doc.disasterId}`);
      console.log(`   Income: M${doc.monthlyIncome}`);
      console.log(`   Created: ${doc.createdAt || 'N/A'}\n`);
    });

    // Count by disaster
    console.log('\n📊 Summary by Disaster ID:');
    const byDisaster = {};
    allDocs.forEach(doc => {
      const did = doc.disasterId?.toString() || 'null';
      byDisaster[did] = (byDisaster[did] || 0) + 1;
    });
    
    Object.entries(byDisaster).forEach(([id, count]) => {
      console.log(`  ${id}: ${count}`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAllHouseholds();
