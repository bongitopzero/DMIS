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
import Disaster from '../models/Disaster.js';
import {
  calculateCompositeScore,
  validateOverride,
  generateScoringSummary,
} from '../utils/allocationScoringEngine.js'
import { ASSISTANCE_PACKAGES } from '../utils/assistancePackages.js';
import { checkBudgetAvailability, deductFromBudget, deductFromReserve } from '../utils/budgetDeductionUtils.js';

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

    console.log('📝 Creating household assessment with data:', {
      disasterId,
      householdId,
      headOfHousehold,
      householdSize,
      monthlyIncome,
      disasterType,
    });

    // Validate required fields
    if (
      !disasterId ||
      !householdId ||
      !headOfHousehold ||
      !disasterType ||
      !location ||
      !location.village ||
      !location.district
    ) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields: {
          disasterId: !disasterId,
          householdId: !householdId,
          headOfHousehold: !headOfHousehold,
          disasterType: !disasterType,
          damageDescription: !damageDescription,
          location: !location,
          'location.village': !location?.village,
          'location.district': !location?.district,
        },
      });
    }

    // Enforce disaster household limit if available
    try {
      const Disaster = (await import('../models/Disaster.js')).default;
      const disaster = await Disaster.findById(disasterId).lean();
      if (disaster) {
        const maxFromNumberField = disaster.numberOfHouseholdsAffected || disaster.totalAffectedHouseholds || 0;
        let maxHouseholds = parseInt(maxFromNumberField) || 0;
        if (!maxHouseholds && disaster.affectedPopulation) {
          const m = (disaster.affectedPopulation || '').match(/(\d+)/);
          if (m) maxHouseholds = parseInt(m[1]);
        }

        if (maxHouseholds > 0) {
          const currentCount = await HouseholdAssessment.countDocuments({ disasterId });
          if (currentCount >= maxHouseholds) {
            return res.status(400).json({ message: 'All households for this disaster have already been recorded' });
          }
        }
      }
    } catch (err) {
      console.warn('Could not enforce household limit:', err.message || err);
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

    console.log(`[Allocation] Created assessment ${assessment._id} with status: "${assessment.status}"`);

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
    console.error('❌ Error creating assessment:', error.message);
    console.error('❌ Full error:', error);
    console.error('❌ Request body:', req.body);

    let validationErrors = {};
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
    }

    res.status(500).json({
      message: 'Error creating assessment',
      error: error.message,
      validationErrors: validationErrors,
      details: error.errors ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join('; ') : 'No validation details available'
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

    const objectId = new mongoose.Types.ObjectId(disasterId);
    const query = { disasterId: objectId };
    if (status) query.status = status;

    const assessments = await HouseholdAssessment.find(query)
      .sort({ assessmentDate: -1 })
      .lean();

    const disaster = await Disaster.findById(disasterId).lean();
    const disasterHouseholdDetails = disaster?.householdDamageDetails || [];

    const normalizedDisasterDetails = disasterHouseholdDetails.map((detail) => ({
      _id: detail._id || new mongoose.Types.ObjectId(),
      disasterId: objectId,
      householdHeadName: detail.householdHeadName || detail.headOfHousehold?.name || 'Unknown',
      gender: detail.gender || detail.headOfHousehold?.gender || '',
      age: detail.age || detail.headOfHousehold?.age || null,
      householdSize: detail.householdSize || 1,
      monthlyIncome: detail.monthlyIncome || 0,
      district: detail.district || disaster?.district || '',
      damageDescription: detail.damageDescription || '',
      damageSeverityLevel: detail.damageSeverityLevel || 1,
      damageLevel: detail.damageLevel || 1,
      headOfHousehold: detail.headOfHousehold || {
        name: detail.householdHeadName || 'Unknown',
        gender: detail.gender || '',
        age: detail.age || null,
      },
      householdId: detail.householdId || `HH-${detail._id}`,
      assessmentDate: detail.createdAt || detail.assessmentDate || new Date(),
      source: 'disasterDetails',
    }));

    const mergedArray = [];
    const seenKey = new Set();

    assessments.forEach((assessment) => {
      const normalizedAssessment = {
        ...assessment,
        householdHeadName: assessment.householdHeadName || assessment.headOfHousehold?.name || 'Unknown',
      };

      const headName = normalizedAssessment.householdHeadName || '';
      const damageLevel = assessment.damageSeverityLevel || assessment.damageLevel || 1;
      const key = `${headName.toLowerCase().trim()}-${damageLevel}`;

      if (!seenKey.has(key)) {
        seenKey.add(key);
        mergedArray.push(normalizedAssessment);
      }
    });

    normalizedDisasterDetails.forEach((detail) => {
      const headName = detail.householdHeadName || detail.headOfHousehold?.name || '';
      const damageLevel = detail.damageSeverityLevel || detail.damageLevel || 1;
      const key = `${headName.toLowerCase().trim()}-${damageLevel}`;

      if (!seenKey.has(key)) {
        seenKey.add(key);
        mergedArray.push(detail);
      }
    });

    res.json({
      count: mergedArray.length,
      assessments: mergedArray,
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

    const assessment = await HouseholdAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

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
 * Helper: Validate status transition is allowed
 */
function validateStatusTransitionAllowed(currentStatus, targetStatus) {
  const validTransitions = {
    Proposed: ['Pending Approval', 'Approved', 'Rejected'],
    'Pending Approval': ['Approved', 'Rejected'],
    Approved: ['Disbursed', 'Rejected'],
    Disbursed: [],
    Rejected: [],
  };

  const allowed = (validTransitions[currentStatus] || []).includes(targetStatus);
  return {
    allowed,
    validTransitions: validTransitions[currentStatus] || [],
  };
}

/**
 * @PUT /api/allocation/requests/:requestId/approve
 */
const approveAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { justification } = req.body;

    const financeUser = req.financeUser || req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});

    console.log('🔐 [APPROVAL] Finance Officer approval initiated:', {
      requestId,
      officer: financeUser.name || financeUser.id,
      role: financeUser.role,
    });

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Allocation request not found', requestId });
    }

    const currentStatus = request.status;

    if (!['Proposed', 'Pending Approval'].includes(currentStatus)) {
      return res.status(400).json({
        message: `Cannot approve allocation in "${currentStatus}" status.`,
        currentStatus,
        allowedTransitions: ['Proposed', 'Pending Approval'],
      });
    }

    if (currentStatus === 'Proposed') {
      request.status = 'Pending Approval';
      await request.save();

      await createAuditLog({
        actionType: 'STATUS_TRANSITION',
        entityType: 'AidAllocationRequest',
        entityId: request._id,
        disasterId: request.disasterId,
        performedBy: financeUser._id || financeUser.id,
        performerRole: financeUser.role,
        previousValues: { status: 'Proposed' },
        newValues: { status: 'Pending Approval' },
        reason: 'Moved to Pending Approval - Finance Officer reviewing',
      });
    }

    request.status = 'Approved';
    request.approvalStatus = {
      ...request.approvalStatus,
      approvedBy: financeUser._id || financeUser.id,
      approvalDate: new Date(),
      justification: justification || 'Approved by Finance Officer',
    };

    await request.save();

    await createAuditLog({
      actionType: 'APPROVE',
      entityType: 'AidAllocationRequest',
      entityId: request._id,
      disasterId: request.disasterId,
      performedBy: financeUser._id || financeUser.id,
      performerRole: financeUser.role,
      previousValues: { status: 'Pending Approval' },
      newValues: { status: 'Approved' },
      changes: {
        statusTransition: 'Pending Approval → Approved',
        requestId: request.requestId,
        approvedPackages: request.allocatedPackages,
        approvedAmount: request.totalEstimatedCost,
        approvalDate: new Date(),
        approvedBy: financeUser.name || financeUser.id,
      },
      reason: `Allocation approved by Finance Officer - Total: M${request.totalEstimatedCost}`,
    });

    res.json({
      message: 'Allocation request approved successfully',
      request: {
        _id: request._id,
        requestId: request.requestId,
        status: request.status,
        householdId: request.householdId,
        totalEstimatedCost: request.totalEstimatedCost,
        packages: request.allocatedPackages?.length,
        approvalStatus: request.approvalStatus,
      },
    });
  } catch (error) {
    console.error('❌ [APPROVAL] Error approving request:', error);
    res.status(500).json({ message: 'Error during approval process', error: error.message });
  }
};

