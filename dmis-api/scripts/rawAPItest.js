import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dmis_secret_key_123';

const createTestToken = () => {
  return jwt.sign(
    { 
      _id: 'test-user',
      email: 'test@example.com',
      role: 'Finance Officer'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

async function rawAPITest() {
  try {
    console.log('🧪 Raw API Test\n');

    const token = createTestToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'user': JSON.stringify({ role: 'Finance Officer', id: 'test' })
    };

    // Disaster 1
    const disasterId = '699c870bfe1ce6d8e356b1d0';
    console.log(`Testing disaster ID: ${disasterId}`);

    const res = await axios.get(
      `${API_URL}/allocation/assessments/${disasterId}`,
      { headers }
    );

    console.log(`\nRaw Response Status: ${res.status}`);
    console.log(`Response Count: ${res.data.count}`);
    console.log(`Response Assessments Length: ${res.data.assessments.length}`);
    
    console.log(`\nFirst 3 Household IDs in Response:`);
    res.data.assessments.slice(0, 3).forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.headOfHousehold?.name} (Age ${h.headOfHousehold?.age || '?'}) - ID: ${h._id}`);
    });

    if (res.data.assessments.length > 3) {
      console.log(`  ... and ${res.data.assessments.length - 3} more`);
    }

    console.log(`\nFull Response Data (first 500 chars):`);
    console.log(JSON.stringify(res.data).substring(0, 500));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

rawAPITest();
