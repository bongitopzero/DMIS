import mongoose from 'mongoose';
import 'dotenv/config';

async function queryDirect() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    // Query using the exact disaster ID that the API is testing with
    const disasterId = '699c870bfe1ce6d8e356b1d0';
    
    console.log(`🔍 Direct MongoDB Query for disasterId: ${disasterId}\n`);

    // Try as string
    const countString = await db.collection('householdassessments')
      .countDocuments({ disasterId: disasterId });
    console.log(`Query with string: ${countString}`);

    // Try as ObjectId
    const objId = new mongoose.Types.ObjectId(disasterId);
    const countObjId = await db.collection('householdassessments')
      .countDocuments({ disasterId: objId });
    console.log(`Query with ObjectId: ${countObjId}`);

    // Get all documents for this disaster  
    const docs = await db.collection('householdassessments')
      .find({ disasterId: objId })
      .toArray();
    
    console.log(`\n📋 All ${docs.length} documents:`);
    docs.forEach(doc => {
      console.log(`  ${doc.headOfHousehold?.name || 'Unknown'} (${doc._id})`);
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryDirect();
