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

async function testAPI() {
  const token = createTestToken();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    console.log('Testing API with running server...\n');

    // Get disasters
    const disRes = await axios.get(`${API_URL}/disasters`, { headers });
    const verified = disRes.data.filter(d => d.status === 'verified');
    
    const disaster = verified[0];
    console.log(`First verified disaster: ${disaster.type} (${disaster._id})`);
    console.log(`\nFetching assessments for: ${disaster._id.toString()}`);
    
    const assessRes = await axios.get(
      `${API_URL}/allocation/assessments/${disaster._id.toString()}`,
      { headers }
    );

    console.log(`\nAPI Response:
  count: ${assessRes.data.count}
  assessments length: ${assessRes.data.assessments.length}
  First household: ${assessRes.data.assessments[0]?.headOfHousehold?.name || 'N/A'}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();
