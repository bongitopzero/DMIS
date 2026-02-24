import mongoose from 'mongoose';
import 'dotenv/config';

async function compareQueries() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const disasterId = '699c870bfe1ce6d8e356b1d0';
    const disasterObjId = new mongoose.Types.ObjectId(disasterId);
    
    console.log('🔍 Comparing Query Methods\n');
    console.log(`Target Disaster ID: ${disasterId}\n`);

    const db = mongoose.connection.db;

    // Method 1: Native with string
    const count1 = await db.collection('householdassessments')
      .countDocuments({ disasterId: disasterId });
    console.log(`1. Native query with STRING: ${count1}`);

    // Method 2: Native with ObjectId
    const count2 = await db.collection('householdassessments')
      .countDocuments({ disasterId: disasterObjId });
    console.log(`2. Native query with ObjectId: ${count2}`);

    // Method 3: Find and see types
    const sample = await db.collection('householdassessments').findOne({});
    if (sample) {
      console.log(`\n3. Sample document disasterId type: ${typeof sample.disasterId}`);
      console.log(`   Value: ${sample.disasterId}`);
      console.log(`   Constructor: ${sample.disasterId?.constructor?.name}`);
    }

    // Method 4: Get all docs and count manually
    const allDocs = await db.collection('householdassessments').find({}).toArray();
    const matching = allDocs.filter(d => d.disasterId?.toString() === disasterId);
    console.log(`\n4. Manual filter with .toString(): ${matching.length}`);

    // Method 5: Using Mongoose directly
    const HouseholdAssessment = mongoose.model('HouseholdAssessment', new mongoose.Schema({}, { strict: false }));
    const mongooseCount = await HouseholdAssessment.countDocuments({ disasterId: disasterObjId });
    console.log(`5. Mongoose countDocuments: ${mongooseCount}`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

compareQueries();
