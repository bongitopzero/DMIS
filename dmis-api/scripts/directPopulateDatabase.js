import mongoose from 'mongoose';
import 'dotenv/config';

async function directPopulateDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      console.log('📍 Using default MongoDB URI');
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const householdsCollection = db.collection('householdassessments');
    const disastersCollection = db.collection('disasters');

    // Get verified disasters
    const disasters = await disastersCollection.find({ status: 'verified' }).toArray();
    console.log(`📌 Found ${disasters.length} verified disasters\n`);

    let totalAdded = 0;

    for (const disaster of disasters) {
      console.log(`📝 Adding households for: ${disaster.type} in ${disaster.district}`);

      const households = [
        {
          disasterId: disaster._id,
          householdId: `HH-${Date.now()}-001`,
          headOfHousehold: { name: 'John Mthembu', age: 45, gender: 'Male' },
          householdSize: 5,
          childrenUnder5: 1,
          monthlyIncome: 2500,
          incomeCategory: 'Low',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 2,
          damageDescription: 'Partial damage to property and livelihood',
          damageDetails: {
            cropLossPercentage: 60,
            livestockLoss: 2,
            propertyDamageValue: 5000
          },
          assessedBy: 'Direct Database Population',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          disasterId: disaster._id,
          householdId: `HH-${Date.now()}-002`,
          headOfHousehold: { name: 'Thembi Ndlela', age: 38, gender: 'Female' },
          householdSize: 4,
          childrenUnder5: 0,
          monthlyIncome: 3500,
          incomeCategory: 'Low',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 3,
          damageDescription: 'Severe damage requiring emergency support',
          damageDetails: {
            cropLossPercentage: 100,
            propertyDamageValue: 15000
          },
          assessedBy: 'Direct Database Population',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          disasterId: disaster._id,
          householdId: `HH-${Date.now()}-003`,
          headOfHousehold: { name: 'Joseph Molefe', age: 52, gender: 'Male' },
          householdSize: 6,
          childrenUnder5: 2,
          monthlyIncome: 5000,
          incomeCategory: 'Middle',
          disasterType: disaster.type === 'drought' ? 'Drought' : 'Heavy Rainfall',
          damageSeverityLevel: 2,
          damageDescription: 'Moderate damage affecting agricultural activities',
          damageDetails: {
            cropLossPercentage: 40,
            propertyDamageValue: 8000
          },
          assessedBy: 'Direct Database Population',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      try {
        const result = await householdsCollection.insertMany(households);
        console.log(`  ✅ Added ${result.insertedIds.length} households\n`);
        totalAdded += result.insertedIds.length;
      } catch (err) {
        console.log(`  ❌ Error adding households:`, err.message, '\n');
      }
    }

    console.log(`\n✅ Direct population complete! Added ${totalAdded} total households\n`);

    // Verify the data
    const count = await householdsCollection.countDocuments();
    console.log(`📊 Total in database now: ${count}`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

directPopulateDatabase();
