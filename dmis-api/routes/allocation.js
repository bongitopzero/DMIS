/**
 * Allocation Routes
 * Handles household assessments, aid allocation requests, and plan generation
 */

import express from 'express';
import allocationController from '../controllers/allocationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * HOUSEHOLD ASSESSMENT ROUTES
 */

/**
 * POST /api/allocation/assessments
 * Create household assessment
 * Role: Data Clerk, Coordinator
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
 * Role: Finance Officer, Administrator
 */
router.post('/create-request', protect, (req, res) => {
  const user = req.headers.user
    ? JSON.parse(req.headers.user)
    : req.user || {};
  if (!['Finance Officer', 'Administrator'].includes(user.role)) {
    return res.status(403).json({
      message: 'Insufficient permissions to create allocation requests',
    });
  }

  allocationController.createAllocationRequest(req, res);
});

/**
 * PUT /api/allocation/requests/:requestId/approve
 * Approve allocation request
 * Role: Finance Officer, Administrator
 */
router.put('/requests/:requestId/approve', protect, (req, res) => {
  const user = req.headers.user
    ? JSON.parse(req.headers.user)
    : req.user || {};
  if (!['Finance Officer', 'Administrator'].includes(user.role)) {
    return res.status(403).json({
      message: 'Insufficient permissions to approve allocations',
    });
  }

  allocationController.approveAllocationRequest(req, res);
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

export default router;