/**
 * @PUT /api/allocation/requests/:requestId/disburse
 */
const disburseAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { disbursementData, useReserve } = req.body;

    const { checkBudgetAvailability, deductFromBudget, deductFromReserve } =
      await import('../utils/budgetDeductionUtils.js');

    const financeUser = req.financeUser || req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Allocation request not found', requestId });
    }

    const currentStatus = request.status;

    if (currentStatus !== 'Approved') {
      return res.status(400).json({
        message: `Cannot disburse allocation in "${currentStatus}" status. Request must be "Approved".`,
        currentStatus,
        requiredStatus: 'Approved',
      });
    }

    const transition = validateStatusTransitionAllowed(currentStatus, 'Disbursed');
    if (!transition.allowed) {
      return res.status(400).json({
        message: `Invalid status transition from "${currentStatus}" to "Disbursed"`,
        currentStatus,
        validTransitions: transition.validTransitions,
      });
    }

    const disbursementAmount = disbursementData?.disbursedAmount || request.totalEstimatedCost;

    let budgetCheck;
    try {
      budgetCheck = await checkBudgetAvailability(request.disasterId, disbursementAmount);
    } catch (budgetError) {
      return res.status(500).json({ message: 'Error checking budget availability', error: budgetError.message });
    }

    // Case 1: Sufficient funds in envelope
    if (budgetCheck.available === true && budgetCheck.source === 'envelope') {
      request.status = 'Disbursed';
      request.fundedFromReserve = false;
      request.disbursementData = {
        disbursedDate: disbursementData?.disbursedDate || new Date(),
        disbursedAmount: disbursementAmount,
        disbursementMethod: disbursementData?.disbursementMethod || 'Bank Transfer',
        referenceNumber: disbursementData?.referenceNumber || `DISB-${request.requestId}-${Date.now()}`,
      };
      request.budgetDeductionDetails = {
        disasterEnvelopeId: budgetCheck.envelopeId,
        envelopeType: 'disaster_envelope',
        deductedAmount: disbursementAmount,
        deductedDate: new Date(),
        deductedBy: financeUser._id || financeUser.id,
      };

      await request.save();

      try {
        await deductFromBudget(
          budgetCheck.envelopeId,
          disbursementAmount,
          request._id,
          request.householdId,
          financeUser._id || financeUser.id,
          financeUser.role
        );
      } catch (deductError) {
        request.status = 'Approved';
        request.disbursementData = {};
        request.budgetDeductionDetails = {};
        await request.save();
        return res.status(400).json({ message: 'Deduction from budget failed', error: deductError.message });
      }

      if (request.householdAssessmentId) {
        try {
          await HouseholdAssessment.findByIdAndUpdate(request.householdAssessmentId, { status: 'Disbursed' });
        } catch (err) {
          console.warn('⚠️ Could not update household assessment status:', err.message);
        }
      }

      await createAuditLog({
        actionType: 'DISBURSE',
        entityType: 'AidAllocationRequest',
        entityId: request._id,
        disasterId: request.disasterId,
        performedBy: financeUser._id || financeUser.id,
        performerRole: financeUser.role,
        previousValues: { status: 'Approved' },
        newValues: { status: 'Disbursed' },
        changes: {
          statusTransition: 'Approved → Disbursed',
          requestId: request.requestId,
          householdId: request.householdId,
          totalDisbursedAmount: disbursementAmount,
          disbursementData: request.disbursementData,
          fundedFromReserve: false,
          budgetEnvelope: budgetCheck.envelopeName,
        },
        reason: `Funds disbursed - M${disbursementAmount} from ${budgetCheck.envelopeName}`,
      });

      return res.json({
        message: 'Allocation disbursed successfully',
        disbursement: {
          requestId: request.requestId,
          status: request.status,
          householdId: request.householdId,
          disbursementData: request.disbursementData,
          totalAmount: disbursementAmount,
          fundedFromReserve: false,
          budgetEnvelope: budgetCheck.envelopeName,
          remainingInEnvelope: budgetCheck.remaining - disbursementAmount,
        },
      });
    }

    // Case 2: Envelope insufficient, but reserve available
    if (budgetCheck.available === 'partial' && budgetCheck.source === 'reserve') {
      if (!useReserve) {
        return res.status(402).json({
          message: 'Insufficient funds in primary envelope. Strategic Reserve available.',
          budgetStatus: {
            shortfall: true,
            envelopeRemaining: budgetCheck.envelopeRemaining,
            envelopeName: budgetCheck.envelopeName,
            reserveRemaining: budgetCheck.reserveRemaining,
            needed: disbursementAmount,
            shortfallAmount: budgetCheck.shortfall,
          },
          prompt: {
            title: `Insufficient funds in ${budgetCheck.envelopeName}`,
            message: `M${budgetCheck.envelopeRemaining} remaining, M${disbursementAmount} required. Strategic Reserve has M${budgetCheck.reserveRemaining} available.`,
            options: ['Use Reserve', 'Cancel'],
          },
        });
      }

      request.status = 'Disbursed';
      request.fundedFromReserve = true;
      request.disbursementData = {
        disbursedDate: disbursementData?.disbursedDate || new Date(),
        disbursedAmount: disbursementAmount,
        disbursementMethod: disbursementData?.disbursementMethod || 'Bank Transfer',
        referenceNumber: disbursementData?.referenceNumber || `DISB-${request.requestId}-${Date.now()}`,
      };
      request.budgetDeductionDetails = {
        disasterEnvelopeId: budgetCheck.envelopeId,
        envelopeType: 'strategic_reserve',
        deductedAmount: disbursementAmount,
        deductedDate: new Date(),
        deductedBy: financeUser._id || financeUser.id,
      };

      await request.save();

      try {
        await deductFromReserve(
          disbursementAmount,
          request._id,
          request.householdId,
          financeUser._id || financeUser.id,
          financeUser.role,
          budgetCheck.envelopeId
        );
      } catch (deductError) {
        request.status = 'Approved';
        request.fundedFromReserve = false;
        request.disbursementData = {};
        request.budgetDeductionDetails = {};
        await request.save();
        return res.status(400).json({ message: 'Deduction from Strategic Reserve failed', error: deductError.message });
      }

      if (request.householdAssessmentId) {
        try {
          await HouseholdAssessment.findByIdAndUpdate(request.householdAssessmentId, { status: 'Disbursed' });
        } catch (err) {
          console.warn('⚠️ Could not update household assessment status:', err.message);
        }
      }

      await createAuditLog({
        actionType: 'DISBURSE_FROM_RESERVE',
        entityType: 'AidAllocationRequest',
        entityId: request._id,
        disasterId: request.disasterId,
        performedBy: financeUser._id || financeUser.id,
        performerRole: financeUser.role,
        previousValues: { status: 'Approved' },
        newValues: { status: 'Disbursed' },
        changes: {
          statusTransition: 'Approved → Disbursed (from Strategic Reserve)',
          requestId: request.requestId,
          householdId: request.householdId,
          disbursedAmount: disbursementAmount,
          fundedFromReserve: true,
        },
        reason: `⚠️ Funds disbursed from Strategic Reserve - M${disbursementAmount} for household ${request.householdId}`,
      });

      return res.json({
        message: '⚠️ Allocation disbursed from Strategic Reserve',
        disbursement: {
          requestId: request.requestId,
          status: request.status,
          householdId: request.householdId,
          disbursementData: request.disbursementData,
          totalAmount: disbursementAmount,
          fundedFromReserve: true,
          envelopeName: budgetCheck.envelopeName,
          warning: `Strategic Reserve used due to ${budgetCheck.envelopeName} shortfall of M${budgetCheck.shortfall}`,
        },
      });
    }

    // Case 3: Both insufficient
    return res.status(402).json({
      message: 'Insufficient funds in both the disaster envelope and the Strategic Reserve.',
      budgetStatus: {
        available: false,
        envelopeRemaining: budgetCheck.envelopeRemaining || 0,
        reserveRemaining: budgetCheck.reserveRemaining || 0,
        needed: disbursementAmount,
        totalShortfall: disbursementAmount - (budgetCheck.envelopeRemaining + budgetCheck.reserveRemaining),
      },
    });

  } catch (error) {
    console.error('❌ [DISBURSEMENT] Error disbursing allocation:', error);
    res.status(500).json({ message: 'Error during disbursement process', error: error.message });
  }
};

