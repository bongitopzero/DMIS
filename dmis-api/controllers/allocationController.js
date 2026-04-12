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
import Expense from '../models/Expense.js';
import Expenditure from '../models/Expenditure.js';
import Disaster from '../models/Disaster.js';
import {
  calculateCompositeScore,
  validateOverride,
  generateScoringSummary,
} from '../utils/allocationScoringEngine.js'

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
        // Determine max households for this disaster from several possible fields
        const maxFromNumberField = disaster.numberOfHouseholdsAffected || disaster.totalAffectedHouseholds || 0;
        let maxHouseholds = parseInt(maxFromNumberField) || 0;
        if (!maxHouseholds && disaster.affectedPopulation) {
          // Try parsing strings like '5 households'
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
    console.error('❌ Error creating assessment:', error.message);
    console.error('❌ Full error:', error);
    console.error('❌ Request body:', req.body);
    
    // Extract validation error details
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

    // Convert disasterId string to MongoDB ObjectId for proper matching
    const objectId = new mongoose.Types.ObjectId(disasterId);
    const query = { disasterId: objectId };
    if (status) query.status = status;

    // Fetch assessments from HouseholdAssessment collection
    const assessments = await HouseholdAssessment.find(query)
      .sort({ assessmentDate: -1 })
      .lean();

    // Fetch disaster document and its householdDamageDetails array
    const disaster = await Disaster.findById(disasterId).lean();
    const disasterHouseholdDetails = disaster?.householdDamageDetails || [];

    // Normalize householdDamageDetails to match assessment structure
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
      damageLevel: detail.damageLevel || 1, // Alias for damageSeverityLevel
      headOfHousehold: detail.headOfHousehold || {
        name: detail.householdHeadName || 'Unknown',
        gender: detail.gender || '',
        age: detail.age || null,
      },
      householdId: detail.householdId || `HH-${detail._id}`,
      assessmentDate: detail.createdAt || detail.assessmentDate || new Date(),
      source: 'disasterDetails', // Mark that this came from disaster document
    }));

    // Merge and deduplicate by household head name and damage level
    const mergedArray = [];
    const seenKey = new Set();

    // Add assessments from HouseholdAssessment collection
    assessments.forEach((assessment) => {
      // Normalize to include householdHeadName at root level
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

    // Add disaster details that aren't already in assessments
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
 * @PUT /api/allocation/requests/:requestId/approve
 * Approve allocation request
 */
const approveAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { justification } = req.body;

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Allocation request not found' });
    }

    // Update status and approval details
    request.status = 'Approved';
    request.approvalStatus = {
      ...request.approvalStatus,
      approvedBy: req.user?.id ||req.body.approverId,
      approvalDate: new Date(),
      justification: justification || 'Approved for disbursement',
    };

    await request.save();

    // Log audit trail with detailed approval breakdown
    await createAuditLog({
      actionType: 'APPROVE',
      entityType: 'AidAllocationRequest',
      entityId: request._id,
      disasterId: request.disasterId,
      performedBy: req.user?.id,
      performerRole: req.user?.role || 'Finance Officer',
      previousValues: { status: 'Proposed' },
      newValues: { status: 'Approved' },
      changes: {
        status: 'Proposed → Approved',
        requestId: request.requestId,
        approvedPackages: request.allocatedPackages,
        approvedAmount: request.totalEstimatedCost,
        approvalDate: new Date(),
        approvedBy: req.user?.id || req.body.approverId,
      },
      reason: `Allocation approved - Total Amount: M${request.totalEstimatedCost} - ${request.allocatedPackages?.length || 0} packages approved`,
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
 * @PUT /api/allocation/requests/:requestId/disburse
 * Mark allocation request as disbursed, create expense(s) to reflect budget deduction,
 * and create audit log entry so it appears in finance audit trail.
 */
const disburseAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { disbursementData } = req.body; // { disbursedDate, disbursedAmount, disbursementMethod, referenceNumber }

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Allocation request not found' });

    if (request.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved allocations can be disbursed' });
    }

    // Set disbursement data
    request.status = 'Disbursed';
    request.disbursementData = {
      disbursedDate: disbursementData?.disbursedDate || new Date(),
      disbursedAmount: disbursementData?.disbursedAmount || request.totalEstimatedCost,
      disbursementMethod: disbursementData?.disbursementMethod || 'Bank Transfer',
      referenceNumber: disbursementData?.referenceNumber || `DISB-${request.requestId}-${Date.now()}`,
    };

    await request.save();

    // Create expense records per category to reduce budget remaining (financial utils compute remaining from expenses)
    const categorySums = {};
    (request.allocatedPackages || []).forEach((p) => {
      const cat = p.category || 'Other';
      categorySums[cat] = (categorySums[cat] || 0) + (p.totalCost || 0);
    });

    const createdExpenses = [];
    for (const [category, amount] of Object.entries(categorySums)) {
      const expense = new Expense({
        disasterId: request.disasterId,
        category,
        vendorName: 'Allocation Disbursement',
        vendorRegistrationNumber: 'SYSTEM',
        invoiceNumber: `AL-DISB-${request.requestId}-${category.replace(/\s+/g, '')}-${Date.now()}`,
        bankReferenceNumber: request.disbursementData.referenceNumber,
        amount: amount,
        supportingDocumentUrl: null,
        paymentMethod: request.disbursementData.disbursementMethod,
        loggedBy: req.user?.id || 'System',
        approvedBy: req.user?.id || 'System',
        approvalDate: new Date(),
        status: 'Approved',
        receipientName: request.householdId || null,
        receipientBankAccount: null,
        description: `Disbursement for allocation ${request.requestId} - ${category}`,
      });

      await expense.save();
      createdExpenses.push(expense);

      // Create audit log for the expense creation so it shows up in finance audit trail
      await AuditLog.create({
        action: 'EXPENSE_CREATED_BY_DISBURSE',
        disasterId: request.disasterId,
        actorId: req.user?.id || null,
        actorRole: req.user?.role || 'Finance Officer',
        entityType: 'Expense',
        entityId: expense._id,
        details: {
          note: `Auto-created expense for allocation disbursement ${request.requestId}`,
          allocationRequestId: request._id,
          amount: expense.amount,
          category: expense.category,
        },
      });
    }

    // Update the linked household assessment status if present
    if (request.householdAssessmentId) {
      try {
        await HouseholdAssessment.findByIdAndUpdate(request.householdAssessmentId, { status: 'Disbursed' });
      } catch (err) {
        console.warn('Could not update household assessment status:', err.message || err);
      }
    }

    // Create audit log for allocation disbursement with detailed breakdown
    await AuditLog.create({
      action: 'ALLOCATION_DISBURSED',
      disasterId: request.disasterId,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || 'Finance Officer',
      entityType: 'AidAllocationRequest',
      entityId: request._id,
      details: {
        requestId: request.requestId,
        householdId: request.householdId,
        allocationStatus: 'Approved → Disbursed',
        disbursedPackages: request.allocatedPackages,
        totalDisbursedAmount: request.totalEstimatedCost,
        disbursementData: request.disbursementData,
        disbursedExpenses: createdExpenses.map((e) => ({
          _id: e._id,
          category: e.category,
          amount: e.amount,
          referenceNumber: e.bankReferenceNumber,
        })),
        createdExpenseCount: createdExpenses.length,
      },
    });

    res.json({ message: 'Allocation disbursed and expenses created', disbursement: request.disbursementData, expenses: createdExpenses.length });
  } catch (error) {
    console.error('Error disbursing allocation:', error);
    res.status(500).json({ message: 'Error disbursing allocation', error: error.message });
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
 * @GET /api/allocation/requests/:disasterId
 * Get all allocation requests for a disaster
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

    // Enrich data by fetching household assessments and disasters if populate didn't work
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        let householdData = req.householdAssessmentId || {};
        let disasterData = {};

        // If populate didn't return household data, fetch it manually
        if (!householdData || !householdData.householdHeadName) {
          try {
            const assessment = await HouseholdAssessment.findById(req.householdAssessmentId || req.householdId)
              .select('householdId headOfHousehold householdSize district vulnerabilityLevel damageAssessment address')
              .lean();
            if (assessment) {
              // Normalize to include householdHeadName at root
              householdData = {
                ...assessment,
                householdHeadName: assessment.householdHeadName || assessment.headOfHousehold?.name || 'Unknown',
              };
            }
          } catch (err) {
            console.warn('Could not fetch household assessment:', err.message);
          }
        }

        // Fetch disaster data if available
        if (req.disasterId) {
          try {
            const disaster = await Disaster.findById(req.disasterId)
              .select('disasterType incidentName location')
              .lean();
            if (disaster) {
              disasterData = disaster;
            }
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

    res.json({
      count: enrichedRequests.length,
      requests: enrichedRequests,
    });
  } catch (error) {
    console.error('Error fetching allocation requests:', error);
    res.status(500).json({
      message: 'Error fetching allocation requests',
      error: error.message,
    });
  }
};

/**
 * @DELETE /api/allocation/assessments/:assessmentId
 * Delete household assessment
 */
const deleteHouseholdAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await HouseholdAssessment.findByIdAndDelete(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        message: 'Household assessment not found',
      });
    }

    // Log audit trail
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

    console.log('✅ Household assessment deleted successfully:', assessmentId);
    res.json({
      message: 'Household assessment deleted successfully',
      deletedAssessment: assessment,
    });
  } catch (error) {
    console.error('❌ Error deleting household assessment:', error);
    res.status(500).json({
      message: 'Error deleting household assessment',
      error: error.message,
    });
  }
};

