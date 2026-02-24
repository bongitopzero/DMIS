/**
 * Populate household assessments for existing disasters
 * Run: node scripts/populateHouseholds.js
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dmis_secret_key_123';

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

const populateHouseholds = async () => {
  const token = createTestToken();
  const headers = { 
    Authorization: `Bearer ${token}`,
    'user': JSON.stringify({ role: 'Data Clerk', id: 'test-user' })
  };

  try {
    console.log('📋 Fetching verified disasters...');
    const disastersRes = await axios.get(`${API_URL}/disasters`, { headers });
    const verifiedDisasters = disastersRes.data.filter(d => d.status === 'verified');
    
    console.log(`✅ Found ${verifiedDisasters.length} verified disasters\n`);

    for (const disaster of verifiedDisasters) {
      console.log(`📝 Adding households for: ${disaster.type} in ${disaster.district}`);
      
      // Create sample households
      const households = [
        {
          householdId: `HH-${disaster._id.slice(-4)}-001`,
          headOfHousehold: { name: 'John Mthembu', age: 45, gender: 'Male' },
          householdSize: 5,
          childrenUnder5: 1,
          monthlyIncome: 2500,
          incomeCategory: 'Low',
          disasterType: 'Drought',
          damageSeverityLevel: 2,
          damageDescription: 'Partial crop damage and loss of livestock',
          damageDetails: {
            cropLossPercentage: 60,
            livestockLoss: 2,
            waterAccessImpacted: true
          }
        },
        {
          householdId: `HH-${disaster._id.slice(-4)}-002`,
          headOfHousehold: { name: 'Thembi Ndlela', age: 38, gender: 'Female' },
          householdSize: 4,
          childrenUnder5: 0,
          monthlyIncome: 3500,
          incomeCategory: 'Low',
          disasterType: 'Drought',
          damageSeverityLevel: 3,
          damageDescription: 'Complete crop loss affecting 2 seasons',
          damageDetails: {
            cropLossPercentage: 100,
            waterAccessImpacted: true
          }
        },
        {
          householdId: `HH-${disaster._id.slice(-4)}-003`,
          headOfHousehold: { name: 'Joseph Molefe', age: 52, gender: 'Male' },
          householdSize: 6,
          childrenUnder5: 2,
          monthlyIncome: 5000,
          incomeCategory: 'Middle',
          disasterType: 'Drought',
          damageSeverityLevel: 2,
          damageDescription: 'Moderate crop damage and reduced water supply',
          damageDetails: {
            cropLossPercentage: 40,
            waterAccessImpacted: true
          }
        }
      ];

      let successCount = 0;
      for (const household of households) {
        try {
          const payload = {
            disasterId: disaster._id,
            householdId: household.householdId,
            headOfHousehold: household.headOfHousehold,
            householdSize: household.householdSize,
            childrenUnder5: household.childrenUnder5,
            monthlyIncome: household.monthlyIncome,
            incomeCategory: household.incomeCategory,
            disasterType: household.disasterType,
            damageDescription: household.damageDescription,
            damageSeverityLevel: household.damageSeverityLevel,
            damageDetails: household.damageDetails,
            assessedBy: 'Household Population Script'
          };

          await axios.post(`${API_URL}/allocation/assessments`, payload, { headers });
          successCount++;
          console.log(`  ✅ Added ${household.headOfHousehold.name}`);
        } catch (err) {
          console.log(`  ❌ Failed to add ${household.headOfHousehold.name}:`, err.response?.data?.message);
        }
      }

      console.log(`  Result: ${successCount}/${households.length} households added\n`);
    }

    console.log('✅ Population complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
};

populateHouseholds();
