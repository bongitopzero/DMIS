import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Disaster from '../models/Disaster.js';
import HouseholdAssessment from '../models/HouseholdAssessment.js';
import AidAllocationRequest from '../models/AidAllocationRequest.js';

dotenv.config();

const SESOTHO_FIRST = [
  'Thabo','Tšepo','Kabelo','Mpho','Pule','Ntate','Keletso','Lebohang','Nonofo','Rorisang',
  'Makatse','Makhotso','Nthabiseng','Motheo','Moshoeshoe','Mokete','Mothusi','Mamashe','Kholofelo','Lerato'
];
const SESOTHO_LAST = [
  'Mokhosi','Mathebe','Mokhosi','Monyai','Mokhothu','Lekhooa','Sekhonyana','Mabela','Mofolo','Ramahlokoana',
  'Mokone','Pheko','Mekoa','Tšita','Mokhoro','Mokete','Mapheto','Mofokeng','Sekhonyane','Mokhesi'
];

const villages = [
  'Ha Motala','Ha Nkonki','Ha Mafa','Ha Sello','Ha Tšoeu','Ha Monyane','Ha Matata','Ha Lebona','Ha Ralejoe','Ha Pheto'
];

const districts = [
  'Maseru','Leribe','Berea','Mafeteng','Mohale\'s Hoek','Quthing','Qacha\'s Nek','Butha-Buthe','Thaba-Tseka','Mokhotlong'
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function sesothoName() {
  return `${randFrom(SESOTHO_FIRST)} ${randFrom(SESOTHO_LAST)}`;
}

function damageDescription() {
  const templates = [
    'Roof partially collapsed; major water ingress to main living room and loss of bedding and food stocks.',
    'Severe structural damage to main roof and walls; livestock pen destroyed and maize stores lost.',
    'Flooding of household floor level; electrical points damaged and kitchen facilities destroyed.',
    'Wind gusts tore off roof sheeting; internal walls cracked; family lost cooking equipment.',
    'Drought induced crop failure and water shortage; livestock weakened and some died.',
    'House roof collapsed during storm; family displaced, children and elderly affected.',
    'Partial roof and window damage; contamination of household water sources; sanitation impacted.',
    'Severe damage to granary and food reserves; immediate food assistance required.',
    'Household kitchen and sleeping area inundated; mattresses and clothing destroyed.',
    'Multiple rooms damaged, roof supports compromised; urgent repair and shelter materials needed.'
  ];
  return randFrom(templates);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const created = [];

  for (let i = 0; i < 20; i++) {
    const district = randFrom(districts);
    const village = randFrom(villages);
    const householdsCount = randInt(10, 40);

    const occurrence = new Date(Date.now() - randInt(0, 30) * 24 * 3600 * 1000);
    const disasterPayload = {
      type: randFrom(['drought','heavy_rainfall','strong_winds']),
      district,
      village,
      affectedPopulation: `${householdsCount} households`,
      totalAffectedHouseholds: householdsCount,
      households: `${Math.min(0, householdsCount)}-${householdsCount}`,
      damages: 'See household assessments',
      needs: 'See household assessments',
      severity: randFrom(['low','medium','high']),
      status: 'reported',
      numberOfHouseholdsAffected: householdsCount,
      date: occurrence,
      occurrenceDate: occurrence,
    };

    const disaster = await Disaster.create(disasterPayload);

    const households = [];
    for (let h = 0; h < householdsCount; h++) {
      const headName = sesothoName();
      const age = randInt(20, 80);
      const householdSize = randInt(1, 10);

      // Map disaster.type (snake-case) to assessment disasterType enum (Title Case)
      const disasterTypeMapping = {
        drought: 'Drought',
        heavy_rainfall: 'Heavy Rainfall',
        strong_winds: 'Strong Winds',
      };

      const assessment = await HouseholdAssessment.create({
        disasterId: disaster._id,
        householdId: `HH-${String(h + 1).padStart(3,'0')}`,
        headOfHousehold: { name: headName, age, gender: randFrom(['Male','Female']) },
        householdSize,
        childrenUnder5: randInt(0, Math.min(3, householdSize)),
        monthlyIncome: randInt(500, 15000),
        incomeCategory: 'Low',
        disasterType: disasterTypeMapping[disaster.type] || 'Drought',
        damageDescription: damageDescription(),
        damageSeverityLevel: randInt(1,4),
        assessedBy: 'Data Clerk',
        location: { village, district }
      });
      households.push(assessment);
    }

    console.log(`Created disaster ${disaster._id} with ${householdsCount} households`);
    created.push({ disaster, households });
  }

  console.log(`Created ${created.length} disasters.`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

seed().catch(err => {
  console.error('Seeding failed', err);
  process.exit(1);
});

