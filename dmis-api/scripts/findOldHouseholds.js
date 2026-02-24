import mongoose from 'mongoose';
import 'dotenv/config';

async function findOldHouseholds() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    // Search for the exact IDs returned by the API
    const oldIds = [
      '699cbd79d829d9c981eaec9d',
      '699cbd79d829d9c981eaec99',
      '699cbd79d829d9c981eaec95'
    ];

    console.log('🔍 Searching for API-returned IDs in database...\n');

    for (const id of oldIds) {
      const doc = await db.collection('householdassessments').findOne({
        _id: new mongoose.Types.ObjectId(id)
      });

      if (doc) {
        console.log(`✅ Found: ${doc.headOfHousehold?.name} (${id})`);
        console.log(`   Disaster ID: ${doc.disasterId}`);
      } else {
        console.log(`❌ NOT found: ${id}`);
      }
    }

    // Get actual count
    const totalCount = await db.collection('householdassessments').countDocuments();
    console.log(`\n📊 Total households in collection: ${totalCount}`);

    // Let's check with less strict search - just get all with this disasterId
    const disasterId = new mongoose.Types.ObjectId('699c870bfe1ce6d8e356b1d0');
    const count = await db.collection('householdassessments').countDocuments({
      disasterId: disasterId
    });
    console.log(`Households for disability 699c870bfe1ce6d8e356b1d0: ${count}`);

    const all = await db.collection('householdassessments').find({
      disasterId: disasterId
    }).toArray();

    console.log(`\nAll households for that disaster:`);
    all.forEach(h => {
      console.log(`  ${h.headOfHousehold?.name} - ID: ${h._id}`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findOldHouseholds();
