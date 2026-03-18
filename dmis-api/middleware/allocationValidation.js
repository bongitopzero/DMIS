/**
 * Allocation Validation Middleware
 * Validates allocation requests and tracks budget constraints
 */

import mongoose from 'mongoose';
import BudgetAllocation from '../models/BudgetAllocation.js';
import AidAllocationRequest from '../models/AidAllocationRequest.js';
import HouseholdAssessment from '../models/HouseholdAssessment.js';

/**
 * Validate allocation request creation
 */
export const validateAllocationRequest = async (req, res, next) => {
  try {
    const { assessmentId, disasterId } = req.body;

    // Check required fields
    if (!assessmentId || !disasterId) {
      return res.status(400).json({
        message: 'Assessment ID and Disaster ID are required',
        errors: {
          assessmentId: !assessmentId ? 'Assessment ID is required' : null,
          disasterId: !disasterId ? 'Disaster ID is required' : null,
        },
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(assessmentId) || !mongoose.Types.ObjectId.isValid(disasterId)) {
      return res.status(400).json({
        message: 'Invalid Assessment ID or Disaster ID format',
      });
    }

    // Check if assessment exists
    const assessment = await HouseholdAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        message: 'Household assessment not found',
      });
    }

    // Check if assessment has already been allocated
    const existingRequest = await AidAllocationRequest.findOne({
      householdAssessmentId: assessmentId,
      status: { $in: ['Approved', 'Disbursed'] },
    });

    if (existingRequest) {
      return res.status(409).json({
        message: 'This household has already been allocated',
        existingRequestId: existingRequest.requestId,
      });
    }

    // Check if assessment is in proper status for allocation
    if (assessment.status !== 'Pending' && assessment.status !== 'Allocated') {
      return res.status(400).json({
        message: `Cannot allocate household with status: ${assessment.status}`,
        currentStatus: assessment.status,
        allowedStatuses: ['Pending', 'Allocated'],
      });
    }

    // Attach validated data to request
    req.validatedData = {
      assessment,
      assessmentId,
      disasterId,
    };

    next();
  } catch (error) {
    console.error('Allocation validation error:', error);
    res.status(500).json({
      message: 'Allocation validation failed',
      error: error.message,
    });
  }
};

/**
 * Validate budget availability for allocation
 */
export const validateBudgetAvailability = async (req, res, next) => {
  try {
    const { disasterId } = req.body;

    if (!disasterId) {
      return next();
    }

    // Get total approved budget for disaster
    const totalBudget = await BudgetAllocation.aggregate([
      {
        $match: {
          disasterId: new mongoose.Types.ObjectId(disasterId),
          approvalStatus: 'Approved',
          isVoided: false,
        },
      },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$allocatedAmount' },
        },
      },
    ]);

    // Get total committed allocations
    const committedAllocations = await AidAllocationRequest.aggregate([
      {
        $match: {
          disasterId: new mongoose.Types.ObjectId(disasterId),
          status: { $in: ['Proposed', 'Approved', 'Disbursed'] },
        },
      },
      {
        $group: {
          _id: null,
          totalCommitted: { $sum: '$totalEstimatedCost' },
        },
      },
    ]);

    const budgetAmount = totalBudget[0]?.totalBudget || 0;
    const committedAmount = committedAllocations[0]?.totalCommitted || 0;

    // Attach budget info to request
    req.budgetInfo = {
      totalBudget: budgetAmount,
      committedAmount: committedAmount,
      remainingBudget: budgetAmount - committedAmount,
      budgetHealthy: committedAmount <= (budgetAmount * 0.9),
      budgetWarning: committedAmount > (budgetAmount * 0.7) && committedAmount <= (budgetAmount * 0.9),
      budgetCritical: committedAmount > (budgetAmount * 0.9),
    };

    next();
  } catch (error) {
    console.error('Budget validation error:', error);
    res.status(500).json({
      message: 'Budget validation failed',
      error: error.message,
    });
  }
};

/**
 * Check allocation approval permissions
 */
export const checkAllocationPermissions = (requiredRole) => {
  return (req, res, next) => {
    const user = req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!user.role || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions for this action',
        requiredRole: allowedRoles,
        userRole: user.role,
      });
    }

    next();
  };
};

/**
 * Validate allocation request status transition
 */
export const validateStatusTransition = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    let { targetStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        message: 'Invalid allocation request ID format',
      });
    }

    const request = await AidAllocationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        message: 'Allocation request not found',
      });
    }

    // Define valid status transitions
    const validTransitions = {
      Proposed: ['Approved', 'Rejected'],
      'Pending Approval': ['Approved', 'Rejected'],
      Approved: ['Disbursed', 'Rejected'],
      Disbursed: [],
      Rejected: [],
    };

    // Infer target status from endpoint if not provided
    if (!targetStatus) {
      const pathname = req.path || req.baseUrl;
      if (pathname.includes('approve')) targetStatus = 'Approved';
      else if (pathname.includes('disburse')) targetStatus = 'Disbursed';
      else if (pathname.includes('reject')) targetStatus = 'Rejected';
    }

    const currentStatus = request.status;
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (targetStatus && !allowedTransitions.includes(targetStatus)) {
      return res.status(400).json({
        message: `Invalid status transition from ${currentStatus} to ${targetStatus}`,
        currentStatus,
        allowedTransitions,
      });
    }

    // Attach request to req for next middleware
    req.allocationRequest = request;

    next();
  } catch (error) {
    console.error('Status transition validation error:', error);
    res.status(500).json({
      message: 'Status transition validation failed',
      error: error.message,
    });
  }
};

/**
 * Log allocation action for audit trail
 */
export const logAllocationAction = (actionType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to log after response
    res.json = async function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Success response - log the action
        const AuditLog = (await import('../models/AuditLog.js')).default;
        const user = req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});

        try {
          AuditLog.create({
            action: `ALLOCATION_${actionType.toUpperCase()}`,
            actorId: user.id || null,
            actorRole: user.role || 'Unknown',
            entityType: 'AidAllocationRequest',
            entityId: req.params.requestId || req.body.assessmentId || null,
            details: {
              actionType,
              statusBefore: req.allocationRequest?.status,
              statusAfter: req.body.status,
              timestamp: new Date(),
            },
          }).catch(err => console.error('Audit log creation error:', err));
        } catch (err) {
          console.error('Error logging allocation action:', err);
        }
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

export default {
  validateAllocationRequest,
  validateBudgetAvailability,
  checkAllocationPermissions,
  validateStatusTransition,
  logAllocationAction,
};