/**
 * @POST /api/allocation/plans
 */
const generateAllocationPlan = async (req, res) => {
  try {
    const { disasterId, planName } = req.body;

    const allocations = await AidAllocationRequest.find({
      disasterId,
      status: 'Approved',
    }).populate('householdAssessmentId');

    if (allocations.length === 0) {
      return res.status(400).json({ message: 'No approved allocations found for this disaster' });
    }

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

    const allocationsArray = allocations.map((alloc) => {
      const household = alloc.householdAssessmentId;
      const subtotal = alloc.totalEstimatedCost;
      totalBudgetRequired += subtotal;

      const tier = parseInt(alloc.aidTier.match(/\d+/)?.[0] || '0');
      if (tier <= 3) vulnerabilityDist.tier0_3.count++;
      else if (tier <= 6) vulnerabilityDist.tier4_6.count++;
      else if (tier <= 9) vulnerabilityDist.tier7_9.count++;
      else vulnerabilityDist.tier10Plus.count++;

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

    const totalCount = allocations.length;
    Object.keys(vulnerabilityDist).forEach((key) => {
      vulnerabilityDist[key].percentage = ((vulnerabilityDist[key].count / totalCount) * 100).toFixed(2);
    });

    const planId = 'PL-' + disasterId + '-' + Date.now();

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

    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'AllocationPlan',
      entityId: plan._id,
      disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Finance Officer',
      newValues: { planId: plan.planId, totalHouseholds: allocations.length, totalBudget: totalBudgetRequired },
      reason: `Allocation plan generated for ${allocations.length} households`,
    });

    res.status(201).json({ message: 'Allocation plan generated successfully', plan });
  } catch (error) {
    console.error('Error generating allocation plan:', error);
    res.status(500).json({ message: 'Error generating allocation plan', error: error.message });
  }
};

