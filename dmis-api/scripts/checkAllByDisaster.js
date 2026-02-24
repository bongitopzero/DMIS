import mongoose from 'mongoose';
import 'dotenv/config';

async function checkAllByDisaster() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    const disasterIds = [
      '699c870bfe1ce6d8e356b1d0',
      '699c93f10e511c321d377c52',
      '699ca80bd5b2b592b2fbcec0'
    ];

    console.log('🔍 Checking ALL households by Disaster ID\n');

    let totalById = 0;
    for (const id of disasterIds) {
      const objId = new mongoose.Types.ObjectId(id);
      const docs = await db.collection('householdassessments')
        .find({ disasterId: objId })
        .toArray();
      
      console.log(`Disaster ${id}: ${docs.length} households`);
      docs.forEach(doc => {
        console.log(`  - ${doc.headOfHousehold?.name} (${doc.monthlyIncome}) [${doc._id}]`);
      });
      totalById += docs.length;
    }

    console.log(`\n📊 Total by disaster IDs: ${totalById}`);

    // Get total in collection
    const total = await db.collection('householdassessments').countDocuments();
    console.log(`Total in entire collection: ${total}`);

    if (totalById < total) {
      console.log(`\n⚠️  ${total - totalById} households in collection don't match these 3 disasters`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllByDisaster();
