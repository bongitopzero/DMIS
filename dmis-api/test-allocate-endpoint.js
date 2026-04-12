/**
 * Test script for /allocation/allocate endpoint
 * Tests endpoint with different user roles and disaster scenarios
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

// Test users - these should exist in your system
const testUsers = {
  coordinator: {
    email: 'coordinator@dmis.com',
    password: 'coordinator123',
    expectedRole: 'Coordinator'
  },
  financeOfficer: {
    email: 'finance@dmis.com',
    password: 'finance123',
    expectedRole: 'Finance Officer'
  },
  dataClerk: {
    email: 'clerk@dmis.com',
    password: 'clerk123',
    expectedRole: 'Data Clerk'
  },
  admin: {
    email: 'admin@dmis.com',
    password: 'admin123',
    expectedRole: 'Administrator'
  }
};

/**
 * Login and get auth token
 */
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    console.log(`✓ Login successful for ${email}`);
    console.log(`  Role: ${response.data.user.role}`);
    
    return {
      token: response.data.token,
      user: response.data.user,
      headers: {
        Authorization: `Bearer ${response.data.token}`,
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    console.error(`✗ Login failed for ${email}:`, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Test allocation endpoint with given auth
 */
async function testAllocate(authHeaders, userRole, testData) {
  try {
    console.log(`\n📝 Testing allocation with role: ${userRole}`);
    
    const response = await axios.post(
      `${API_BASE}/allocation/allocate`,
      testData,
      { headers: authHeaders }
    );
    
    console.log(`✓ Allocation endpoint returned ${response.status}`);
    console.log(`  Response:`, response.data);
    
  } catch (err) {
    console.error(`✗ Allocation endpoint returned ${err.response?.status}`);
    console.error(`  Error:`, err.response?.data || err.message);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('=== ALLOCATION ENDPOINT TEST SUITE ===\n');
  
  // First, get available disasters and households
  console.log('📊 Fetching test data...');
  
  try {
    // Get a disaster
    let disasterRes;
    try {
      disasterRes = await axios.get(`${API_BASE}/disasters`);
    } catch (err) {
      console.log('  Trying alternate endpoint...');
      disasterRes = await axios.get(`${API_BASE}/incident/all`);
    }
    
    const disasters = Array.isArray(disasterRes.data) ? disasterRes.data : disasterRes.data.disasters || [];
    const testDisaster = disasters.find(d => d.status === 'verified' || d.status === 'approved') || disasters[0];
    
    console.log(`✓ Found ${disasters.length} disasters`);
    if (testDisaster) {
      console.log(`  Using disaster: ${testDisaster.name || testDisaster.title} (${testDisaster._id})`);
    } else {
      console.log('  ⚠️ No disasters found - tests may fail');
    }
    
    // Get households for this disaster
    let households = [];
    if (testDisaster) {
      const householdsRes = await axios.get(`${API_BASE}/disaster/${testDisaster._id}/households`);
      households = householdsRes.data || [];
      console.log(`✓ Found ${households.length} households for this disaster`);
    }
    
    const testHousehold = households[0];
    
    // Test with each user role
    for (const [userKey, userCredentials] of Object.entries(testUsers)) {
      try {
        const auth = await login(userCredentials.email, userCredentials.password);
        
        if (testDisaster && testHousehold) {
          const testPayload = {
            disasterId: testDisaster._id,
            householdId: testHousehold._id || testHousehold.id,
            householdHeadName: testHousehold.headOfHousehold?.name || 'Test Household',
            packages: [
              {
                _id: '507f1f77bcf86cd799439011',
                name: 'Test Package',
                cost: 10000
              }
            ],
            totalCost: 10000,
            allocatedBy: auth.user.id,
            timestamp: new Date().toISOString(),
            isOverridden: false
          };
          
          await testAllocate(auth.headers, userCredentials.expectedRole, testPayload);
        } else {
          console.log(`⚠️ Skipping allocation test for ${userCredentials.expectedRole} - no test data available`);
        }
        
      } catch (loginErr) {
        console.log(`⚠️ Skipping allocation test for ${userCredentials.expectedRole}`);
      }
    }
    
  } catch (err) {
    console.error('Failed to fetch test data:', err.message);
  }
  
  console.log('\n=== TEST SUITE COMPLETE ===');
}

// Run tests
runTests().catch(console.error);
