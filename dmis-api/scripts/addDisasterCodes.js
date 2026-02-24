import mongoose from 'mongoose';
import 'dotenv/config';

async function addDisasterCodes() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('📝 Adding disaster codes...\n');

    const disasters = [
      { index: 1, type: 'drought', district: 'Maseru' },
      { index: 2, type: 'drought', district: 'Mafeteng' },
      { index: 3, type: 'heavy_rainfall', district: 'Mokhotlong' }
    ];

    for (const disaster of disasters) {
      const found = await db.collection('disasters').findOne({
        type: disaster.type,
        district: disaster.district,
        status: 'verified'
      });

      if (found) {
        const code = `D-2026-00${disaster.index}`;
        
        // Update with disaster code and actual household count
        const householdCount = await db.collection('household_assessments')
          .countDocuments({ disasterId: found._id });

        await db.collection('disasters').updateOne(
          { _id: found._id },
          {
            $set: {
              disasterCode: code,
              numberOfHouseholdsAffected: householdCount
            }
          }
        );

        console.log(`✅ Updated ${code} (${found.type} in ${found.district})`);
        console.log(`   Household count: ${householdCount}\n`);
      }
    }

    console.log('✅ All disaster codes added!');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addDisasterCodes();
