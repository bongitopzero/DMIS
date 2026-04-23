import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AidAllocationRequest from './models/AidAllocationRequest.js';
import Disaster from './models/Disaster.js';

dotenv.config();

async function testAllocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find the disaster D-2026-033
    const disaster = await Disaster.findOne({ disasterCode: 'D-2026-033' });
    if (!disaster) {
      console.log('❌ Disaster D-2026-033 not found');
      const allDisasters = await Disaster.find().select('_id disasterCode type').limit(5);
      console.log('Sample disasters:', allDisasters);
      await mongoose.disconnect();
      return;
    }

    console.log('✓ Found disaster:', {
      _id: disaster._id,
      code: disaster.disasterCode,
      type: disaster.type,
    });

    // Find all allocations for this disaster
    const allocations = await AidAllocationRequest.find({
      disasterId: disaster._id,
    })
      .select('_id requestId householdHeadName status totalEstimatedCost packages')
      .lean();

    console.log(`\n✓ Found ${allocations.length} allocations for disaster ${disaster.disasterCode}:`);
    
    if (allocations.length === 0) {
      console.log('❌ NO ALLOCATIONS FOUND - This is the problem!');
    } else {
      allocations.forEach((a, i) => {
        console.log(`  [${i + 1}] ${a.householdHeadName || 'N/A'}`);
        console.log(`      - Status: ${a.status}`);
        console.log(`      - Amount: M${a.totalEstimatedCost}`);
        console.log(`      - Packages: ${a.packages?.length || 0}`);
      });
    }

    // Also check what allocations exist in total
    const totalCount = await AidAllocationRequest.countDocuments();
    console.log(`\nTotal allocations in database: ${totalCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

testAllocations();