/**
 * @GET /api/allocation/plans/:disasterId
 */
const getAllocationPlansByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const plans = await AllocationPlan.find({ disasterId }).sort({ createdAt: -1 }).lean();
    res.json({ count: plans.length, plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
};

/**
 * @GET /api/allocation/dashboard-stats/:disasterId
 */
const getDashboardStats = async (req, res) => {
  try {
    const { disasterId } = req.params;

    const pendingAssessments = await HouseholdAssessment.countDocuments({ disasterId, status: 'Pending Review' });
    const pendingAllocations = await AidAllocationRequest.countDocuments({ disasterId, status: 'Pending Approval' });
    const approvedAllocations = await AidAllocationRequest.find({ disasterId, status: 'Approved' }).lean();
    const disbursedAllocations = await AidAllocationRequest.countDocuments({ disasterId, status: 'Disbursed' });

    const approvedTotal = approvedAllocations.reduce((sum, alloc) => sum + alloc.totalEstimatedCost, 0);

    const disbursedTotal = await AidAllocationRequest.aggregate([
      { $match: { disasterId: new mongoose.Types.ObjectId(disasterId), status: 'Disbursed' } },
      { $group: { _id: null, total: { $sum: '$totalEstimatedCost' } } },
    ]);

    res.json({
      pendingAssessments,
      pendingAllocations,
      approvedAllocations: approvedAllocations.length,
      approvedTotal,
      disbursedAllocations,
      disbursedTotal: disbursedTotal[0]?.total || 0,
      estimatedNeed: approvedTotal,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};

/**
 * @GET /api/allocation/requests/:disasterId
 */
const getAllocationRequestsByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status } = req.query;

    let query = { disasterId: new mongoose.Types.ObjectId(disasterId) };
    if (status) query.status = status;

    const requests = await AidAllocationRequest.find(query)
      .populate({
        path: 'householdAssessmentId',
        select: 'householdId headOfHousehold householdSize district vulnerabilityLevel damageAssessment address',
      })
      .sort({ createdAt: -1 })
      .lean();

    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        let householdData = req.householdAssessmentId || {};
        let disasterData = {};

        if (!householdData || !householdData.householdHeadName) {
          try {
            const assessment = await HouseholdAssessment.findById(req.householdAssessmentId || req.householdId)
              .select('householdId headOfHousehold householdSize district vulnerabilityLevel damageAssessment address')
              .lean();
            if (assessment) {
              householdData = {
                ...assessment,
                householdHeadName: assessment.householdHeadName || assessment.headOfHousehold?.name || 'Unknown',
              };
            }
          } catch (err) {
            console.warn('Could not fetch household assessment:', err.message);
          }
        }

        if (req.disasterId) {
          try {
            const disaster = await Disaster.findById(req.disasterId)
              .select('disasterType incidentName location')
              .lean();
            if (disaster) disasterData = disaster;
          } catch (err) {
            console.warn('Could not fetch disaster:', err.message);
          }
        }

        return {
          _id: req._id,
          requestId: req.requestId,
          householdAssessmentId: req.householdAssessmentId,
          disasterId: req.disasterId,
          householdId: householdData.householdId || req.householdId,
          householdName: householdData.householdHeadName || 'Unknown',
          householdSize: householdData.householdSize || 0,
          district: householdData.district || 'N/A',
          address: householdData.address || 'N/A',
          damageLevel: req.damageLevel,
          compositeScore: req.compositeScore,
          vulnerabilityLevel: householdData.vulnerabilityLevel,
          aidTier: req.aidTier,
          allocatedPackages: req.allocatedPackages || [],
          totalEstimatedCost: req.totalEstimatedCost,
          disasterType: disasterData.disasterType || 'Unknown',
          incidentName: disasterData.incidentName,
          status: req.status,
          isOverride: req.isOverride,
          createdAt: req.createdAt,
        };
      })
    );

    res.json({ count: enrichedRequests.length, requests: enrichedRequests });
  } catch (error) {
    console.error('Error fetching allocation requests:', error);
    res.status(500).json({ message: 'Error fetching allocation requests', error: error.message });
  }
};

/**
 * @DELETE /api/allocation/assessments/:assessmentId
 */
const deleteHouseholdAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await HouseholdAssessment.findByIdAndDelete(assessmentId);

    if (!assessment) {
      return res.status(404).json({ message: 'Household assessment not found' });
    }

    await createAuditLog({
      actionType: 'DELETE',
      entityType: 'HouseholdAssessment',
      entityId: assessmentId,
      disasterId: assessment.disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Data Clerk',
      oldValues: {
        householdId: assessment.householdId,
        headOfHousehold: assessment.headOfHousehold,
        disasterType: assessment.disasterType,
      },
      reason: 'Household assessment deleted',
    });

    res.json({ message: 'Household assessment deleted successfully', deletedAssessment: assessment });
  } catch (error) {
    console.error('❌ Error deleting household assessment:', error);
    res.status(500).json({ message: 'Error deleting household assessment', error: error.message });
  }
};

/**
 * @PUT /api/allocation/assessments/:assessmentId
 */
const updateHouseholdAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updateData = req.body;

    const oldAssessment = await HouseholdAssessment.findById(assessmentId);
    if (!oldAssessment) {
      return res.status(404).json({ message: 'Household assessment not found' });
    }

    if (updateData.monthlyIncome !== undefined) {
      let incomeCategory = 'High';
      if (updateData.monthlyIncome <= 3000) incomeCategory = 'Low';
      else if (updateData.monthlyIncome <= 10000) incomeCategory = 'Middle';
      updateData.incomeCategory = incomeCategory;
    }

    const assessment = await HouseholdAssessment.findByIdAndUpdate(
      assessmentId,
      updateData,
      { new: true, runValidators: false }
    );

    await createAuditLog({
      actionType: 'UPDATE',
      entityType: 'HouseholdAssessment',
      entityId: assessmentId,
      disasterId: assessment.disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Data Clerk',
      oldValues: {
        monthlyIncome: oldAssessment.monthlyIncome,
        incomeCategory: oldAssessment.incomeCategory,
        householdSize: oldAssessment.householdSize,
        damageDescription: oldAssessment.damageDescription,
      },
      newValues: {
        monthlyIncome: assessment.monthlyIncome,
        incomeCategory: assessment.incomeCategory,
        householdSize: assessment.householdSize,
        damageDescription: assessment.damageDescription,
      },
      reason: 'Household assessment updated',
    });

    res.json({ message: 'Household assessment updated successfully', assessment });
  } catch (error) {
    console.error('❌ Error updating household assessment:', error);
    res.status(500).json({ message: 'Error updating household assessment', error: error.message });
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

async function seedDefaultAssistancePackages() {
  try {
    const currentCount = await AssistancePackage.countDocuments();
    if (currentCount > 0) return;

    const packagesToSeed = Object.values(ASSISTANCE_PACKAGES).map((pkg) => ({
      packageId: pkg.packageId,
      name: pkg.name,
      description: pkg.description,
      unitCost: pkg.unitCost,
      category: pkg.category,
      applicableDisasters: ['All'],
      allocationRules: { scoreLevelMin: 0, scoreLevelMax: 100 },
      quantityUnit: 'Unit',
      notes: `${pkg.name} - Default assistance package`,
    }));

    await AssistancePackage.insertMany(packagesToSeed);
    console.log(`✅ Seeded ${packagesToSeed.length} default assistance packages`);
  } catch (error) {
    console.error('Error seeding default assistance packages:', error.message || error);
  }
}

const getAssistancePackages = async (req, res) => {
  try {
    await seedDefaultAssistancePackages();
    const packages = await AssistancePackage.find().sort({ category: 1, name: 1 }).lean();
    res.json({ count: packages.length, packages });
  } catch (error) {
    console.error('Error fetching assistance packages:', error);
    res.status(500).json({ message: 'Error fetching assistance packages', error: error.message });
  }
};

/**
 * Allocate aid to household directly
 */
async function allocateAidToHousehold(req, res) {
  try {
    const {
      disasterId,
      householdAssessmentId,
      householdId,
      householdHeadName,
      packages,
      totalCost,
      compositeScore,
      damageScore,
      vulnerability,
      tier,
      isOverridden,
      noEligibleMarker,
    } = req.body;

    if (noEligibleMarker) {
      return approveDisasterAssessmentNoAllocation(req, res);
    }

    const user = req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});

    if (!disasterId || !householdAssessmentId || !householdId || !packages || !Array.isArray(packages)) {
      return res.status(400).json({ message: 'Missing required fields: disasterId, householdAssessmentId, householdId, packages array' });
    }

    if (packages.length === 0) {
      return res.status(400).json({ message: 'At least one package must be provided' });
    }

    for (const pkg of packages) {
      if (!pkg.name || pkg.cost === undefined) {
        return res.status(400).json({ message: 'Each package must have name and cost properties' });
      }
    }

    let assessmentId;
    if (mongoose.Types.ObjectId.isValid(householdAssessmentId)) {
      assessmentId = householdAssessmentId;
    } else {
      return res.status(400).json({ message: 'Invalid householdAssessmentId format' });
    }

    let aidTier = tier ? (
      {
        'Minimal': 'Basic Support (0-3)',
        'Basic': 'Basic Support (0-3)',
        'Extended': 'Shelter + Food + Cash (4-6)',
        'Priority': 'Tent + Reconstruction + Food (7-9)',
      }[tier] || 'Basic Support (0-3)'
    ) : null;

    if (!aidTier && compositeScore !== undefined) {
      if (compositeScore >= 10) aidTier = 'Priority Reconstruction + Livelihood (10+)';
      else if (compositeScore >= 7) aidTier = 'Tent + Reconstruction + Food (7-9)';
      else if (compositeScore >= 4) aidTier = 'Shelter + Food + Cash (4-6)';
      else aidTier = 'Basic Support (0-3)';
    }

    if (!aidTier) aidTier = 'Basic Support (0-3)';

    const requestId = `AAR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const allocatedPackages = packages.map((pkg, index) => ({
      packageId: pkg._id || pkg.id || `pkg-${index}`,
      packageName: pkg.name,
      quantity: 1,
      unitCost: pkg.cost,
      totalCost: pkg.cost,
      category: pkg.category || 'Aid Package',
    }));

    let createdById;
    if (req.user && req.user._id) {
      createdById = req.user._id;
    } else if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
      createdById = user._id;
    } else if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
      createdById = user.id;
    } else {
      return res.status(400).json({ message: 'Could not extract valid user ID from authentication' });
    }

    const allocationRequest = await AidAllocationRequest.findOneAndUpdate(
      { disasterId: new mongoose.Types.ObjectId(disasterId), householdAssessmentId: assessmentId },
      {
        requestId,
        householdId,
        damageLevel: damageScore || 1,
        vulnerabilityPoints: { incomeScore: vulnerability || 0 },
        compositeScore: compositeScore || 0,
        scoreBreakdown: { damageComponent: damageScore || 0, vulnerabilityComponent: vulnerability || 0, totalVulnerability: vulnerability || 0 },
        aidTier,
        allocatedPackages,
        totalEstimatedCost: totalCost || 0,
        status: 'Approved',
        isOverride: isOverridden || false,
        createdBy: createdById,
        lastModifiedBy: createdById,
      },
      { upsert: true, new: true, runValidators: true }
    );

    try {
      await AuditLog.create({
        action: 'CREATE',
        entityType: 'AidAllocationRequest',
        entityId: allocationRequest._id,
        performedBy: createdById,
        performerRole: user.role || 'Unknown',
        previousValues: {},
        newValues: { status: 'Approved', householdId, amount: totalCost, packages: packages.map(p => p.name) },
        reason: `Allocation created for ${householdHeadName || householdId} - Amount: M${totalCost}`,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.warn('⚠️ Failed to create audit log:', logError.message);
    }

    res.status(201).json({
      message: 'Aid allocated successfully',
      requestId: allocationRequest.requestId,
      allocationId: allocationRequest._id,
      household: householdHeadName || householdId,
      amount: totalCost,
      packageCount: packages.length,
      status: 'Approved',
    });
  } catch (error) {
    console.error('❌ Error allocating aid:', error.message);
    res.status(500).json({ message: 'Failed to allocate aid', error: error.message });
  }
}

/**
 * Auto-create household assessments from disaster damage details
 */
const createAssessmentsFromDisasterDetails = async (disasterId, householdDamageDetails, disasterData) => {
  try {
    if (!Array.isArray(householdDamageDetails) || householdDamageDetails.length === 0) {
      return { created: 0, skipped: 0, errors: [] };
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const detail of householdDamageDetails) {
      try {
        const damageLevelMap = { 'partial': 2, 'severe': 3, 'destroyed': 4 };
        const severityLevel = damageLevelMap[detail.damageLevel?.toLowerCase()] || 1;
        const damageDescription = `${detail.assetsDamaged || 'Property'} damage - ${detail.needsCategory || 'General assistance needed'}`;

        const existingAssessment = await HouseholdAssessment.findOne({
          disasterId: new mongoose.Types.ObjectId(disasterId),
          householdId: detail.householdId,
          'headOfHousehold.name': detail.headName,
        });

        if (existingAssessment) {
          skippedCount++;
          continue;
        }

        await HouseholdAssessment.create({
          disasterId: new mongoose.Types.ObjectId(disasterId),
          householdId: detail.householdId,
          headOfHousehold: { name: detail.headName, idNumber: detail.idNumber || '' },
          householdSize: detail.householdSize || 1,
          childrenUnder5: detail.childrenUnder5 || 0,
          monthlyIncome: detail.monthlyIncome || 0,
          incomeCategory: detail.monthlyIncome <= 3000 ? 'Low' : detail.monthlyIncome <= 10000 ? 'Middle' : 'High',
          disasterType: disasterData?.type || 'Unknown',
          damageDescription,
          damageSeverityLevel: severityLevel,
          damageDetails: { assetsDamaged: detail.assetsDamaged || '', needsCategory: detail.needsCategory || '' },
          location: { village: disasterData?.location || '', district: disasterData?.district || '' },
          assessedBy: 'System',
          createdAt: new Date(),
        });

        createdCount++;
      } catch (itemError) {
        errors.push({ household: detail.headName, error: itemError.message });
      }
    }

    return { created: createdCount, skipped: skippedCount, errors };
  } catch (error) {
    console.error('❌ Error in createAssessmentsFromDisasterDetails:', error.message);
    throw error;
  }
};

/**
 * @POST /api/allocation/create-request
 */
async function createAllocationRequest(req, res) {
  try {
    const { disasterId, householdId, householdHeadName, packages, totalCost, compositeScore, damageScore, vulnerability, tier, isOverridden, override } = req.body;
    const householdAssessmentId = req.body.householdAssessmentId || req.body.assessmentId;
    const user = req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});

    if (!disasterId || !householdAssessmentId) {
      return res.status(400).json({ message: 'Missing required fields: disasterId and assessmentId required' });
    }

    if (!mongoose.Types.ObjectId.isValid(householdAssessmentId)) {
      return res.status(400).json({ message: 'Invalid householdAssessmentId format' });
    }

    const assessmentId = householdAssessmentId;
    let finalPackages = packages;
    let finalCompositeScore = compositeScore;
    let finalDamageScore = damageScore;
    let finalVulnerability = vulnerability;
    let finalTotalCost = totalCost;
    let finalHouseholdId = householdId;
    let finalHouseholdHeadName = householdHeadName;

    if (!packages || packages.length === 0) {
      try {
        const assessment = await HouseholdAssessment.findById(assessmentId);
        if (!assessment) return res.status(404).json({ message: 'Household assessment not found' });

        finalHouseholdId = assessment.householdId;
        finalHouseholdHeadName = assessment.headOfHousehold;

        if (Array.isArray(assessment.recommendedAssistance)) {
          finalPackages = assessment.recommendedAssistance;
        } else if (assessment.recommendedAssistance && typeof assessment.recommendedAssistance === 'object') {
          finalPackages = [assessment.recommendedAssistance];
        } else {
          finalPackages = [{ name: `Disaster Relief - ${assessment.damageSeverityLevel || 'Standard'}`, cost: assessment.damageDetails?.estimatedCost || 5000, category: 'Relief Package' }];
        }

        if (!finalCompositeScore && assessment.compositeScore !== undefined) finalCompositeScore = assessment.compositeScore;
        if (!finalDamageScore && assessment.damageLevel !== undefined) finalDamageScore = assessment.damageLevel;
        if (!finalVulnerability && assessment.vulnerabilityPoints) finalVulnerability = assessment.vulnerabilityPoints.totalVulnerability || 0;
        finalTotalCost = finalPackages.reduce((sum, pkg) => sum + (pkg.cost || 0), 0);
      } catch (err) {
        return res.status(500).json({ message: 'Error loading assessment data', error: err.message });
      }
    } else {
      for (const pkg of packages) {
        if (!pkg.name || pkg.cost === undefined) {
          return res.status(400).json({ message: 'Each package must have name and cost properties' });
        }
      }
    }

    let aidTier = tier ? (
      { 'Minimal': 'Basic Support (0-3)', 'Basic': 'Basic Support (0-3)', 'Extended': 'Shelter + Food + Cash (4-6)', 'Priority': 'Tent + Reconstruction + Food (7-9)' }[tier] || 'Basic Support (0-3)'
    ) : null;

    if (!aidTier && finalCompositeScore !== undefined) {
      if (finalCompositeScore >= 10) aidTier = 'Priority Reconstruction + Livelihood (10+)';
      else if (finalCompositeScore >= 7) aidTier = 'Tent + Reconstruction + Food (7-9)';
      else if (finalCompositeScore >= 4) aidTier = 'Shelter + Food + Cash (4-6)';
      else aidTier = 'Basic Support (0-3)';
    }

    if (!aidTier) aidTier = 'Basic Support (0-3)';

    const requestId = `AAR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const allocatedPackages = finalPackages.map((pkg, index) => ({
      packageId: pkg._id || pkg.id || `pkg-${index}`,
      packageName: pkg.name,
      quantity: 1,
      unitCost: pkg.cost,
      totalCost: pkg.cost,
      category: pkg.category || 'Aid Package',
    }));

    let createdById;
    if (req.user && req.user._id) createdById = req.user._id;
    else if (user._id && mongoose.Types.ObjectId.isValid(user._id)) createdById = user._id;
    else if (user.id && mongoose.Types.ObjectId.isValid(user.id)) createdById = user.id;
    else return res.status(400).json({ message: 'Could not extract valid user ID from authentication' });

    const allocationRequest = new AidAllocationRequest({
      requestId,
      disasterId: new mongoose.Types.ObjectId(disasterId),
      householdAssessmentId: assessmentId,
      householdId: finalHouseholdId,
      damageLevel: finalDamageScore || 1,
      vulnerabilityPoints: { incomeScore: finalVulnerability || 0 },
      compositeScore: finalCompositeScore || 0,
      scoreBreakdown: { damageComponent: finalDamageScore || 0, vulnerabilityComponent: finalVulnerability || 0, totalVulnerability: finalVulnerability || 0 },
      aidTier,
      allocatedPackages,
      totalEstimatedCost: finalTotalCost || 0,
      status: 'Proposed',
      isOverride: isOverridden || override || false,
      createdBy: createdById,
      lastModifiedBy: createdById,
    });

    await allocationRequest.save();

    try {
      await AuditLog.create({
        action: 'CREATE_ALLOCATION_REQUEST',
        module: 'Allocation',
        actor: user.name || user.username || 'System',
        actorRole: user.role || 'Unknown',
        affectedRecord: finalHouseholdId,
        changes: { status: 'Proposed', amount: finalTotalCost, packages: finalPackages.map(p => p.name), overridden: isOverridden || override },
        status: 'success',
        timestamp: new Date(),
      });
    } catch (logError) {
      console.warn('⚠️ Failed to create audit log:', logError.message);
    }

    res.status(201).json({
      message: 'Allocation request created successfully (pending approval)',
      requestId: allocationRequest.requestId,
      allocationId: allocationRequest._id,
      household: finalHouseholdHeadName || finalHouseholdId,
      amount: finalTotalCost,
      packageCount: finalPackages.length,
      status: 'Proposed',
    });
  } catch (error) {
    console.error('❌ Error creating allocation request:', error.message);
    res.status(500).json({ message: 'Failed to create allocation request', error: error.message });
  }
}

