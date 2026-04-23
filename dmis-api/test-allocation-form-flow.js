/**
 * Test: Allocation Creation Flow from Form
 * Tests the complete flow: form submission → controller → database save
 */

import axios from 'axios';
import mongoose from 'mongoose';
import { connectDB, getDB } from './config/db.js';

const API_URL = 'http://localhost:5000/api';

// Test user token (adjust as needed)
const TEST_AUTH_TOKEN = 'your-test-token-here';
const TEST_USER = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  role: 'Finance Officer',
  email: 'test@dmis.gov',
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
    'User': JSON.stringify(TEST_USER),
  },
});

async function testAllocationCreationFlow() {
  try {
    console.log('\n========== ALLOCATION CREATION FLOW TEST ==========\n');

    // Step 1: Connect to DB
    console.log('1️⃣ Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Step 2: Get a test disaster
    console.log('\n2️⃣ Fetching test disaster...');
    let disasterRes;
    try {
      disasterRes = await api.get('/disasters');
      if (!disasterRes.data.disasters || disasterRes.data.disasters.length === 0) {
        console.log('⚠️ No disasters found. Creating test disaster...');
        // You may need to create a test disaster first
        return;
      }
    } catch (err) {
      console.error('❌ Error fetching disasters:', err.message);
      return;
    }
    const testDisaster = disasterRes.data.disasters[0];
    console.log(`✅ Using disaster: ${testDisaster._id} (${testDisaster.incidentType})`);

    // Step 3: Get a test assessment
    console.log('\n3️⃣ Fetching test assessment...');
    let assessmentRes;
    try {
      assessmentRes = await api.get(`/allocation/assessments/${testDisaster._id}`);
      if (!assessmentRes.data.assessments || assessmentRes.data.assessments.length === 0) {
        console.log('⚠️ No assessments found for this disaster.');
        console.log('   Please create household assessments first.');
        return;
      }
    } catch (err) {
      console.error('❌ Error fetching assessments:', err.message);
      return;
    }
    const testAssessment = assessmentRes.data.assessments[0];
    console.log(`✅ Using assessment: ${testAssessment._id}`);
    console.log(`   Household: ${testAssessment.headOfHousehold}`);
    console.log(`   Damage Level: ${testAssessment.damageSeverityLevel}`);

    // Step 4: Create allocation request using FORM PAYLOAD (minimal)
    console.log('\n4️⃣ Creating allocation request with FORM PAYLOAD...');
    console.log('   Payload: { assessmentId, disasterId, override, overrideReason, overrideJustification }');

    const formPayload = {
      assessmentId: testAssessment._id.toString(),
      disasterId: testDisaster._id.toString(),
      override: false,
      overrideReason: undefined,
      overrideJustification: undefined,
    };

    console.log(`   Request: POST /allocation/create-request`);
    console.log(`   Body:`, JSON.stringify(formPayload, null, 2));

    let createRes;
    try {
      createRes = await api.post('/allocation/create-request', formPayload);
      console.log('✅ Allocation request created successfully!');
      console.log(`   Request ID: ${createRes.data.requestId}`);
      console.log(`   Allocation ID: ${createRes.data.allocationId}`);
      console.log(`   Status: ${createRes.data.status}`);
      console.log(`   Amount: ${createRes.data.amount}`);
    } catch (err) {
      console.error('❌ Error creating allocation request:');
      console.error('   Status:', err.response?.status);
      console.error('   Message:', err.response?.data?.message);
      console.error('   Details:', err.response?.data?.error);
      return;
    }

    // Step 5: Verify allocation saved to DB
    console.log('\n5️⃣ Verifying allocation saved to MongoDB...');
    try {
      const AidAllocationRequest = (await import('./models/AidAllocationRequest.js')).default;
      const savedAllocation = await AidAllocationRequest.findById(createRes.data.allocationId)
        .populate('householdAssessmentId')
        .lean();

      if (savedAllocation) {
        console.log('✅ Allocation found in database!');
        console.log(`   Request ID: ${savedAllocation.requestId}`);
        console.log(`   Status: ${savedAllocation.status}`);
        console.log(`   Household ID: ${savedAllocation.householdId}`);
        console.log(`   Total Cost: ${savedAllocation.totalEstimatedCost}`);
        console.log(`   Packages: ${savedAllocation.allocatedPackages?.length || 0}`);
        if (savedAllocation.allocatedPackages?.length > 0) {
          savedAllocation.allocatedPackages.forEach((pkg, idx) => {
            console.log(`     ${idx + 1}. ${pkg.packageName} - ${pkg.totalCost}`);
          });
        }
      } else {
        console.error('❌ Allocation NOT found in database after creation!');
      }
    } catch (err) {
      console.error('❌ Error querying database:', err.message);
    }

    console.log('\n========== TEST COMPLETE ==========\n');
    process.exit(0);

  } catch (error) {
    console.error('Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testAllocationCreationFlow();
