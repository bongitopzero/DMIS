import mongoose from 'mongoose';
import 'dotenv/config';

async function testControllerLogic() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    // Get verified disasters
    const disasters = await db.collection('disasters').find({ status: 'verified' }).toArray();
    
    console.log('🔍 Testing MongoDB Query Logic\n');

    for (const disaster of disasters) {
      console.log(`Disaster: ${disaster.type} (${disaster._id})`);

      // Test 1: Direct query with ObjectId
      const count1 = await db.collection('householdassessments').countDocuments({
        disasterId: disaster._id
      });
      console.log(`  Query with ObjectId: ${count1}`);

      // Test 2: Query with string
      const count2 = await db.collection('householdassessments').countDocuments({
        disasterId: disaster._id.toString()
      });
      console.log(`  Query with string: ${count2}`);

      // Test 3: Find and check actual IDs
      const samples = await db.collection('householdassessments').find({
        disasterId: disaster._id
      }).limit(1).toArray();
      
      if (samples.length > 0) {
        console.log(`  Sample document disasterId type: ${typeof samples[0].disasterId}`);
        console.log(`  Sample document disasterId: ${samples[0].disasterId}`);
        console.log(`  Disaster _id type: ${typeof disaster._id}`);
        console.log(`  Disaster _id: ${disaster._id}`);
        console.log(`  Equal? ${JSON.stringify(samples[0].disasterId) === JSON.stringify(disaster._id)}`);
      }
      console.log();
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testControllerLogic();
