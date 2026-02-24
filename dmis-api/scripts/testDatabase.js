import mongoose from 'mongoose';
import 'dotenv/config';

async function testDatabase() {
  try {
    console.log('🔗 Testing MongoDB Connection');
    console.log(`MONGO_URI: ${process.env.MONGO_URI || 'NOT SET'}`);
    
    if (!process.env.MONGO_URI) {
      console.log('❌ MONGO_URI not set in environment');
      // Try a default connection
      console.log('\n📍 Attempting connection to mongodb://localhost:27017/dmis');
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    console.log('✅ MongoDB connected successfully!\n');

    // Query HouseholdAssessment directly
    const conn = mongoose.connection;
    const db = conn.db;
    
    const collection = db.collection('householdassessments');
    const count = await collection.countDocuments();
    
    console.log(`📊 Household Assessments in DB: ${count}`);
    
    if (count > 0) {
      const sample = await collection.findOne({});
      console.log('\n📋 Sample Household Document:');
      console.log(`  ID: ${sample._id}`);
      console.log(`  Head of Household: ${sample.headOfHousehold?.name || sample.householdHeadName}`);
      console.log(`  Disaster ID: ${sample.disasterId}`);
      console.log(`  Monthly Income: M${sample.monthlyIncome}`);
      console.log(`  Damage Severity: ${sample.damageSeverityLevel}/4`);
    }

    // Check by disaster
    const disasters = await db.collection('disasters').find({ status: 'verified' }).toArray();
    
    console.log(`\n📌 Verified Disasters: ${disasters.length}`);
    
    for (const disaster of disasters) {
      const householdCount = await collection.countDocuments({ disasterId: disaster._id.toString() });
      console.log(`  - ${disaster.type} (${disaster.location}): ${householdCount} households`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database test complete!');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
    process.exit(1);
  }
}

testDatabase();
