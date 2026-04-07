import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Disaster from './models/Disaster.js';

dotenv.config();

async function fixDisasterCodes() {
  try {
    console.log('🔧 Starting disaster code fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dmis');
    console.log('✅ MongoDB connected');

    // Get All disasters sorted by creation date
    const allDisasters = await Disaster.find({}).sort({ createdAt: 1 });
    console.log(`📊 Found ${allDisasters.length} total disasters`);

    let fixedCount = 0;
    let skippedCount = 0;

    // Group by year to generate sequential codes
    const disastersByYear = {};
    allDisasters.forEach(d => {
      const year = new Date(d.createdAt).getFullYear();
      if (!disastersByYear[year]) {
        disastersByYear[year] = [];
      }
      disastersByYear[year].push(d);
    });

    // Process disasters by year
    for (const [year, disasters] of Object.entries(disastersByYear)) {
      console.log(`\n📅 Processing year ${year} (${disasters.length} disasters)`);
      
      for (let i = 0; i < disasters.length; i++) {
        const disaster = disasters[i];
        
        if (!disaster.disasterCode) {
          const newCode = `D-${year}-${String(i + 1).padStart(3, '0')}`;
          await Disaster.findByIdAndUpdate(disaster._id, { disasterCode: newCode });
          console.log(`   ✅ ${String(disaster._id).substring(0, 8)}... → ${newCode}`);
          fixedCount++;
        } else {
          console.log(`   ⏭️  ${String(disaster._id).substring(0, 8)}... already has code: ${disaster.disasterCode}`);
          skippedCount++;
        }
      }
    }

    console.log(`\n✅ Finished!`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${fixedCount + skippedCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixDisasterCodes();
