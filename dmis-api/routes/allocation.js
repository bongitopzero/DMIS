/**
 * Allocation Routes
 * Handles household assessments, aid allocation requests, and plan generation
 * 
 * WORKFLOW ENFORCEMENT:
 * - STEP 1: Approval (Finance Officer only)
 *   POST /requests/{id}/approve → Proposed → Pending Approval → Approved
 * - STEP 2: Disbursement (Finance Officer only)
 *   PUT /requests/{id}/disburse → Approved → Disbursed
 * - AUDIT LOG: View complete workflow history
 *   GET /requests/{id}/audit-log → All status transitions & approvals
 */

import express from 'express';
import allocationController from '../controllers/allocationController.js';
import { protect } from '../middleware/auth.js';
import {
  validateAllocationRequest,
  validateBudgetAvailability,
  checkAllocationPermissions,
  requireFinanceOfficer,
  validateStatusTransition,
  logAllocationAction,
} from '../middleware/allocationValidation.js';

const router = express.Router();

/**
 * GET /api/allocation/packages
 * Get predefined assistance packages from database
 * Role: All authenticated users
 */
router.get('/packages', protect, (req, res) => {
  allocationController.getAssistancePackages(req, res);
});

router.get('/summary', protect, (req, res) => {
  allocationController.getGlobalAllocationSummary(req, res);
});

router.get('/disaster-summary', protect, (req, res) => {
  allocationController.getAllocationDisasterSummary(req, res);
});

/**
 * HOUSEHOLD ASSESSMENT ROUTES
 */
