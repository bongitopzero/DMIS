/**
 * Allocation Controller
 * Handles household assessment, aid allocation, and plan generation
 */

import mongoose from 'mongoose';
import HouseholdAssessment from '../models/HouseholdAssessment.js';
import AidAllocationRequest from '../models/AidAllocationRequest.js';
import AllocationPlan from '../models/AllocationPlan.js';
import AssistancePackage from '../models/AssistancePackage.js';
import AuditLog from '../models/AuditLog.js';
import {
  calculateCompositeScore,
  getAidTier,
  validateOverride,
  generateScoringSummary,
} from '../utils/allocationScoringEngine.js';
import {
  getPackagesByTier,
  getAllocationRulesForTier,
  ASSISTANCE_PACKAGES,
} from '../utils/assistancePackages.js';

/**
 * @POST /api/allocation/assessments
 * Create household assessment
 */
const createHouseholdAssessment = async (req, res) => {
  try {
    const {
      disasterId,
      householdId,
      headOfHousehold,
      householdSize,
      childrenUnder5,
      monthlyIncome,
      disasterType,
      damageDescription,
      damageSeverityLevel,
      damageDetails,
      recommendedAssistance,
      assessedBy,
      location,
    } = req.body;

    // Validate required fields
    if (
      !disasterId ||
      !householdId ||
      !headOfHousehold ||
      !disasterType ||
      !damageDescription
    ) {
      return res.status(400).json({
        message: 'Missing required fields',
      });
    }

    // Determine income category
    let incomeCategory = 'High';
    if (monthlyIncome <= 3000) incomeCategory = 'Low';
    else if (monthlyIncome <= 10000) incomeCategory = 'Middle';

    // Create assessment
    const assessment = new HouseholdAssessment({
      disasterId,
      householdId,
      headOfHousehold,
      householdSize,
      childrenUnder5: childrenUnder5 || 0,
      monthlyIncome,
      incomeCategory,
      disasterType,
      damageDescription,
      damageSeverityLevel,
      damageDetails: damageDetails || {},
      recommendedAssistance,
      assessmentDate: new Date(),
      assessedBy,
      location,
      createdBy: req.user?.id,
    });

    await assessment.save();

    // Log audit trail
    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'HouseholdAssessment',
      entityId: assessment._id,
      disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Data Clerk',
      newValues: assessment.toObject(),
      reason: 'Household assessment created',
    });

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment,
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({
      message: 'Error creating assessment',
      error: error.message,
    });
  }
};

/**
 * @GET /api/allocation/assessments/:disasterId
 * Get all assessments for a disaster
 */
const getAssessmentsByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status } = req.query;

    // Convert disasterId string to MongoDB ObjectId for proper matching
    const query = { disasterId: new mongoose.Types.ObjectId(disasterId) };
    if (status) query.status = status;

    const assessments = await HouseholdAssessment.find(query)
      .sort({ assessmentDate: -1 })
      .lean();

    res.json({
      count: assessments.length,
      assessments,
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      message: 'Error fetching assessments',
      error: error.message,
    });
  }
};

/**
 * @POST /api/allocation/calculate-score
 * Calculate aid allocation score for an assessment
 */
