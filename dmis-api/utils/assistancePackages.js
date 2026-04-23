/**
 * Assistance Packages Configuration
 * ONLY 8 packages defined for Step 1-7 Smart Aid Allocation System
 * These are the ONLY packages that should be assigned to households
 */

const ASSISTANCE_PACKAGES = {
  EMERGENCY_TENT: {
    packageId: 'PKG_TENT_001',
    name: 'Emergency Tent',
    description: 'Tent shelter unit (family size, 8x4m)',
    unitCost: 6500,
    category: 'Shelter',
  },
  RECONSTRUCTION_GRANT: {
    packageId: 'PKG_RECON_001',
    name: 'Reconstruction Grant',
    description: 'Comprehensive grant for house reconstruction',
    unitCost: 130000,
    category: 'Reconstruction',
  },
  REROOFING_KIT: {
    packageId: 'PKG_REROOF_001',
    name: 'Re-roofing Kit',
    description: 'Roofing materials for house repair (corrugated iron sheets, nails, etc.)',
    unitCost: 35000,
    category: 'Reconstruction',
  },
  TARPAULIN_KIT: {
    packageId: 'PKG_TARP_001',
    name: 'Tarpaulin Kit',
    description: 'Weatherproof tarpaulin for emergency shelter (50sqm)',
    unitCost: 2000,
    category: 'Shelter',
  },
  FOOD_PARCEL: {
    packageId: 'PKG_FOOD_001',
    name: 'Food Parcel',
    description: 'Emergency food supplies for household (1-month supply)',
    unitCost: 1500,
    category: 'Food & Water',
  },
  WATER_TANK: {
    packageId: 'PKG_WTANK_001',
    name: 'Water Tank',
    description: 'Large water storage tank for household or community',
    unitCost: 6000,
    category: 'Food & Water',
  },
  BLANKET_PACK: {
    packageId: 'PKG_BLANK_001',
    name: 'Blanket & Clothing',
    description: 'Winter clothing and blankets (2 sets per pack)',
    unitCost: 1500,
    category: 'Shelter',
  },
  MEDICAL_KIT: {
    packageId: 'PKG_MED_001',
    name: 'Medical Aid',
    description: 'Emergency medical supplies and first aid equipment',
    unitCost: 1000,
    category: 'Health',
  },
};

export { ASSISTANCE_PACKAGES };
export default { ASSISTANCE_PACKAGES };
