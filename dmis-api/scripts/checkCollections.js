import mongoose from 'mongoose';
import 'dotenv/config';

async function checkCollections() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('🔍 Checking Collections\n');

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`Collections that exist:`);
    collections.forEach(c => {
      console.log(`  - ${c.name}`);
    });

    console.log('\n📊 Collection Counts:');

    // Count in both possible names
    const count1 = await db.collection('householdassessments').countDocuments();
    console.log(`  householdassessments: ${count1}`);

    const count2 = await db.collection('household_assessments').countDocuments();
    console.log(`  household_assessments: ${count2}`);

    // Check what Mongoose thinks
    const HouseholdAssessment = mongoose.model('HouseholdAssessment', new mongoose.Schema({}, { strict: false, collection: 'household_assessments' }));
    const mongooseCount = await HouseholdAssessment.countDocuments();
    console.log(`  Mongoose model count: ${mongooseCount}`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCollections();
