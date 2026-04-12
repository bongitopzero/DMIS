/**
 * Cleanup Script: Remove Duplicate Allocations
 * 
 * This script removes duplicate allocations that may have been created
 * before the uniqueness constraint was added to the database.
 * 
 * It keeps only the LATEST allocation for each (disasterId, householdAssessmentId) pair.
 * 
 * Usage: node cleanupDuplicateAllocations.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AidAllocationRequest from '../models/AidAllocationRequest.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmis';

async function cleanupDuplicateAllocations() {
  try {
    console.log('🔗 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all duplicate allocation groups
    console.log('\n🔍 Scanning for duplicate allocations...');
    
    const duplicateGroups = await AidAllocationRequest.aggregate([
      {
        $group: {
          _id: {
            disasterId: '$disasterId',
            householdAssessmentId: '$householdAssessmentId',
          },
          count: { $sum: 1 },
          records: { $push: '$_id' },
          createdDates: { $push: '$createdAt' },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log(`Found ${duplicateGroups.length} groups with duplicates\n`);

    if (duplicateGroups.length === 0) {
      console.log('✓ No duplicates found! Database is clean.');
      await mongoose.connection.close();
      return;
    }

    let totalDuplicatesRemoved = 0;

    // Process each duplicate group
    for (const group of duplicateGroups) {
      const { disasterId, householdAssessmentId } = group._id;
      const recordCount = group.count;
      const recordIds = group.records;

      console.log(`\n📋 Disaster: ${disasterId}, Household: ${householdAssessmentId}`);
      console.log(`   Found ${recordCount} duplicates:`);

      // Get all records for this group, sorted by creation date (newest first)
      const records = await AidAllocationRequest.find({
        disasterId,
        householdAssessmentId,
      }).sort({ createdAt: -1 });

      console.log(`   Keeping latest: ${records[0]._id} (created ${records[0].createdAt})`);

      // Keep the first (latest) and delete the rest
      const idsToDelete = records.slice(1).map(r => r._id);

      for (const idToDelete of idsToDelete) {
        await AidAllocationRequest.findByIdAndDelete(idToDelete);
        console.log(`   ✓ Deleted: ${idToDelete}`);
        totalDuplicatesRemoved++;
      }
    }

    console.log(`\n✅ Cleanup Complete!`);
    console.log(`   Total duplicate records removed: ${totalDuplicatesRemoved}`);
    console.log(`   Remaining records: ${await AidAllocationRequest.countDocuments()}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupDuplicateAllocations();