/**
 * @PUT /api/allocation/assessments/:assessmentId
 * Update household assessment
 */
const updateHouseholdAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updateData = req.body;

    // Store old values for audit log
    const oldAssessment = await HouseholdAssessment.findById(assessmentId);
    if (!oldAssessment) {
      return res.status(404).json({
        message: 'Household assessment not found',
      });
    }

    // Recalculate income category if income is updated
    if (updateData.monthlyIncome !== undefined) {
      let incomeCategory = 'High';
      if (updateData.monthlyIncome <= 3000) incomeCategory = 'Low';
      else if (updateData.monthlyIncome <= 10000) incomeCategory = 'Middle';
      updateData.incomeCategory = incomeCategory;
    }

    // Update assessment
    const assessment = await HouseholdAssessment.findByIdAndUpdate(
      assessmentId,
      updateData,
      { new: true, runValidators: false }
    );

    // Log audit trail
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

    console.log('✅ Household assessment updated successfully:', assessmentId);
    res.json({
      message: 'Household assessment updated successfully',
      assessment,
    });
  } catch (error) {
    console.error('❌ Error updating household assessment:', error);
    res.status(500).json({
      message: 'Error updating household assessment',
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

/**
 * Allocate aid to household directly from allocation plan
 * Creates an AidAllocationRequest and optional Expense record
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
    } = req.body;

    // Get user from either req.user (set by auth middleware) or headers
    const user = req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});
    
    console.log('📝 allocateAidToHousehold - User object:', { 
      id: user._id || user.id,
      role: user.role,
      name: user.name
    });

    // Validate required fields
    if (!disasterId || !householdAssessmentId || !householdId || !packages || !Array.isArray(packages)) {
      console.error('❌ Missing required fields:', { disasterId, householdAssessmentId, householdId, packagesCount: packages?.length });
      return res.status(400).json({
        message: 'Missing required fields: disasterId, householdAssessmentId, householdId, packages array',
      });
    }

    if (packages.length === 0) {
      console.error('❌ No packages provided');
      return res.status(400).json({
        message: 'At least one package must be provided',
      });
    }

    // Validate packages structure
    for (const pkg of packages) {
      if (!pkg.name || pkg.cost === undefined) {
        console.error('❌ Invalid package structure:', pkg);
        return res.status(400).json({
          message: 'Each package must have name and cost properties',
        });
      }
    }

    // Validate and convert householdAssessmentId to ObjectId
    let assessmentId;
    try {
      if (mongoose.Types.ObjectId.isValid(householdAssessmentId)) {
        assessmentId = householdAssessmentId;
      } else {
        console.error('❌ Invalid householdAssessmentId format:', householdAssessmentId);
        return res.status(400).json({
          message: 'Invalid householdAssessmentId format',
        });
      }
    } catch (idError) {
      console.error('❌ Error validating householdAssessmentId:', idError.message);
      return res.status(400).json({
        message: 'Invalid householdAssessmentId',
        error: idError.message,
      });
    }

    // Convert tier string to aidTier enum value - MUST have a value
    let aidTier = tier ? (
      {
        'Minimal': 'Basic Support (0-3)',
        'Basic': 'Basic Support (0-3)',
        'Extended': 'Shelter + Food + Cash (4-6)',
        'Priority': 'Tent + Reconstruction + Food (7-9)',
      }[tier] || 'Basic Support (0-3)'
    ) : null;

    // Fallback: calculate from compositeScore if aidTier not set
    if (!aidTier && compositeScore !== undefined) {
      if (compositeScore >= 10) aidTier = 'Priority Reconstruction + Livelihood (10+)';
      else if (compositeScore >= 7) aidTier = 'Tent + Reconstruction + Food (7-9)';
      else if (compositeScore >= 4) aidTier = 'Shelter + Food + Cash (4-6)';
      else aidTier = 'Basic Support (0-3)';
    }

    // Ensure we have an aidTier
    if (!aidTier) {
      console.error('❌ Could not determine aidTier from tier or compositeScore');
      aidTier = 'Basic Support (0-3)'; // Default fallback
    }

    // Generate request ID
    const requestId = `AAR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Map packages to allocatedPackages format
    const allocatedPackages = packages.map((pkg, index) => ({
      packageId: pkg._id || pkg.id || `pkg-${index}`,
      packageName: pkg.name,
      quantity: 1,
      unitCost: pkg.cost,
      totalCost: pkg.cost,
      category: pkg.category || 'Aid Package',
    }));

    // Ensure createdBy is a valid ObjectId
    let createdById;
    try {
      if (req.user && req.user._id) {
        // From auth middleware - most reliable
        createdById = req.user._id;
      } else if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        createdById = user._id;
      } else if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
        createdById = user.id;
      } else {
        console.error('❌ Could not extract valid user ID from:', { userObj: user });
        return res.status(400).json({
          message: 'Could not extract valid user ID from authentication',
        });
      }
    } catch (idError) {
      console.error('❌ Error converting user ID to ObjectId:', idError.message);
      return res.status(400).json({
        message: 'Invalid user ID format',
        error: idError.message,
      });
    }

    console.log('📝 Creating allocation request with:');
    console.log('  - requestId:', requestId);
    console.log('  - disasterId:', disasterId);
    console.log('  - householdAssessmentId:', assessmentId);
    console.log('  - householdId:', householdId);
    console.log('  - packages:', packages.length);
    console.log('  - totalCost:', totalCost);
    console.log('  - createdBy:', createdById);
    console.log('  - aidTier:', aidTier);

    // Use findOneAndUpdate with upsert to prevent duplicates
    // Check if allocation already exists for this household in this disaster
    const allocationRequest = await AidAllocationRequest.findOneAndUpdate(
      {
        disasterId: new mongoose.Types.ObjectId(disasterId),
        householdAssessmentId: assessmentId,
      },
      {
        requestId, // Update or set the requestId
        householdId,
        damageLevel: damageScore || 1,
        vulnerabilityPoints: {
          incomeScore: vulnerability || 0,
        },
        compositeScore: compositeScore || 0,
        scoreBreakdown: {
          damageComponent: damageScore || 0,
          vulnerabilityComponent: vulnerability || 0,
          totalVulnerability: vulnerability || 0,
        },
        aidTier, // Now guaranteed to have a value
        allocatedPackages,
        totalEstimatedCost: totalCost || 0,
        status: 'Approved',
        isOverride: isOverridden || false,
        createdBy: createdById,
        lastModifiedBy: createdById,
      },
      {
        upsert: true, // Create if doesn't exist, update if exists
        new: true,    // Return the updated document
        runValidators: true,
      }
    );

    console.log('✓ Allocation request saved:', allocationRequest._id);
    const isNew = allocationRequest.createdAt === allocationRequest.updatedAt || 
                  (new Date(allocationRequest.updatedAt).getTime() - new Date(allocationRequest.createdAt).getTime() < 1000);
    console.log(isNew ? '✓ NEW allocation created' : '✓ EXISTING allocation updated');

    // Create expense record if totalCost > 0
    if (totalCost > 0) {
      try {
        await Expenditure.create({
          incidentId: disasterId,
          expenseType: 'Aid Allocation',
          description: `Aid allocation for household ${householdHeadName || householdId}`,
          amount: totalCost,
          status: 'recorded',
          relatedAllocationId: allocationRequest._id,
          recordedBy: createdById,
        });
        console.log('✓ Expense record created for amount:', totalCost);
      } catch (expenseError) {
        console.warn('⚠️ Failed to create expense record:', expenseError.message);
        // Don't fail the whole request if expense creation fails
      }
    }

    // Log action in audit trail
    try {
      await createAuditLog({
        action: 'ALLOCATE',
        module: 'Allocation',
        actor: user.name || user.username || 'System',
        actorRole: user.role || 'Unknown',
        affectedRecord: householdId,
        changes: {
          status: 'Approved',
          amount: totalCost,
          packages: packages.map(p => p.name),
          overridden: isOverridden,
        },
        status: 'success',
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
    console.error('   Full error:', error.errors || error);
    res.status(500).json({
      message: 'Failed to allocate aid',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? (error.errors || error.stack) : undefined,
    });
  }
}

/**
 * Auto-create household assessments from disaster damage details
 * Called when coordinator approves/verifies a disaster
 */
const createAssessmentsFromDisasterDetails = async (disasterId, householdDamageDetails, disasterData) => {
  try {
    if (!Array.isArray(householdDamageDetails) || householdDamageDetails.length === 0) {
      console.log('ℹ️ No household damage details to process for disaster:', disasterId);
      return { created: 0, skipped: 0, errors: [] };
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const detail of householdDamageDetails) {
      try {
        // Map damageLevel string to severity number
        const damageLevelMap = {
          'partial': 2,
          'severe': 3,
          'destroyed': 4,
        };
        
        const severityLevel = damageLevelMap[detail.damageLevel?.toLowerCase()] || 1;
        
        // Create damage description from assetsDamaged and needsCategory
        const damageDescription = `${detail.assetsDamaged || 'Property'} damage - ${detail.needsCategory || 'General assistance needed'}`;

        // Check if assessment already exists for this household and disaster
        const existingAssessment = await HouseholdAssessment.findOne({
          disasterId: new mongoose.Types.ObjectId(disasterId),
          householdId: detail.householdId,
          'headOfHousehold.name': detail.headName,
        });

        if (existingAssessment) {
          console.log(`ℹ️ Assessment already exists for household ${detail.headName} in disaster ${disasterId}`);
          skippedCount++;
          continue;
        }

        // Create new assessment
        const assessment = await HouseholdAssessment.create({
          disasterId: new mongoose.Types.ObjectId(disasterId),
          householdId: detail.householdId,
          headOfHousehold: {
            name: detail.headName,
            idNumber: detail.idNumber || '',
          },
          householdSize: detail.householdSize || 1,
          childrenUnder5: detail.childrenUnder5 || 0,
          monthlyIncome: detail.monthlyIncome || 0,
          incomeCategory: detail.monthlyIncome <= 3000 ? 'Low' : detail.monthlyIncome <= 10000 ? 'Middle' : 'High',
          disasterType: disasterData?.type || 'Unknown',
          damageDescription,
          damageSeverityLevel: severityLevel,
          damageDetails: {
            assetsDamaged: detail.assetsDamaged || '',
            needsCategory: detail.needsCategory || '',
          },
          location: {
            village: disasterData?.location || disasterData?.village || '',
            district: disasterData?.district || '',
          },
          assessedBy: 'System',
          createdAt: new Date(),
        });

        console.log(`✅ Created household assessment for ${detail.headName} (Household ID: ${detail.householdId})`);
        createdCount++;
      } catch (itemError) {
        console.error(`❌ Error creating assessment for household ${detail.headName}:`, itemError.message);
        errors.push({
          household: detail.headName,
          error: itemError.message,
        });
      }
    }

    console.log(`📊 Auto-creation summary: ${createdCount} created, ${skippedCount} skipped, ${errors.length} errors`);
    return { created: createdCount, skipped: skippedCount, errors };
  } catch (error) {
    console.error('❌ Error in createAssessmentsFromDisasterDetails:', error.message);
    throw error;
  }
};

export default {
  createHouseholdAssessment,
  getAssessmentsByDisaster,
  deleteHouseholdAssessment,
  updateHouseholdAssessment,
  calculateAllocationScore,
  approveAllocationRequest,
  disburseAllocationRequest,
  generateAllocationPlan,
  getAllocationPlansByDisaster,
  getAllocationRequestsByDisaster,
  getDashboardStats,
  allocateAidToHousehold,
  createAssessmentsFromDisasterDetails,
};
