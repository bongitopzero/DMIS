import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// Test user (finance officer)
const testUser = {
  role: 'Finance Officer',
  id: 'test-user-123'
};

const headers = {
  'Authorization': 'Bearer test-token-ignored-by-api',
  'user': JSON.stringify(testUser)
};

async function testFrontendAPI() {
  try {
    console.log('🧪 Testing Frontend API Calls\n');

    // Get disasters
    const disasterRes = await axios.get(`${API_URL}/disasters`, { headers });
    const verified = disasterRes.data.filter(d => d.status === 'verified');
    console.log(`✅ Found ${verified.length} verified disasters\n`);

    // Test the exact call the frontend makes
    if (verified.length > 0) {
      const disaster = verified[0];
      console.log(`Testing API call that frontend makes:`);
      console.log(`GET /api/allocation/assessments/${disaster._id}`);
      
      const assessmentRes = await axios.get(
        `${API_URL}/allocation/assessments/${disaster._id}`,
        { headers }
      );

      console.log(`\n📊 API Response Structure:`);
      console.log(`  Response keys: ${Object.keys(assessmentRes.data).join(', ')}`);
      console.log(`  Count: ${assessmentRes.data.count}`);
      console.log(`  Assessments array: ${Array.isArray(assessmentRes.data.assessments) ? 'YES ✅' : 'NO ❌'}`);
      console.log(`  Items in array: ${assessmentRes.data.assessments?.length || 0}`);

      console.log(`\n💾 Sample Household Data:`);
      if (assessmentRes.data.assessments?.length > 0) {
        const sample = assessmentRes.data.assessments[0];
        console.log(`  Head of Household: ${sample.headOfHousehold?.name || sample.householdHeadName}`);
        console.log(`  Monthly Income: M${sample.monthlyIncome}`);
        console.log(`  Household Size: ${sample.householdSize}`);
        console.log(`  Damage Severity: ${sample.damageSeverityLevel}/4`);
      }

      console.log(`\n✅ Frontend should now display ${assessmentRes.data.count} households!`);
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

testFrontendAPI();
