/**
 * Allocation Scoring Engine
 * Implements the scoring framework for fair and transparent aid allocation
 */

import HouseholdAssessment from '../models/HouseholdAssessment.js';
import { getScoringTier } from './assistancePackages.js';

/**
 * Calculate damage level score (1-4)
 * Disaster-specific severity assessment
 */
function calculateDamageLevel(assessment) {
  const { disasterType, damageDetails, damageDescription } = assessment;

  // Heavy Rainfall Damage Assessment
  if (disasterType === 'Heavy Rainfall') {
    if (damageDetails.roomsAffected === 0 && damageDetails.cropLossPercentage < 20) {
      return 1; // Minor damage: roof leaks, <20% crop loss
    } else if (
      damageDetails.roomsAffected <= 2 &&
      damageDetails.cropLossPercentage < 50
    ) {
      return 2; // Moderate damage: 1-2 rooms affected, 20-50% crop loss
    } else if (
      damageDetails.roomsAffected >= 2 &&
      damageDetails.cropLossPercentage < 80
    ) {
      return 3; // Severe damage: house uninhabitable, 50-80% crop loss
    } else {
      return 4; // Destroyed: house collapsed, >80% crop loss
    }
  }

  // Strong Winds Damage Assessment
  if (disasterType === 'Strong Winds') {
    const roof = (damageDetails.roofDamage || '').toLowerCase();
    if (roof.includes('minor') || roof.includes('leak')) {
      return 1; // Minor wind damage
    } else if (roof.includes('partly') || roof.includes('partial')) {
      return 2; // Roof partly blown
    } else if (roof.includes('major') || roof.includes('most')) {
      return 3; // >50% roof destroyed
    } else if (roof.includes('total') || roof.includes('complete')) {
      return 4; // Total roof destruction
    }
    return 1; // Default to minor if unclear
  }

  // Drought Damage Assessment
  if (disasterType === 'Drought') {
    if (damageDetails.cropLossPercentage < 20 && !damageDetails.waterAccessImpacted) {
      return 1; // Minor: <20% crop loss, water access maintained
    } else if (
      damageDetails.cropLossPercentage < 50 ||
      damageDetails.waterAccessImpacted
    ) {
      return 2; // Moderate: 20-50% crop loss, some water impacts
    } else if (damageDetails.cropLossPercentage < 80) {
      return 3; // Severe: 50-80% crop loss, significant water impacts
    } else {
      return 4; // Destroyed: >80% crop loss, complete livelihood loss
    }
  }

  return 1; // Default
}

/**
 * Calculate vulnerability points
 * Returns object with breakdown of each vulnerability component
 */
function calculateVulnerabilityPoints(assessment) {
  const vulnerabilityPoints = {
    elderlyHeadScore: 0,
    childrenUnder5Score: 0,
    femaleHeadedScore: 0,
    largeFamilyScore: 0,
    incomeScore: 0,
  };

  // Elderly head (>65) = +2
  if (assessment.headOfHousehold.age > 65) {
    vulnerabilityPoints.elderlyHeadScore = 2;
  }

  // Children under 5 = +2
  if (assessment.childrenUnder5 > 0) {
    vulnerabilityPoints.childrenUnder5Score = 2;
  }

  // Female-headed household = +1
  if (assessment.headOfHousehold.gender === 'Female') {
    vulnerabilityPoints.femaleHeadedScore = 1;
  }

  // Household size >6 = +2
  if (assessment.householdSize > 6) {
    vulnerabilityPoints.largeFamilyScore = 2;
  }

  // Income thresholds
  if (assessment.incomeCategory === 'Low') {
    // Low income (≤ M3,000/month) = +3
    vulnerabilityPoints.incomeScore = 3;
  } else if (assessment.incomeCategory === 'Middle') {
    // Middle income (M3,001–M10,000) = +1
    vulnerabilityPoints.incomeScore = 1;
  }
  // High income (≥ M10,001) = +0

  return vulnerabilityPoints;
}

/**
 * Calculate composite score
 * Composite Score = Damage Level + Vulnerability Points
 */
function calculateCompositeScore(assessment) {
  const damageLevel = calculateDamageLevel(assessment);
  const vulnerabilityPoints = calculateVulnerabilityPoints(assessment);

  const totalVulnerability = Object.values(vulnerabilityPoints).reduce(
    (sum, val) => sum + val,
    0
  );
  const compositeScore = damageLevel + totalVulnerability;

  return {
    compositeScore,
    damageLevel,
    vulnerabilityPoints,
    totalVulnerability,
    scoreBreakdown: {
      damageComponent: damageLevel,
      vulnerabilityComponent: totalVulnerability,
      totalScore: compositeScore,
    },
  };
}

/**
 * Get aid tier string based on composite score
 */
function getAidTier(compositeScore) {
  return getScoringTier(compositeScore);
}

/**
 * Validate emergency override
 * Requires written justification for deviations from scoring rules
 */
function validateOverride(proposedAction, justification) {
  return {
    isValid: !!justification && justification.length >= 50,
    requiresApproval: true,
    auditRequired: true,
    message: justification
      ? 'Override with justification noted for audit'
      : 'Override requires written justification (minimum 50 characters)',
  };
}

/**
 * Generate scoring summary
 */
function generateScoringSummary(assessment) {
  const scoring = calculateCompositeScore(assessment);
  const tier = getAidTier(scoring.compositeScore);

  return {
    householdId: assessment.householdId,
    headOfHousehold: assessment.headOfHousehold.name,
    disasterType: assessment.disasterType,
    assessmentDate: assessment.assessmentDate,
    damageLevel: scoring.damageLevel,
    vulnerabilityBreakdown: scoring.vulnerabilityPoints,
    totalVulnerabilityPoints: scoring.totalVulnerability,
    compositeScore: scoring.compositeScore,
    aidTier: tier,
    scoreBreakdown: scoring.scoreBreakdown,
  };
}

export {
  calculateDamageLevel,
  calculateVulnerabilityPoints,
  calculateCompositeScore,
  getAidTier,
  validateOverride,
  generateScoringSummary,
};

export default {
  calculateDamageLevel,
  calculateVulnerabilityPoints,
  calculateCompositeScore,
  getAidTier,
  validateOverride,
  generateScoringSummary,
};
