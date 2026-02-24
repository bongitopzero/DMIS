/**
 * Seed Assistance Packages
 * Initializes all predefined assistance packages in the database
 * Run with: node scripts/seedAssistancePackages.js
 */

const mongoose = require('mongoose');
const AssistancePackage = require('../models/AssistancePackage');
const { ASSISTANCE_PACKAGES } = require('../utils/assistancePackages');

async function seedPackages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/dmis');

    console.log('Connected to MongoDB...');

    // Check if packages already exist
    const existingCount = await AssistancePackage.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing packages. Skipping seed.`);
      console.log(
        'To reseed, delete existing packages or run: db.assistance_packages.deleteMany({})\n'
      );
      process.exit(0);
    }

    // Create packages array
    const packagesToSeed = [];

    for (const [key, config] of Object.entries(ASSISTANCE_PACKAGES)) {
      packagesToSeed.push({
        packageId: config.packageId,
        name: config.name,
        description: config.description,
        unitCost: config.unitCost,
        category: config.category,
        applicableDisasters: config.applicableDisasters,
        allocationRules: config.allocationRules,
        quantityUnit: config.quantityUnit,
        isActive: true,
        notes: `${key} - Default assistance package`,
      });
    }

    // Insert packages
    const created = await AssistancePackage.insertMany(packagesToSeed);

    console.log(`\n✅ Successfully seeded ${created.length} assistance packages:\n`);

    created.forEach((pkg) => {
      console.log(
        `   • ${pkg.packageId}: ${pkg.name} - M${pkg.unitCost.toLocaleString()}`
      );
    });

    console.log(
      `\n💰 Total Package Cost (if 1 of each): M${packagesToSeed
        .reduce((sum, p) => sum + p.unitCost, 0)
        .toLocaleString()}\n`
    );

    // Disconnect
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    process.exit(1);
  }
}

seedPackages();