router.post('/assessments', protect, async (req, res) => {
  try {
    const user = req.headers.user
      ? JSON.parse(req.headers.user)
      : req.user || {};
    if (!['Data Clerk', 'Coordinator', 'Administrator'].includes(user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions to create assessments',
      });
    }

    await allocationController.createHouseholdAssessment(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * GET /api/allocation/assessments/:disasterId
 * Get all assessments for a disaster
 * Role: All authenticated users
 */
router.get('/assessments/:disasterId', protect, (req, res) => {
  allocationController.getAssessmentsByDisaster(req, res);
});

/**
 * DELETE /api/allocation/assessments/:assessmentId
 * Delete household assessment
 * Role: Data Clerk, Coordinator, Administrator
 */
router.delete('/assessments/:assessmentId', protect, async (req, res) => {
  try {
    const user = req.headers.user
      ? JSON.parse(req.headers.user)
      : req.user || {};
    if (!['Data Clerk', 'Coordinator', 'Administrator'].includes(user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions to delete assessments',
      });
    }

    await allocationController.deleteHouseholdAssessment(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * PUT /api/allocation/assessments/:assessmentId
 * Update household assessment
 * Role: Data Clerk, Coordinator, Administrator
 */
router.put('/assessments/:assessmentId', protect, async (req, res) => {
  try {
    const user = req.headers.user
      ? JSON.parse(req.headers.user)
      : req.user || {};
    if (!['Data Clerk', 'Coordinator', 'Administrator'].includes(user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions to update assessments',
      });
    }

    await allocationController.updateHouseholdAssessment(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * SCORING & ALLOCATION REQUEST ROUTES
 */

/**
 * POST /api/allocation/calculate-score
 * Calculate allocation score for assessment
 * Role: Finance Officer, Coordinator, Administrator
 */
router.post('/calculate-score', protect, (req, res) => {
  const user = req.headers.user
    ? JSON.parse(req.headers.user)
    : req.user || {};
  if (!['Finance Officer', 'Coordinator', 'Administrator'].includes(user.role)) {
    return res.status(403).json({
      message: 'Insufficient permissions',
    });
  }

  allocationController.calculateAllocationScore(req, res);
});

/**
 * POST /api/allocation/create-request
 * Create aid allocation request
 * Role: Finance Officer, Coordinator, Administrator
 */
router.post(
  '/create-request',
  protect,
  validateAllocationRequest,
  validateBudgetAvailability,
  logAllocationAction('CREATE'),
  (req, res) => {
    const user = req.headers.user
      ? JSON.parse(req.headers.user)
      : req.user || {};
    if (!['Finance Officer', 'Coordinator', 'Administrator'].includes(user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions to create allocation requests',
      });
    }

    // Check budget status and warn if critical
    if (req.budgetInfo?.budgetCritical) {
      console.warn(`Budget critical warning for allocation - ${req.budgetInfo.remainingBudget} remaining`);
    }

    allocationController.createAllocationRequest(req, res);
  }
);

/**
 * POST /api/allocation/allocate
 * Allocate aid to a household directly from allocation plan
 * Role: Finance Officer, Coordinator, Administrator
 */
router.post('/allocate', protect, validateBudgetAvailability, logAllocationAction('ALLOCATE'), (req, res) => {
  const user = req.headers.user
    ? JSON.parse(req.headers.user)
    : req.user || {};
  if (!['Finance Officer', 'Coordinator', 'Administrator'].includes(user.role)) {
    return res.status(403).json({
      message: 'Insufficient permissions to allocate aid',
    });
  }

  allocationController.allocateAidToHousehold(req, res);
});

/**
 * PUT /api/allocation/requests/:requestId/approve
 * STEP 1: Approve allocation request (Finance Officer ONLY)
 * Strict workflow: Proposed → Pending Approval → Approved
 * Audit logs BOTH transitions:
 *   - "Moved to Pending Approval"
 *   - "Approved by Finance Officer"
 * 
 * Role: Finance Officer ONLY
 * Status: Proposed or Pending Approval required
 */
router.put(
  '/requests/:requestId/approve',
  protect,
  requireFinanceOfficer,
  validateStatusTransition,
  (req, res) => {
    // requireFinanceOfficer middleware ensures only Finance Officers reach here
    allocationController.approveAllocationRequest(req, res);
  }
);

/**
 * PUT /api/allocation/requests/:requestId/disburse
 * STEP 2: Disburse allocation (Finance Officer ONLY)
 * Strict workflow: Approved → Disbursed
 * Audit log: "Funds Disbursed"
 * 
 * Role: Finance Officer ONLY
 * Status: Approved REQUIRED
 */
router.put(
  '/requests/:requestId/disburse',
  protect,
  requireFinanceOfficer,
  validateStatusTransition,
  (req, res) => {
    // requireFinanceOfficer middleware ensures only Finance Officers reach here
    allocationController.disburseAllocationRequest(req, res);
  }
);

/**
 * GET /api/allocation/requests/:requestId/audit-log
 * Retrieve complete audit log for allocation request
 * Shows workflow history: creation, approval steps, disbursement
 * 
 * Role: Finance Officer, Coordinator, Administrator (all can view)
 */
router.get('/requests/:requestId/audit-log', protect, (req, res) => {
  allocationController.getAuditLogForRequest(req, res);
});

/**
 * ALLOCATION PLAN ROUTES
 */

/**
 * POST /api/allocation/plans
 * Generate allocation plan
 * Role: Finance Officer, Administrator
 */
router.post('/plans', protect, (req, res) => {
  const user = req.headers.user
    ? JSON.parse(req.headers.user)
    : req.user || {};
  if (!['Finance Officer', 'Administrator'].includes(user.role)) {
    return res.status(403).json({
      message: 'Insufficient permissions',
    });
  }

  allocationController.generateAllocationPlan(req, res);
});

/**
 * GET /api/allocation/plans/:disasterId
 * Get allocation plans for disaster
 * Role: All authenticated users
 */
router.get('/plans/:disasterId', protect, (req, res) => {
  allocationController.getAllocationPlansByDisaster(req, res);
});

/**
 * GET /api/allocation/requests/:disasterId
 * Get all allocation requests for a disaster
 * Role: All authenticated users
 */
router.get('/requests/:disasterId', protect, (req, res) => {
  allocationController.getAllocationRequestsByDisaster(req, res);
});

/**
 * DASHBOARD ROUTES
 */

/**
 * GET /api/allocation/dashboard-stats/:disasterId
 * Get dashboard statistics
 * Role: All authenticated users
 */
router.get('/dashboard-stats/:disasterId', protect, (req, res) => {
  allocationController.getDashboardStats(req, res);
});

/**
 * GET /api/allocation/summary
 * Get global allocation totals across all disasters
 */


/**
 * POST /api/allocation/approve-ineligible-disaster
 * Approve a disaster assessment when NO households are eligible for aid
 * Creates marker record so disaster appears as "processed" in summary dashboard
 * Allows disasters with no eligible households to move to summary after assessment
 * 
 * Role: Finance Officer, Coordinator, Administrator
 */
router.post(
  '/approve-ineligible-disaster',
  protect,
  checkAllocationPermissions(['Finance Officer', 'Coordinator', 'Administrator']),
  (req, res) => {
    allocationController.approveDisasterAssessmentNoAllocation(req, res);
  }
);


export default router;