const calculateAllocationScore = async (req, res) => {
  try {
    const { assessmentId } = req.body;

    // Fetch assessment
    const assessment = await HouseholdAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Calculate composite score
    const scoring = calculateCompositeScore(assessment);
    const aidTier = getAidTier(scoring.compositeScore);

    res.json({
      assessmentId,
      householdId: assessment.householdId,
      damageLevel: scoring.damageLevel,
      vulnerabilityPoints: scoring.vulnerabilityPoints,
      compositeScore: scoring.compositeScore,
      aidTier,
      scoreBreakdown: scoring.scoreBreakdown,
      summary: generateScoringSummary(assessment),
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    res.status(500).json({
      message: 'Error calculating score',
      error: error.message,
    });
  }
};

/**
 * @POST /api/allocation/create-request
 * Create aid allocation request with automatic package assignment
 */
const createAllocationRequest = async (req, res) => {
  try {
    const {
      assessmentId,
      disasterId,
      override,
      overrideReason,
      overrideJustification,
    } = req.body;

    // Fetch assessment
    const assessment = await HouseholdAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Calculate score
    const scoring = calculateCompositeScore(assessment);
    const aidTier = getAidTier(scoring.compositeScore);

    // Get allocation rules and recommended packages
    const rules = getAllocationRulesForTier(aidTier);
    const applicablePackages = getPackagesByTier(
      scoring.compositeScore,
      assessment.disasterType
    );

    // Assign packages based on tier
    let allocatedPackages = [];
    let totalEstimatedCost = 0;

    // For recommended packages, include relevant ones
    for (const pkgKey of rules.recommendedPackages) {
      const pkgConfig = ASSISTANCE_PACKAGES[pkgKey];
      if (pkgConfig) {
        const quantity =
          scoring.compositeScore >= 7
            ? 2
            : scoring.compositeScore >= 4
              ? 1
              : 1;

        const allocation = {
          packageId: pkgConfig.packageId,
          packageName: pkgConfig.name,
          quantity,
          unitCost: pkgConfig.unitCost,
          totalCost: quantity * pkgConfig.unitCost,
          category: pkgConfig.category,
        };

        allocatedPackages.push(allocation);
        totalEstimatedCost += allocation.totalCost;
      }
    }

    // Generate request ID
    const requestId =
      'AL-' +
      Date.now() +
      '-' +
      Math.random().toString(36).substr(2, 9).toUpperCase();

    // Create allocation request
    const allocationRequest = new AidAllocationRequest({
      requestId,
      householdAssessmentId: assessmentId,
      disasterId,
      householdId: assessment.householdId,
      damageLevel: scoring.damageLevel,
      vulnerabilityPoints: scoring.vulnerabilityPoints,
      compositeScore: scoring.compositeScore,
      scoreBreakdown: scoring.scoreBreakdown,
      aidTier,
      allocatedPackages,
      totalEstimatedCost,
      isOverride: !!override,
      overrideReason,
      overrideJustification,
      status: override ? 'Pending Approval' : 'Proposed',
      createdBy: req.user?.id,
    });

    await allocationRequest.save();

    // Update assessment status
    await HouseholdAssessment.findByIdAndUpdate(assessmentId, {
      status: 'Allocated',
    });

    // Log audit trail
    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'AidAllocationRequest',
      entityId: allocationRequest._id,
      disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Finance Officer',
      newValues: allocationRequest.toObject(),
      reason: override
        ? `Aid allocation created with override: ${overrideReason}`
        : 'Aid allocation created based on scoring rules',
    });

    res.status(201).json({
      message: 'Allocation request created successfully',
      requestId,
      allocationRequest,
    });
  } catch (error) {
    console.error('Error creating allocation request:', error);
    res.status(500).json({
      message: 'Error creating allocation request',
      error: error.message,
    });
  }
};

/**
 * @PUT /api/allocation/requests/:requestId/approve
 * Approve allocation request
 */
const approveAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { justification } = req.body;

    const request = await AidAllocationRequest.findByIdAndUpdate(
      requestId,
      {
        status: 'Approved',
        'approvalStatus.approvedBy': req.user?.id,
        'approvalStatus.approvalDate': new Date(),
        'approvalStatus.justification': justification,
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: 'Allocation request not found' });
    }

    // Log audit trail
    await createAuditLog({
      actionType: 'APPROVE',
      entityType: 'AidAllocationRequest',
      entityId: request._id,
      disasterId: request.disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Finance Officer',
      newValues: request.toObject(),
      reason: `Allocation approved. Total cost: M${request.totalEstimatedCost}`,
    });

    res.json({
      message: 'Allocation request approved',
      request,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      message: 'Error approving request',
      error: error.message,
    });
  }
};

/**
 * @POST /api/allocation/plans
 * Generate comprehensive allocation plan for a disaster
 */
