import mongoose from 'mongoose';
import 'dotenv/config';

async function cleanAndPopulate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;
    const householdsCollection = db.collection('householdassessments');
    const disastersCollection = db.collection('disasters');

    // Clear existing households
    console.log('🗑️  Clearing existing household data...');
    const deleteResult = await householdsCollection.deleteMany({});
    console.log(`  Deleted: ${deleteResult.deletedCount} records\n`);

    // Get verified disasters
    const disasters = await disastersCollection.find({ status: 'verified' }).toArray();
    console.log(`📌 Found ${disasters.length} verified disasters\n`);

    let totalAdded = 0;

    for (const disaster of disasters) {
      console.log(`📝 Adding 3 households for: ${disaster.type} in ${disaster.district}`);

      const households = [
        {
          disasterId: disaster._id,
          householdId: `HH-${disaster._id.toString().slice(-6)}-001`,
          headOfHousehold: { name: 'John Mthembu', age: 45, gender: 'Male' },
          householdSize: 5,
          childrenUnder5: 1,
          monthlyIncome: 2500,
          incomeCategory: 'Low',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 2,
          damageDescription: 'Partial damage to property',
          damageDetails: { cropLossPercentage: 60 },
          assessedBy: 'Population Script',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          disasterId: disaster._id,
          householdId: `HH-${disaster._id.toString().slice(-6)}-002`,
          headOfHousehold: { name: 'Thembi Ndlela', age: 38, gender: 'Female' },
          householdSize: 4,
          childrenUnder5: 0,
          monthlyIncome: 3500,
          incomeCategory: 'Low',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 3,
          damageDescription: 'Severe damage',
          damageDetails: { cropLossPercentage: 100 },
          assessedBy: 'Population Script',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          disasterId: disaster._id,
          householdId: `HH-${disaster._id.toString().slice(-6)}-003`,
          headOfHousehold: { name: 'Joseph Molefe', age: 52, gender: 'Male' },
          householdSize: 6,
          childrenUnder5: 2,
          monthlyIncome: 5000,
          incomeCategory: 'Middle',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 2,
          damageDescription: 'Moderate damage',
          damageDetails: { cropLossPercentage: 40 },
          assessedBy: 'Population Script',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const result = await householdsCollection.insertMany(households);
      console.log(`  ✅ Added 3 households\n`);
      totalAdded += households.length;
    }

    console.log(`✅ Repopulation complete! Total: ${totalAdded} households`);
    
    // Verify counts by disaster
    console.log('\n📊 Verification:');
    for (const disaster of disasters) {
      const count = await householdsCollection.countDocuments({ disasterId: disaster._id });
      console.log(`  ${disaster.type}: ${count} households`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAndPopulate();
