/**
 * Financial Tracking Routes
 * Routes for budget allocation, expense logging, and audit trails
 */

import express from 'express';
import financialController from '../controllers/financialController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * BUDGET ROUTES
 */

/**
 * POST /api/budgets
 * Create new budget allocation
 * Role: Finance Officer, Administrator
 */
router.post('/', protect, async (req, res) => {
  try {
    // Check user role
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to create budget' });
    }
    
    await financialController.createBudget(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * GET /api/budgets/:disasterId
 * Get all budgets for a disaster
 * Role: All protectd users
 */
router.get('/:disasterId', protect, financialController.getBudgetsByDisaster);

/**
 * PUT /api/budgets/:id/approve
 * Approve budget allocation
 * Role: Finance Officer, Administrator
 */
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to approve budget' });
    }
    
    await financialController.approveBudget(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * PUT /api/budgets/:id/void
 * Void budget allocation
 * Role: Administrator
 */
router.put('/:id/void', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (user.role !== 'Administrator') {
      return res.status(403).json({ message: 'Insufficient permissions to void budget' });
    }
    
    await financialController.voidBudget(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * GET /api/budgets/:disasterId/breakdown
 * Get budget breakdown by category
 * Role: All protectd users
 */
router.get('/:disasterId/breakdown', protect, financialController.getBudgetBreakdownByDisaster);

/**
 * EXPENSE ROUTES
 */

/**
 * POST /api/expenses
 * Log new expense
 * Role: Data Clerk, Finance Officer, Coordinator
 */
router.post('/expenses', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Data Clerk', 'Finance Officer', 'Coordinator', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to log expense' });
    }
    
    await financialController.createExpense(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * GET /api/expenses/:disasterId
 * Get all expenses for a disaster
 * Role: All protectd users
 */
router.get('/expenses/:disasterId', protect, financialController.getExpensesByDisaster);

/**
 * PUT /api/expenses/:id/approve
 * Approve expense
 * Role: Finance Officer, Administrator
 */
router.put('/expenses/:id/approve', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to approve expense' });
    }
    
    await financialController.approveExpense(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * PUT /api/expenses/:id/reject
 * Reject expense
 * Role: Finance Officer, Administrator
 */
router.put('/expenses/:id/reject', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to reject expense' });
    }
    
    await financialController.rejectExpense(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * PUT /api/expenses/:id/void
 * Void expense record
 * Role: Finance Officer, Administrator
 */
router.put('/expenses/:id/void', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to void expense' });
    }
    
    await financialController.voidExpense(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * AUDIT LOG ROUTES
 */

/**
 * GET /api/auditlogs/:disasterId
 * Get audit logs for disaster
 * Role: Finance Officer, Administrator
 */
router.get('/auditlogs/:disasterId', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to view audit logs' });
    }
    
    await financialController.getAuditLogs(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

/**
 * GET /api/auditlogs/entity/:entityId/:entityType
 * Get audit trail for specific entity
 * Role: Finance Officer, Administrator
 */
router.get('/auditlogs/entity/:entityId/:entityType', protect, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.user || '{}');
    if (!['Finance Officer', 'Administrator'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions to view audit logs' });
    }
    
    await financialController.getEntityAuditTrail(req, res);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ message: 'Route error', error: error.message });
  }
});

export default router;
