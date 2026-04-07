import mongoose from 'mongoose';
import 'dotenv/config';
import Disaster from './models/Disaster.js';

async function fixDisasterCodes() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }

    console.log('🔧 Starting disaster code fixing...\n');

    // Get ALL disasters sorted by creation date
    const allDisasters = await Disaster.find()
      .sort({ createdAt: 1 });

    console.log(`📊 Found ${allDisasters.length} total disasters\n`);

    if (allDisasters.length === 0) {
      console.log('✅ No disasters to update');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Assign codes based on creation order
    let updated = 0;
    let unchanged = 0;

    for (let i = 0; i < allDisasters.length; i++) {
      const disaster = allDisasters[i];
      const expectedCode = `D-2026-${String(i + 1).padStart(3, '0')}`;
      const idStr = String(disaster._id).slice(-6);

      if (disaster.disasterCode === expectedCode) {
        console.log(`✓ ${idStr} already correct: ${expectedCode}`);
        unchanged++;
      } else {
        try {
          await Disaster.findByIdAndUpdate(disaster._id, { disasterCode: expectedCode });
          const oldCode = disaster.disasterCode || 'none';
          console.log(`✅ Updated ${idStr}: ${oldCode} → ${expectedCode}`);
          updated++;
        } catch (err) {
          console.error(`❌ Error updating ${idStr}:`, err.message);
        }
      }
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Total: ${updated + unchanged}`);
    console.log(`\n✅ All disaster codes assigned by creation order!`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDisasterCodes();
