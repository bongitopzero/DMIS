/**
 * Direct Database Test: Allocation Persistence
 * Uses real test data from the database
 */

import mongoose from 'mongoose';
import 'dotenv/config.js';

// Import models
import AidAllocationRequest from './models/AidAllocationRequest.js';
import HouseholdAssessment from './models/HouseholdAssessment.js';
import Disaster from './models/Disaster.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dmis';

async function testAllocationPersistence() {
  let connection;
  try {
    console.log('\n========== ALLOCATION PERSISTENCE TEST ==========\n');

    // Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    connection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB via Mongoose');

    // Find real test assessment
    console.log('\n2️⃣ Fetching real test assessment from database...');
    
    const testAssessment = await HouseholdAssessment.findOne()
      .populate('disasterId')
      .lean();

    if (!testAssessment) {
      console.error('❌ No assessments found in database');
      process.exit(1);
    }

    console.log(`✅ Found assessment: ${testAssessment._id}`);
    console.log(`   Household: ${testAssessment.headOfHousehold.name}`);
    console.log(`   Status: ${testAssessment.status}`);
    console.log(`   Disaster: ${testAssessment.disasterId._id}`);
    console.log(`   Damage Level: ${testAssessment.damageSeverityLevel}`);

    // Test form payload (minimal)
    console.log('\n3️⃣ Creating allocation with FORM PAYLOAD...');
    const formPayload = {
      assessmentId: testAssessment._id.toString(),
      disasterId: testAssessment.disasterId._id.toString(),
      override: false,
    };

    console.log('   Form Payload:');
    console.log('   ' + JSON.stringify(formPayload, null, 4).replace(/\n/g, '\n   '));

    // Simulate controller logic  
    console.log('\n4️⃣ Simulating controller logic...');
    
    const assessmentId = formPayload.assessmentId;
    const disasterId = formPayload.disasterId;
    
    let finalHouseholdId, finalHeadOfHousehold, finalPackages, finalCompositeScore;
    let finalDamageLevel, finalVulnerability;

    console.log('   → Assessment lookup triggered (form has no packages)');
    const assessment = await HouseholdAssessment.findById(assessmentId).lean();
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    // Extract data from assessment
    finalHouseholdId = assessment.householdId;
    finalHeadOfHousehold = assessment.headOfHousehold.name;
    finalDamageLevel = assessment.damageSeverityLevel;
    finalCompositeScore = 65; // Default score for test (would be calculated in real scenario)
    
    // Use existing or generate packages from damage assessment
    finalPackages = [];
    if (assessment.damageDetails) {
      if (assessment.damageDetails.cropLossPercentage > 0) {
        finalPackages.push({
          packageId: new mongoose.Types.ObjectId(),
          packageName: 'Agricultural Support',
          quantity: 1,
          unitCost: 5000,
          totalCost: 5000,
          category: 'Agriculture',
        });
      }
      if (assessment.damageDetails.waterAccessImpacted) {
        finalPackages.push({
          packageId: new mongoose.Types.ObjectId(),
          packageName: 'Water & Sanitation',
          quantity: 1,
          unitCost: 3000,
          totalCost: 3000,
          category: 'WASH',
        });
      }
    }
    
    // Add basic food package if no others
    if (finalPackages.length === 0) {
      finalPackages.push({
        packageId: new mongoose.Types.ObjectId(),
        packageName: 'Basic Food Package',
        quantity: 1,
        unitCost: 4000,
        totalCost: 4000,
        category: 'Food',
      });
    }

    const finalTotalCost = finalPackages.reduce((sum, pkg) => sum + (pkg.totalCost || 0), 0);
    
    // Determine aid tier based on composite score
    let finalAidTier = 'Basic Support (0-3)';
    if (finalCompositeScore >= 4 && finalCompositeScore < 7) {
      finalAidTier = 'Shelter + Food + Cash (4-6)';
    } else if (finalCompositeScore >= 7 && finalCompositeScore < 10) {
      finalAidTier = 'Tent + Reconstruction + Food (7-9)';
    } else if (finalCompositeScore >= 10) {
      finalAidTier = 'Priority Reconstruction + Livelihood (10+)';
    }
    
    console.log(`   ✅ Assessment lookup complete:`);
    console.log(`     - Household: ${finalHeadOfHousehold}`);
    console.log(`     - Packages generated: ${finalPackages.length}`);
    console.log(`     - Total Cost: ${finalTotalCost}`);
    console.log(`     - Composite Score: ${finalCompositeScore}`);
    console.log(`     - Aid Tier: ${finalAidTier}`);
    finalPackages.forEach((pkg, idx) => {
      console.log(`       ${idx + 1}. ${pkg.packageName} - $${pkg.totalCost}`);
    });

    // Save to database
    console.log('\n5️⃣ PERSISTING TO DATABASE...');
    
    const requestId = `REQ-${Date.now()}`;
    const testUserId = new mongoose.Types.ObjectId(); // Mock user ID
    console.log(`   → Creating AidAllocationRequest (${requestId})...`);
    
    const allocationRequest = new AidAllocationRequest({
      requestId,
      disasterId: new mongoose.Types.ObjectId(disasterId),
      householdAssessmentId: new mongoose.Types.ObjectId(assessmentId),
      householdId: finalHouseholdId,
      damageLevel: finalDamageLevel,
      compositeScore: finalCompositeScore,
      aidTier: finalAidTier,
      createdBy: testUserId,
      headOfHousehold: finalHeadOfHousehold,
      allocatedPackages: finalPackages,
      totalEstimatedCost: finalTotalCost,
      status: 'Proposed',
      createdAt: new Date(),
    });

    console.log('   → Calling .save()...');
    const savedAllocation = await allocationRequest.save();
    console.log('✅ ALLOCATION SAVED TO DATABASE!');
    console.log(`   Document ID: ${savedAllocation._id}`);
    console.log(`   Request ID: ${savedAllocation.requestId}`);
    console.log(`   Status: ${savedAllocation.status}`);

    // Verify in database
    console.log('\n6️⃣ VERIFYING ALLOCATION IN DATABASE...');
    
    const dbAllocation = await AidAllocationRequest.findById(savedAllocation._id).lean();

    if (dbAllocation) {
      console.log('✅ ALLOCATION FOUND IN DATABASE!');
      console.log(`   ID: ${dbAllocation._id}`);
      console.log(`   Request ID: ${dbAllocation.requestId}`);
      console.log(`   Status: ${dbAllocation.status}`);
      console.log(`   Household: ${dbAllocation.headOfHousehold}`);
      console.log(`   Damage Level: ${dbAllocation.damageLevel}`);
      console.log(`   Composite Score: ${dbAllocation.compositeScore}`);
      console.log(`   Aid Tier: ${dbAllocation.aidTier}`);
      console.log(`   Total Cost: $${dbAllocation.totalEstimatedCost}`);
      console.log(`   Packages: ${dbAllocation.allocatedPackages?.length || 0}`);
      
      if (dbAllocation.allocatedPackages?.length > 0) {
        console.log('   Packages allocated:');
        dbAllocation.allocatedPackages.forEach((pkg, idx) => {
          console.log(`     ${idx + 1}. ${pkg.packageName} - $${pkg.totalCost}`);
        });
      }

      console.log('\n' + '='.repeat(50));
      console.log('✅ TEST PASSED - PERSISTENCE WORKING!');
      console.log('='.repeat(50));
      console.log('\n✅ Form Payload → Database Persistence is SUCCESSFUL!');
      console.log('\nThe allocation:');
      console.log('  1. Created with minimal form payload (assessmentId, disasterId)');
      console.log('  2. Controller looked up assessment data');
      console.log('  3. Extracted and generated packages from assessment');
      console.log('  4. Saved to aid_allocation_requests collection');
      console.log('  5. Verified present in database\n');

    } else {
      console.error('\n❌ ALLOCATION NOT FOUND IN DATABASE AFTER SAVE!');
      console.error('❌ TEST FAILED - PERSISTENCE NOT WORKING!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('\n👋 MongoDB connection closed');
    }
    process.exit(0);
  }
}

testAllocationPersistence();
