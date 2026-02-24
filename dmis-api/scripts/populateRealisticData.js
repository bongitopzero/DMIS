import mongoose from 'mongoose';
import 'dotenv/config';

async function populateRealisticData() {
  try {
    if (!process.env.MONGO_URI) {
      await mongoose.connect('mongodb://localhost:27017/dmis');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }
    
    const db = mongoose.connection.db;

    console.log('🗑️  Clearing old test data...');
    const deleteResult = await db.collection('household_assessments').deleteMany({});
    console.log(`Deleted: ${deleteResult.deletedCount} records\n`);

    // Get verified disasters
    const disasters = await db.collection('disasters')
      .find({ status: 'verified' })
      .toArray();

    console.log(`📦 Populating realistic household data...\n`);

    // Realistic household data for drought in Maseru
    const droughtMaseruHouseholds = [
      {
        householdId: 'HH-DM-001',
        headOfHousehold: { name: 'Lineo Mthembu', age: 42, gender: 'Female' },
        householdSize: 7,
        childrenUnder5: 2,
        monthlyIncome: 1800,
        incomeCategory: 'Low',
        disasterType: 'Drought',
        damageSeverityLevel: 3,
        damageDescription: 'Complete loss of maize crop (2 hectares), 40% of vegetable garden destroyed, water well dried up',
        damageDetails: {
          cropLossPercentage: 100,
          waterAccessImpacted: true,
          livestockLoss: 3
        },
        assessedBy: 'Data Clerk - Mohau Lebea',
        status: 'Approved'
      },
      {
        householdId: 'HH-DM-002',
        headOfHousehold: { name: 'Thabo Ramodibe', age: 55, gender: 'Male' },
        householdSize: 5,
        childrenUnder5: 0,
        monthlyIncome: 4200,
        incomeCategory: 'Middle',
        disasterType: 'Drought',
        damageSeverityLevel: 2,
        damageDescription: 'Partial crop damage affecting 1.5 hectares of prime agricultural land, reduced water supply by 60%',
        damageDetails: {
          cropLossPercentage: 60,
          waterAccessImpacted: true,
          livestockLoss: 1
        },
        assessedBy: 'Data Clerk - Mohau Lebea',
        status: 'Approved'
      },
      {
        householdId: 'HH-DM-003',
        headOfHousehold: { name: 'Mamello Skonjwa', age: 38, gender: 'Female' },
        householdSize: 6,
        childrenUnder5: 3,
        monthlyIncome: 2100,
        incomeCategory: 'Low',
        disasterType: 'Drought',
        damageSeverityLevel: 4,
        damageDescription: 'Total crop failure across 3 hectares, livestock mortality of 60%, water source completely depleted',
        damageDetails: {
          cropLossPercentage: 100,
          waterAccessImpacted: true,
          livestockLoss: 8
        },
        assessedBy: 'Data Clerk - Mohau Lebea',
        status: 'Approved'
      },
      {
        householdId: 'HH-DM-004',
        headOfHousehold: { name: 'Karabo Nkhosi', age: 48, gender: 'Male' },
        householdSize: 4,
        childrenUnder5: 1,
        monthlyIncome: 3500,
        incomeCategory: 'Middle',
        disasterType: 'Drought',
        damageSeverityLevel: 2,
        damageDescription: 'Moderate crop loss affecting subsistence farming, water rationing implemented',
        damageDetails: {
          cropLossPercentage: 45,
          waterAccessImpacted: true,
          livestockLoss: 2
        },
        assessedBy: 'Coordinator - Thandi Khubone',
        status: 'Approved'
      }
    ];

    // Realistic household data for drought in Mafeteng
    const droughtMafetengHouseholds = [
      {
        householdId: 'HH-DF-001',
        headOfHousehold: { name: 'Naledi Mkhize', age: 51, gender: 'Female' },
        householdSize: 8,
        childrenUnder5: 1,
        monthlyIncome: 1500,
        incomeCategory: 'Low',
        disasterType: 'Drought',
        damageSeverityLevel: 3,
        damageDescription: 'Severe drought impact: 50% livestock mortality, crop irrigation impossible, family relies on water truck',
        damageDetails: {
          cropLossPercentage: 80,
          waterAccessImpacted: true,
          livestockLoss: 5
        },
        assessedBy: 'Data Clerk - Lebohang Mokhosi',
        status: 'Approved'
      },
      {
        householdId: 'HH-DF-002',
        headOfHousehold: { name: 'Mpho Dikolo', age: 45, gender: 'Male' },
        householdSize: 5,
        childrenUnder5: 2,
        monthlyIncome: 2800,
        incomeCategory: 'Low',
        disasterType: 'Drought',
        damageSeverityLevel: 2,
        damageDescription: 'Reduced agricultural production, limited water for household consumption and livestock',
        damageDetails: {
          cropLossPercentage: 50,
          waterAccessImpacted: true,
          livestockLoss: 2
        },
        assessedBy: 'Data Clerk - Lebohang Mokhosi',
        status: 'Approved'
      },
      {
        householdId: 'HH-DF-003',
        headOfHousehold: { name: 'Reitumetse Phetlho', age: 35, gender: 'Female' },
        householdSize: 4,
        childrenUnder5: 0,
        monthlyIncome: 5800,
        incomeCategory: 'Middle',
        disasterType: 'Drought',
        damageSeverityLevel: 1,
        damageDescription: 'Minimal impact on household operations, though livestock feed costs increased significantly',
        damageDetails: {
          cropLossPercentage: 20,
          waterAccessImpacted: false,
          livestockLoss: 0
        },
        assessedBy: 'Coordinator - Thandi Khubone',
        status: 'Approved'
      },
      {
        householdId: 'HH-DF-004',
        headOfHousehold: { name: 'Siphiwe Myeni', age: 62, gender: 'Male' },
        householdSize: 6,
        childrenUnder5: 0,
        monthlyIncome: 4100,
        incomeCategory: 'Middle',
        disasterType: 'Drought',
        damageSeverityLevel: 2,
        damageDescription: 'Agricultural activities severely disrupted, pasture land degradation, water shortage affecting daily activities',
        damageDetails: {
          cropLossPercentage: 70,
          waterAccessImpacted: true,
          livestockLoss: 4
        },
        assessedBy: 'Coordinator - Thandi Khubone',
        status: 'Approved'
      }
    ];

    // Realistic household data for heavy rainfall in Mokhotlong
    const rainfallMokhotlongHouseholds = [
      {
        householdId: 'HH-RM-001',
        headOfHousehold: { name: 'Pulane Makoae', age: 44, gender: 'Female' },
        householdSize: 7,
        childrenUnder5: 2,
        monthlyIncome: 2300,
        incomeCategory: 'Low',
        disasterType: 'Heavy Rainfall',
        damageSeverityLevel: 4,
        damageDescription: 'Severe flooding destroyed main residential structure, 80% of roof damaged, belongings lost, livestock shelter completely destroyed',
        damageDetails: {
          roofDamage: 'Severe - 80% collapsed',
          roomsAffected: 3,
          livestockLoss: 2
        },
        assessedBy: 'Data Clerk - Thabiso Sekhonyana',
        status: 'Approved'
      },
      {
        householdId: 'HH-RM-002',
        headOfHousehold: { name: 'Motlatsi Lesotho', age: 39, gender: 'Male' },
        householdSize: 5,
        childrenUnder5: 1,
        monthlyIncome: 4700,
        incomeCategory: 'Middle',
        disasterType: 'Heavy Rainfall',
        damageSeverityLevel: 2,
        damageDescription: 'Moderate structural damage to roof and walls, water infiltration into 2 rooms, property damage estimated at M15,000',
        damageDetails: {
          roofDamage: 'Moderate - 30% damaged',
          roomsAffected: 2,
          livestockLoss: 0
        },
        assessedBy: 'Data Clerk - Thabiso Sekhonyana',
        status: 'Approved'
      },
      {
        householdId: 'HH-RM-003',
        headOfHousehold: { name: 'Lerato Hlongwane', age: 57, gender: 'Female' },
        householdSize: 4,
        childrenUnder5: 0,
        monthlyIncome: 3200,
        incomeCategory: 'Middle',
        disasterType: 'Heavy Rainfall',
        damageSeverityLevel: 3,
        damageDescription: 'Heavy flooding inundated agricultural plots, significant structural damage to roof, water damage to stored goods',
        damageDetails: {
          roofDamage: 'Moderate - 40% damaged',
          roomsAffected: 2,
          livestockLoss: 1
        },
        assessedBy: 'Coordinator - Thandi Khubone',
        status: 'Approved'
      },
      {
        householdId: 'HH-RM-004',
        headOfHousehold: { name: 'Thabang Majola', age: 50, gender: 'Male' },
        householdSize: 6,
        childrenUnder5: 3,
        monthlyIncome: 1900,
        incomeCategory: 'Low',
        disasterType: 'Heavy Rainfall',
        damageSeverityLevel: 3,
        damageDescription: 'Dwelling partially flooded, roof leakage affecting sleeping areas, crops and stored supplies destroyed',
        damageDetails: {
          roofDamage: 'Moderate - 50% damaged',
          roomsAffected: 2,
          livestockLoss: 3
        },
        assessedBy: 'Coordinator - Thandi Khubone',
        status: 'Approved'
      }
    ];

    // Map disaster types to household data
    const disasterHouseholdsMap = {
      'drought': {
        'Maseru': droughtMaseruHouseholds,
        'Mafeteng': droughtMafetengHouseholds
      },
      'heavy_rainfall': {
        'Mokhotlong': rainfallMokhotlongHouseholds
      }
    };

    let totalAdded = 0;

    for (const disaster of disasters) {
      const households = disasterHouseholdsMap[disaster.type]?.[disaster.district] || [];
      
      if (households.length > 0) {
        console.log(`📝 Adding households for: ${disaster.disasterCode} (${disaster.type} - ${disaster.district})`);

        // Add disasterId to each household
        const householdsWithDisasterId = households.map(h => ({
          ...h,
          disasterId: disaster._id,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const result = await db.collection('household_assessments').insertMany(householdsWithDisasterId);
        console.log(`   ✅ Added ${result.insertedIds.length} households\n`);
        totalAdded += result.insertedIds.length;
      }
    }

    console.log(`✅ Population complete! Total: ${totalAdded} realistic households\n`);

    // Verify breakdown
    console.log('📊 Final Data by Disaster:');
    for (const disaster of disasters) {
      const count = await db.collection('household_assessments').countDocuments({
        disasterId: disaster._id
      });
      console.log(`   ${disaster.disasterCode}: ${count} households`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateRealisticData();