const generateAllocationPlan = async (req, res) => {
  try {
    const { disasterId, planName } = req.body;

    // Get all approved allocation requests for disaster
    const allocations = await AidAllocationRequest.find({
      disasterId,
      status: 'Approved',
    }).populated('householdAssessmentId');

    if (allocations.length === 0) {
      return res.status(400).json({
        message: 'No approved allocations found for this disaster',
      });
    }

    // Calculate totals and breakdowns
    let totalBudgetRequired = 0;
    let procurementMap = {};
    let vulnerabilityDist = {
      'tier0_3': { count: 0, percentage: 0 },
      'tier4_6': { count: 0, percentage: 0 },
      'tier7_9': { count: 0, percentage: 0 },
      'tier10Plus': { count: 0, percentage: 0 },
    };
    let disasterBreakdown = {
      heavyRainfall: { count: 0, totalCost: 0 },
      strongWinds: { count: 0, totalCost: 0 },
      drought: { count: 0, totalCost: 0 },
    };

    // Process allocations
    const allocationsArray = allocations.map((alloc) => {
      const household = alloc.householdAssessmentId;
      const subtotal = alloc.totalEstimatedCost;
      totalBudgetRequired += subtotal;

      // Count by vulnerability tier
      const tier = parseInt(alloc.aidTier.match(/\d+/)?.[0] || '0');
      if (tier <= 3) vulnerabilityDist.tier0_3.count++;
      else if (tier <= 6) vulnerabilityDist.tier4_6.count++;
      else if (tier <= 9) vulnerabilityDist.tier7_9.count++;
      else vulnerabilityDist.tier10Plus.count++;

      // Count by disaster type
      const disasterType = household.disasterType.replace(/\s+/g, '');
      if (disasterType === 'HeavyRainfall') {
        disasterBreakdown.heavyRainfall.count++;
        disasterBreakdown.heavyRainfall.totalCost += subtotal;
      } else if (disasterType === 'StrongWinds') {
        disasterBreakdown.strongWinds.count++;
        disasterBreakdown.strongWinds.totalCost += subtotal;
      } else if (disasterType === 'Drought') {
        disasterBreakdown.drought.count++;
        disasterBreakdown.drought.totalCost += subtotal;
      }

      // Aggreg packages for procurement
      for (const pkg of alloc.allocatedPackages) {
        if (!procurementMap[pkg.packageId]) {
          procurementMap[pkg.packageId] = {
            packageId: pkg.packageId,
            packageName: pkg.packageName,
            category: pkg.category,
            totalQuantity: 0,
            unitCost: pkg.unitCost,
            totalCost: 0,
          };
        }
        procurementMap[pkg.packageId].totalQuantity += pkg.quantity;
        procurementMap[pkg.packageId].totalCost += pkg.totalCost;
      }

      return {
        householdId: household.householdId,
        householdName: household.headOfHousehold.name,
        aidAllocationRequestId: alloc._id,
        compositeScore: alloc.compositeScore,
        aidTier: alloc.aidTier,
        packages: alloc.allocatedPackages,
        subtotal,
      };
    });

    // Calculate percentages
    const totalCount = allocations.length;
    Object.keys(vulnerabilityDist).forEach((key) => {
      vulnerabilityDist[key].percentage = (
        (vulnerabilityDist[key].count / totalCount) *
        100
      ).toFixed(2);
    });

    // Generate plan ID
    const planId = 'PL-' + disasterId + '-' + Date.now();

    // Create allocation plan
    const plan = new AllocationPlan({
      planId,
      disasterId,
      planName: planName || `Allocation Plan - ${new Date().toLocaleDateString()}`,
      planDate: new Date(),
      totalHouseholdsAssessed: allocations.length,
      totalHouseholdsCovered: allocations.length,
      totalBudgetRequired,
      allocations: allocationsArray,
      procurementSummary: Object.values(procurementMap),
      vulnerabilityDistribution: vulnerabilityDist,
      disasterTypeBreakdown: disasterBreakdown,
      status: 'Draft',
      createdBy: req.user?.id,
    });

    await plan.save();

    // Log audit trail
    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'AllocationPlan',
      entityId: plan._id,
      disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Finance Officer',
      newValues: {
        planId: plan.planId,
        totalHouseholds: allocations.length,
        totalBudget: totalBudgetRequired,
      },
      reason: `Allocation plan generated for ${allocations.length} households`,
    });

    res.status(201).json({
      message: 'Allocation plan generated successfully',
      plan,
    });
  } catch (error) {
    console.error('Error generating allocation plan:', error);
    res.status(500).json({
      message: 'Error generating allocation plan',
      error: error.message,
    });
  }
};

/**
 * @GET /api/allocation/plans/:disasterId
 * Get allocation plans for a disaster
 */
const getAllocationPlansByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;

    const plans = await AllocationPlan.find({ disasterId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      message: 'Error fetching plans',
      error: error.message,
    });
  }
};

/**
 * @GET /api/allocation/dashboard-stats/:disasterId
 * Get financial dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const { disasterId } = req.params;

    // Pending assessments
    const pendingAssessments = await HouseholdAssessment.countDocuments({
      disasterId,
      status: 'Pending Review',
    });

    // Pending allocations
    const pendingAllocations = await AidAllocationRequest.countDocuments({
      disasterId,
      status: 'Pending Approval',
    });

    // Approved allocations
    const approvedAllocations = await AidAllocationRequest.find({
      disasterId,
      status: 'Approved',
    }).lean();

    // Disbursed allocations
    const disbursedAllocations = await AidAllocationRequest.countDocuments({
      disasterId,
      status: 'Disbursed',
    });

    // Calculate totals
    const approvedTotal = approvedAllocations.reduce(
      (sum, alloc) => sum + alloc.totalEstimatedCost,
      0
    );

    const disbursedTotal = await AidAllocationRequest.aggregate([
      { $match: { disasterId: new require('mongoose').Types.ObjectId(disasterId), status: 'Disbursed' } },
      { $group: { _id: null, total: { $sum: '$totalEstimatedCost' } } },
    ]);

    res.json({
      pendingAssessments,
      pendingAllocations,
      approvedAllocations: approvedAllocations.length,
      approvedTotal,
      disbursedAllocations,
      disbursedTotal: disbursedTotal[0]?.total || 0,
      estimatedNeed: approvedTotal, // Total approved = estimated need
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      message: 'Error fetching dashboard stats',
      error: error.message,
    });
  }
};

/**
 * Helper: Create audit log
 */
async function createAuditLog(logData) {
  try {
    await AuditLog.create(logData);
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

export default {
  createHouseholdAssessment,
  getAssessmentsByDisaster,
  calculateAllocationScore,
  createAllocationRequest,
  approveAllocationRequest,
  generateAllocationPlan,
  getAllocationPlansByDisaster,
  getDashboardStats,
};
