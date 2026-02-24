/**
 * Assistance Packages Configuration
 * Predefined packages with fixed costs for aid allocation
 */

const ASSISTANCE_PACKAGES = {
  FOOD_PARCEL: {
    packageId: 'PKG_FOOD_001',
    name: 'Food Parcel',
    description: 'Emergency food supplies for household (1-month supply)',
    unitCost: 800,
    category: 'Food & Water',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'Drought', 'All'],
    allocationRules: { scoreLevelMin: 0, scoreLevelMax: 10 },
    quantityUnit: 'Pack',
  },
  TARPAULIN_KIT: {
    packageId: 'PKG_TARP_001',
    name: 'Tarpaulin Kit',
    description: 'Weatherproof tarpaulin for emergency shelter (50sqm)',
    unitCost: 2000,
    category: 'Shelter',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 1, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  EMERGENCY_TENT: {
    packageId: 'PKG_TENT_001',
    name: 'Emergency Tent',
    description: 'Tent shelter unit (family size, 8x4m)',
    unitCost: 6500,
    category: 'Shelter',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Unit',
  },
  REROOFING_KIT: {
    packageId: 'PKG_REROOF_001',
    name: 'Re-roofing Kit',
    description: 'Roofing materials for house repair (corrugated iron sheets, nails, etc.)',
    unitCost: 18000,
    category: 'Reconstruction',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  RECONSTRUCTION_GRANT: {
    packageId: 'PKG_RECON_001',
    name: 'Reconstruction Grant',
    description: 'Comprehensive grant for house reconstruction',
    unitCost: 75000,
    category: 'Reconstruction',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 3, scoreLevelMax: 10 },
    quantityUnit: 'Grant',
  },
  LIVELIHOOD_KIT: {
    packageId: 'PKG_LIVELI_001',
    name: 'Livelihood Recovery Kit',
    description: 'Tools and materials for livelihood restoration (seeds, tools, etc.)',
    unitCost: 10000,
    category: 'Livelihood',
    applicableDisasters: ['Drought', 'Heavy Rainfall', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  WATER_PURIF_KIT: {
    packageId: 'PKG_WAT_001',
    name: 'Water Purification Kit',
    description: 'Water treatment equipment (filters, chemicals, buckets)',
    unitCost: 1200,
    category: 'Food & Water',
    applicableDisasters: ['Heavy Rainfall', 'Drought', 'All'],
    allocationRules: { scoreLevelMin: 1, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  BLANKET_PACK: {
    packageId: 'PKG_BLANK_001',
    name: 'Blanket & Clothing Pack',
    description: 'Winter clothing and blankets (2 sets per pack)',
    unitCost: 1500,
    category: 'Shelter',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'Drought', 'All'],
    allocationRules: { scoreLevelMin: 0, scoreLevelMax: 10 },
    quantityUnit: 'Pack',
  },
  MEDICAL_KIT: {
    packageId: 'PKG_MED_001',
    name: 'Medical Aid Kit',
    description: 'Emergency medical supplies and first aid equipment',
    unitCost: 1000,
    category: 'Health',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'Drought', 'All'],
    allocationRules: { scoreLevelMin: 0, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  FURNITURE_PACK: {
    packageId: 'PKG_FURN_001',
    name: 'Furniture Replacement Pack',
    description: 'Replacement furniture (beds, tables, chairs)',
    unitCost: 10000,
    category: 'Reconstruction',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Pack',
  },
  SCHOOL_REPAIR_KIT: {
    packageId: 'PKG_SCHOOL_001',
    name: 'School Repair Kit',
    description: 'Materials for school infrastructure repair',
    unitCost: 20000,
    category: 'Education',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Kit',
  },
  COMMUNITY_SHELTER: {
    packageId: 'PKG_COMM_001',
    name: 'Community Shelter Support',
    description: 'Support for community gathering place construction',
    unitCost: 50000,
    category: 'Community',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Grant',
  },
  CASH_TRANSFER: {
    packageId: 'PKG_CASH_001',
    name: 'Cash Transfer (3 months)',
    description: 'Direct cash transfer for livelihood support (3-month stipend)',
    unitCost: 3000,
    category: 'Cash Transfer',
    applicableDisasters: ['Heavy Rainfall', 'Strong Winds', 'Drought', 'All'],
    allocationRules: { scoreLevelMin: 1, scoreLevelMax: 10 },
    quantityUnit: 'Transfer',
  },
  WATER_TANK: {
    packageId: 'PKG_WTANK_001',
    name: 'Water Tank (5,000L)',
    description: 'Large water storage tank for household or community',
    unitCost: 12000,
    category: 'Food & Water',
    applicableDisasters: ['Drought', 'Heavy Rainfall', 'All'],
    allocationRules: { scoreLevelMin: 1, scoreLevelMax: 10 },
    quantityUnit: 'Unit',
  },
  BOREHOLE_GRANT: {
    packageId: 'PKG_BORE_001',
    name: 'Borehole Rehabilitation Grant',
    description: 'Grant for borehole drilling and rehabilitation',
    unitCost: 50000,
    category: 'Food & Water',
    applicableDisasters: ['Drought', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Grant',
  },
  LIVESTOCK_FEED: {
    packageId: 'PKG_FEED_001',
    name: 'Livestock Feed Pack',
    description: 'Animal feed and supplements (3-month supply)',
    unitCost: 5000,
    category: 'Livelihood',
    applicableDisasters: ['Drought', 'Heavy Rainfall', 'All'],
    allocationRules: { scoreLevelMin: 1, scoreLevelMax: 10 },
    quantityUnit: 'Pack',
  },
  LIVESTOCK_RESTOCKING: {
    packageId: 'PKG_LIVES_001',
    name: 'Small Livestock Restocking Pack',
    description: 'Young animals for livelihood restoration (goats/chickens)',
    unitCost: 15000,
    category: 'Livelihood',
    applicableDisasters: ['Drought', 'Heavy Rainfall', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Pack',
  },
  IRRIGATION_SUPPORT: {
    packageId: 'PKG_IRRIG_001',
    name: 'Community Irrigation Support',
    description: 'Grant for irrigation infrastructure development',
    unitCost: 100000,
    category: 'Livelihood',
    applicableDisasters: ['Drought', 'All'],
    allocationRules: { scoreLevelMin: 2, scoreLevelMax: 10 },
    quantityUnit: 'Grant',
  },
};

/**
 * Get packages by aid tier/score range
 */
function getPackagesByTier(compositeScore, disasterType) {
  const tier = getScoringTier(compositeScore);
  const packages = [];

  // Determine which packages apply to this tier
  const packageEntries = Object.values(ASSISTANCE_PACKAGES).filter((pkg) => {
    // Check if applicable to disaster type
    const applicable =
      pkg.applicableDisasters.includes(disasterType) ||
      pkg.applicableDisasters.includes('All');

    // Check if score is in range
    const inRange =
      compositeScore >= pkg.allocationRules.scoreLevelMin &&
      compositeScore <= pkg.allocationRules.scoreLevelMax;

    return applicable && inRange;
  });

  return packageEntries;
}

/**
 * Get scoring tier string from composite score
 */
function getScoringTier(compositeScore) {
  if (compositeScore <= 3) return 'Basic Support (0-3)';
  if (compositeScore <= 6) return 'Shelter + Food + Cash (4-6)';
  if (compositeScore <= 9) return 'Tent + Reconstruction + Food (7-9)';
  return 'Priority Reconstruction + Livelihood (10+)';
}

/**
 * Get allocation rules for tier
 */
function getAllocationRulesForTier(tier) {
  const rules = {
    'Basic Support (0-3)': {
      recommendedPackages: [
        'FOOD_PARCEL',
        'TARPAULIN_KIT',
        'WATER_PURIF_KIT',
        'BLANKET_PACK',
        'MEDICAL_KIT',
      ],
      description: 'Basic emergency support - food, temporary shelter, water, health',
    },
    'Shelter + Food + Cash (4-6)': {
      recommendedPackages: [
        'EMERGENCY_TENT',
        'FOOD_PARCEL',
        'CASH_TRANSFER',
        'WATER_PURIF_KIT',
        'MEDICAL_KIT',
        'BLANKET_PACK',
      ],
      description: 'Enhanced support - shelter, food, cash transfers, water',
    },
    'Tent + Reconstruction + Food (7-9)': {
      recommendedPackages: [
        'EMERGENCY_TENT',
        'REROOFING_KIT',
        'FOOD_PARCEL',
        'CASH_TRANSFER',
        'LIVELIHOOD_KIT',
        'WATER_PURIF_KIT',
        'FURNITURE_PACK',
      ],
      description:
        'Comprehensive support - shelter, reconstruction materials, livelihood, food',
    },
    'Priority Reconstruction + Livelihood (10+)': {
      recommendedPackages: [
        'RECONSTRUCTION_GRANT',
        'EMERGENCY_TENT',
        'LIVELIHOOD_KIT',
        'CASH_TRANSFER',
        'LIVESTOCK_RESTOCKING',
        'WATER_TANK',
        'FURNITURE_PACK',
      ],
      description:
        'Priority support - full reconstruction, livelihood recovery, water access',
    },
  };

  return rules[tier] || rules['Basic Support (0-3)'];
}

export { getScoringTier, getPackagesByTier, getAllocationRulesForTier, ASSISTANCE_PACKAGES };
export default {
  ASSISTANCE_PACKAGES,
  getPackagesByTier,
  getScoringTier,
  getAllocationRulesForTier,
};
