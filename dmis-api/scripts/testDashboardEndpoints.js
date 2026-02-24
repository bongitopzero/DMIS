/**
 * Test script to verify dashboard endpoints are working
 * Run: node scripts/testDashboardEndpoints.js
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dmis_secret_key_123';

// Create a test JWT token
const createTestToken = () => {
  return jwt.sign(
    { 
      _id: 'test-user',
      email: 'test@example.com',
      role: 'Administrator'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const testEndpoints = async () => {
  const token = createTestToken();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    console.log('🧪 Testing Dashboard Endpoints...\n');

    // Test 1: Get disasters by type
    console.log('📊 Testing: GET /disasters/dashboard/by-type');
    try {
      const res = await axios.get(`${API_URL}/disasters/dashboard/by-type`, { headers });
      console.log('✅ Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log('❌ Error:', err.response?.data || err.message);
    }

    console.log('\n---\n');

    // Test 2: Get disasters by month
    console.log('📊 Testing: GET /disasters/dashboard/by-month');
    try {
      const res = await axios.get(`${API_URL}/disasters/dashboard/by-month`, { headers });
      console.log('✅ Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log('❌ Error:', err.response?.data || err.message);
    }

    console.log('\n---\n');

    // Test 3: Get financial summary
    console.log('📊 Testing: GET /disasters/dashboard/financial-summary');
    try {
      const res = await axios.get(`${API_URL}/disasters/dashboard/financial-summary`, { headers });
      console.log('✅ Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log('❌ Error:', err.response?.data || err.message);
    }

    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Error:', err.message);
    process.exit(1);
  }
};

testEndpoints();
