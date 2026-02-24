/**
 * Debug script to check approved disasters and household assessments
 * Run: node scripts/debugAidAllocation.js
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

const debugAidAllocation = async () => {
  const token = createTestToken();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    console.log('🔍 Debugging Aid Allocation\n');

    // Step 1: Get all disasters
    console.log('📋 Step 1: Fetching all disasters...');
    const disastersRes = await axios.get(`${API_URL}/disasters`, { headers });
    const allDisasters = disastersRes.data;
    console.log(`✅ Total disasters: ${allDisasters.length}`);
    
    // Show status breakdown
    const statusCounts = {};
    allDisasters.forEach(d => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });
    console.log('Status breakdown:', statusCounts);
    console.log('');

    // Step 2: Filter verified disasters
    console.log('📋 Step 2: Filtering verified disasters...');
    const verifiedDisasters = allDisasters.filter(d => d.status === 'verified');
    console.log(`✅ Verified disasters: ${verifiedDisasters.length}`);
    
    if (verifiedDisasters.length > 0) {
      verifiedDisasters.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.type} in ${d.district} (ID: ${d._id})`);
      });
    } else {
      console.log('⚠️ No verified disasters found');
    }
    console.log('');

    // Step 3: Check household assessments for each verified disaster
    if (verifiedDisasters.length > 0) {
      console.log('📋 Step 3: Checking household assessments...');
      for (const disaster of verifiedDisasters) {
        try {
          const assessmentsRes = await axios.get(
            `${API_URL}/allocation/assessments/${disaster._id}`,
            { headers }
          );
          const data = assessmentsRes.data;
          console.log(`  Raw response:`, JSON.stringify(data).slice(0, 100));
          
          // Handle both response formats
          const households = data.assessments || data;
          console.log(`  Disaster ${disaster.type}: ${households.length || '?'} households`);
          
          if (households && households.length > 0) {
            households.slice(0, 2).forEach((h, idx) => {
              const headName = h.headOfHousehold?.name || h.householdHeadName || 'N/A';
              console.log(`    - ${headName} (Income: M${h.monthlyIncome})`);
            });
            if (households.length > 2) {
              console.log(`    ... and ${households.length - 2} more`);
            }
          }
        } catch (err) {
          console.log(`  ❌ Error fetching assessments for ${disaster._id}:`, err.response?.data?.message || err.message);
        }
      }
    }

    console.log('\n✅ Debug complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Debug Error:', err.response?.data || err.message);
    process.exit(1);
  }
};

debugAidAllocation();