/**
 * @GET /api/allocation/requests/:requestId/audit-log
 */
const getAuditLogForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Allocation request not found', requestId });

    const auditLogs = await AuditLog.find({ entityId: requestId, entityType: 'AidAllocationRequest' }).sort({ createdAt: -1 }).lean();
    const auditLogsByRequestId = await AuditLog.find({ 'details.requestId': request.requestId }).sort({ createdAt: -1 }).lean();

    const allLogs = [...auditLogs];
    auditLogsByRequestId.forEach(log => {
      if (!allLogs.find(l => l._id.equals(log._id))) allLogs.push(log);
    });

    allLogs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      requestId,
      requestDetails: {
        requestId: request.requestId,
        householdId: request.householdId,
        status: request.status,
        totalAmount: request.totalEstimatedCost,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
      workflowHistory: allLogs.map(log => ({
        timestamp: log.createdAt,
        action: log.actionType || log.action,
        performedBy: log.performedBy,
        performerRole: log.performerRole || log.actorRole,
        statusBefore: log.previousValues?.status || log.changes?.statusBefore,
        statusAfter: log.newValues?.status || log.changes?.statusAfter,
        reason: log.reason,
        details: log.changes || log.details,
      })),
      totalEvents: allLogs.length,
    });
  } catch (error) {
    console.error('❌ [AUDIT LOG] Error fetching audit log:', error);
    res.status(500).json({ message: 'Error fetching audit log', error: error.message });
  }
};

