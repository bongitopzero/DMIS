import mongoose from 'mongoose';
import 'dotenv/config';

async function consolidateCollections() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('🔄 Consolidating Collections\n');

    // Clear the correct collection
    const oldCount = await db.collection('household_assessments').countDocuments();
    console.log(`Current household_assessments count: ${oldCount}`);

    const deleteResult = await db.collection('household_assessments').deleteMany({});
    console.log(`Deleted: ${deleteResult.deletedCount}\n`);

    // Get data from the other collection
    const newData = await db.collection('householdassessments').find({}).toArray();
    console.log(`Found ${newData.length} fresh records in householdassessments`);

    // Insert into correct collection
    const insertResult = await db.collection('household_assessments').insertMany(newData);
    console.log(`Inserted ${insertResult.insertedIds.length} records into household_assessments\n`);

    // Verify
    const finalCount = await db.collection('household_assessments').countDocuments();
    console.log(`✅ Final household_assessments count: ${finalCount}`);

    // Clean up the old collection
    const dropResult = await db.collection('householdassessments').deleteMany({});
    console.log(`Cleaned up old collection: ${dropResult.deletedCount} removed`);

    // Verify breakdown by disaster
    const disasters = await db.collection('disasters').find({ status: 'verified' }).toArray();
    console.log('\n📊 Final data by disaster:');
    
    for (const disaster of disasters) {
      const count = await db.collection('household_assessments').countDocuments({
        disasterId: disaster._id
      });
      console.log(`  ${disaster.type}: ${count} households`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

consolidateCollections();