/**
 * @POST /api/allocation/approve-ineligible-disaster
 */
const approveDisasterAssessmentNoAllocation = async (req, res) => {
  try {
    const { disasterId } = req.body;
    const user = req.user;
    const userId = user?._id || user?.id;

    if (!disasterId) return res.status(400).json({ message: 'Disaster ID is required' });
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return res.status(401).json({ message: 'Authentication required' });

    const disaster = await Disaster.findById(disasterId);
    if (!disaster) return res.status(404).json({ message: 'Disaster not found' });

    const existingAllocations = await AidAllocationRequest.countDocuments({ disasterId });
    if (existingAllocations > 0) return res.status(400).json({ message: 'This disaster already has allocations' });

    const markerRecord = new AidAllocationRequest({
      requestId: `AAR-NOELIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      disasterId: new mongoose.Types.ObjectId(disasterId),
      householdAssessmentId: new mongoose.Types.ObjectId(),
      householdId: `NO_ELIGIBLE_HOUSEHOLD_${Date.now()}`,
      damageLevel: 1,
      vulnerabilityPoints: { incomeScore: 0 },
      compositeScore: 0,
      scoreBreakdown: { damageComponent: 0, vulnerabilityComponent: 0, totalVulnerability: 0 },
      aidTier: 'Basic Support (0-3)',
      allocatedPackages: [],
      totalEstimatedCost: 0,
      status: 'Approved',
      isOverride: false,
      createdBy: userId,
      lastModifiedBy: userId,
      approvalStatus: {
        approvedBy: userId,
        approvalDate: new Date(),
        justification: 'Disaster assessed - no eligible households for aid',
      },
      overrideReason: 'Ineligible disaster marker',
      overrideJustification: 'No eligible households identified',
    });

    await markerRecord.save();

    await AuditLog.create({
      action: 'DISASTER_ASSESSED_NO_AID',
      actorId: userId,
      actorName: user.name || 'Unknown',
      actorRole: user.role || 'Unknown',
      entityType: 'Disaster',
      entityId: new mongoose.Types.ObjectId(disasterId),
      details: { status: 'Approved', note: 'Disaster assessment completed with no eligible households' },
    });

    res.json({ message: 'Disaster assessment approved - no eligible households for aid', allocationId: markerRecord._id, status: 'Approved' });
  } catch (error) {
    console.error('❌ Error approving ineligible disaster:', error);
    res.status(500).json({ message: 'Error approving disaster assessment', error: error.message });
  }
};

/**
 * @GET /api/allocation/disaster-summary
 * Get disbursed allocations grouped by disaster type
 * FIXED: uses disasterId populate + totalEstimatedCost + correct field names
 */
const getDisasterSummary = async (req, res) => {
  try {
    const allocations = await AidAllocationRequest.find({ status: 'Disbursed' })
      .populate('disasterId', 'type disasterType incidentName')
      .sort({ createdAt: -1 });

    const summary = {};

    allocations.forEach(allocation => {
      const disaster = allocation.disasterId;
      const type = disaster?.type || disaster?.disasterType;
      if (!type) return;

      if (!summary[type]) {
        summary[type] = {
          type,
          totalAmount: 0,
          totalHouseholds: 0,
          totalPackages: 0,
          disasters: {},
        };
      }

      const disasterId = disaster._id.toString();
      if (!summary[type].disasters[disasterId]) {
        summary[type].disasters[disasterId] = {
          id: disasterId,
          incidentName: disaster.incidentName || disasterId,
          totalAmount: 0,
          households: 0,
          packages: 0,
          dateAllocated: allocation.createdAt,
        };
      }

      const amount = allocation.totalEstimatedCost || 0;
      const packages = allocation.allocatedPackages?.length || 0;

      summary[type].disasters[disasterId].totalAmount += amount;
      summary[type].disasters[disasterId].packages += packages;
      summary[type].disasters[disasterId].households += 1;

      if (allocation.createdAt > summary[type].disasters[disasterId].dateAllocated) {
        summary[type].disasters[disasterId].dateAllocated = allocation.createdAt;
      }

      summary[type].totalAmount += amount;
      summary[type].totalHouseholds += 1;
      summary[type].totalPackages += packages;
    });

    const result = Object.values(summary).map(s => ({
      ...s,
      disasters: Object.values(s.disasters),
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching disaster summary:', error);
    res.status(500).json({ message: 'Error fetching disaster summary', error: error.message });
  }
};

export default {
  createHouseholdAssessment,
  getAssessmentsByDisaster,
  deleteHouseholdAssessment,
  updateHouseholdAssessment,
  calculateAllocationScore,
  createAllocationRequest,
  approveAllocationRequest,
  disburseAllocationRequest,
  getAuditLogForRequest,
  generateAllocationPlan,
  getAllocationPlansByDisaster,
  getAllocationRequestsByDisaster,
  getDashboardStats,
  allocateAidToHousehold,
  getAssistancePackages,
  createAssessmentsFromDisasterDetails,
  seedDefaultAssistancePackages,
  approveDisasterAssessmentNoAllocation,
  getDisasterSummary,
};