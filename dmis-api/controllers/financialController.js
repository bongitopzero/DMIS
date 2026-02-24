/**
 * Financial Controller
 * Handles budget allocation, expense logging, and audit trails
 */

import BudgetAllocation from '../models/BudgetAllocation.js';
import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';
import Disaster from '../models/Disaster.js';
import {
  getTotalSpentByCategory,
  getRemainingBudget,
  validateBudgetExists,
  checkDuplicateInvoice,
  validateExpenseAgainstBudget,
  checkBudgetOverrun,
  getTotalBudgetByDisaster,
  getTotalSpendingByDisaster,
  getBudgetBreakdown,
  createAuditLog,
  getAuditTrail,
  getDisasterAuditLogs,
  trackChanges,
} from '../utils/financialUtils.js';

/**
 * @POST /budgets
 * Create new budget allocation
 */
const createBudget = async (req, res) => {
  try {
    const { disasterId, category, allocatedAmount, approvedBy, approvalDate, description } = req.body;

    // Validate disaster exists
    const disaster = await Disaster.findById(disasterId);
    if (!disaster) {
      return res.status(404).json({ message: 'Disaster not found' });
    }

    // Validate amount
    if (allocatedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check if budget already exists for this category and disaster
    const existingBudget = await BudgetAllocation.findOne({
      disasterId,
      category,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (existingBudget) {
      return res.status(400).json({
        message: `Budget already exists for ${category}. Create a new allocation for modifications.`,
      });
    }

    // Create budget
    const budget = new BudgetAllocation({
      disasterId,
      category,
      allocatedAmount,
      approvedBy,
      approvalDate,
      approvalStatus: 'Pending',
      createdBy: req.user?.id || req.body.createdBy || 'System',
      description,
      fiscalYear: new Date().getFullYear().toString(),
    });

    await budget.save();

    // Create audit log
    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId: disasterId,
      performedBy: req.user?.id || req.body.createdBy || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      newValues: budget.toObject(),
      reason: 'Budget allocation created',
    });

    res.status(201).json({
      message: 'Budget created successfully (pending approval)',
      budget,
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Error creating budget', error: error.message });
  }
};

/**
 * @GET /budgets/:disasterId
 * Get all budgets for a disaster
 */
const getBudgetsByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status, category } = req.query;

    let query = { disasterId, isVoided: false };
    if (status) query.approvalStatus = status;
    if (category) query.category = category;

    const budgets = await BudgetAllocation.find(query).sort({ createdAt: -1 });

    // Calculate totals
    const totalBudget = await getTotalBudgetByDisaster(disasterId);
    const totalSpent = await getTotalSpendingByDisaster(disasterId);
    const breakdown = await getBudgetBreakdown(disasterId);

    res.status(200).json({
      budgets,
      summary: {
        totalBudget,
        totalSpent,
        percentageUsed: (totalSpent / totalBudget) * 100,
        remainingBudget: totalBudget - totalSpent,
      },
      breakdown,
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ message: 'Error fetching budgets', error: error.message });
  }
};

/**
 * @PUT /budgets/:id/approve
 * Approve budget allocation
 */
const approveBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const budget = await BudgetAllocation.findById(id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.approvalStatus === 'Approved') {
      return res.status(400).json({ message: 'Budget is already approved' });
    }

    const oldValues = budget.toObject();

    // Update budget
    budget.approvalStatus = 'Approved';
    budget.approvalDate = new Date();
    budget.approvedBy = req.user?.id || req.body.approverId || 'System';

    await budget.save();

    // Create audit log
    await createAuditLog({
      actionType: 'APPROVE',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId: budget.disasterId,
      performedBy: req.user?.id || req.body.approverId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues: oldValues,
      newValues: budget.toObject(),
      changes: trackChanges(oldValues, budget.toObject()),
      reason: approvalNotes || 'Budget approved',
    });

    res.status(200).json({
      message: 'Budget approved successfully',
      budget,
    });
  } catch (error) {
    console.error('Error approving budget:', error);
    res.status(500).json({ message: 'Error approving budget', error: error.message });
  }
};

/**
 * @PUT /budgets/:id/void
 * Void budget allocation
 */
const voidBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Void reason is required' });
    }

    const budget = await BudgetAllocation.findById(id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.isVoided) {
      return res.status(400).json({ message: 'Budget is already voided' });
    }

    const oldValues = budget.toObject();

    // Void budget
    budget.isVoided = true;
    budget.voidReason = reason;
    budget.voidedBy = req.user?.id || req.body.userId || 'System';
    budget.voidedAt = new Date();

    await budget.save();

    // Create audit log
    await createAuditLog({
      actionType: 'VOID',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId: budget.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      oldValues: oldValues,
      newValues: budget.toObject(),
      reason: reason,
    });

    res.status(200).json({
      message: 'Budget voided successfully',
      budget,
    });
  } catch (error) {
    console.error('Error voiding budget:', error);
    res.status(500).json({ message: 'Error voiding budget', error: error.message });
  }
};

/**
 * @POST /expenses
 * Log new expense
 */
const createExpense = async (req, res) => {
  try {
    const {
      disasterId,
      category,
      vendorName,
      vendorRegistrationNumber,
      invoiceNumber,
      bankReferenceNumber,
      amount,
      supportingDocumentUrl,
      paymentMethod,
      receipientName,
      receipientBankAccount,
      description,
    } = req.body;

    // Validate disaster exists
    const disaster = await Disaster.findById(disasterId);
    if (!disaster) {
      return res.status(404).json({ message: 'Disaster not found' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check for duplicate invoice
    try {
      await checkDuplicateInvoice(vendorName, invoiceNumber, disasterId);
    } catch (error) {
      return res.status(409).json({ message: error.message });
    }

    // Validate budget exists for category
    try {
      await validateBudgetExists(disasterId, category);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    // Validate expense against budget
    try {
      await validateExpenseAgainstBudget(disasterId, category, amount);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    // Create expense
    const expense = new Expense({
      disasterId,
      category,
      vendorName: vendorName.trim(),
      vendorRegistrationNumber: vendorRegistrationNumber.trim(),
      invoiceNumber: invoiceNumber.trim(),
      bankReferenceNumber: bankReferenceNumber?.trim() || null,
      amount,
      supportingDocumentUrl: supportingDocumentUrl || null,
      loggedBy: req.user?.id || req.body.userId || 'System',
      status: 'Pending',
      paymentMethod: paymentMethod || 'Bank Transfer',
      receipientName: receipientName?.trim() || null,
      receipientBankAccount: receipientBankAccount?.trim() || null,
      description: description?.trim() || null,
    });

    await expense.save();

    // Create audit log
    await createAuditLog({
      actionType: 'CREATE',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      newValues: expense.toObject(),
      reason: `Expense logged for ${category}`,
    });

    res.status(201).json({
      message: 'Expense logged successfully (pending approval)',
      expense,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Error creating expense', error: error.message });
  }
};

/**
 * @GET /expenses/:disasterId
 * Get all expenses for a disaster
 */
const getExpensesByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status, category } = req.query;

    let query = { disasterId, isVoided: false };
    if (status) query.status = status;
    if (category) query.category = category;

    const expenses = await Expense.find(query).sort({ createdAt: -1 });

    // Get summary
    const totalSpent = expenses
      .filter(e => e.status === 'Approved')
      .reduce((sum, e) => sum + e.amount, 0);

    const pending = expenses
      .filter(e => e.status === 'Pending')
      .reduce((sum, e) => sum + e.amount, 0);

    res.status(200).json({
      expenses,
      summary: {
        totalApproved: totalSpent,
        totalPending: pending,
        totalExpenses: expenses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/approve
 * Approve expense
 */
const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status === 'Approved') {
      return res.status(400).json({ message: 'Expense is already approved' });
    }

    // Check if supporting document exists
    if (!expense.supportingDocumentUrl) {
      return res.status(400).json({
        message: 'Cannot approve expense without supporting documentation',
      });
    }

    // Check budget overrun
    try {
      await checkBudgetOverrun(expense.disasterId, expense.category, expense.amount);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const oldValues = expense.toObject();

    // Approve expense
    expense.status = 'Approved';
    expense.approvalDate = new Date();
    expense.approvedBy = req.user?.id || req.body.approverId || 'System';

    await expense.save();

    // Create audit log
    await createAuditLog({
      actionType: 'APPROVE',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.approverId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues: oldValues,
      newValues: expense.toObject(),
      changes: trackChanges(oldValues, expense.toObject()),
      reason: approvalNotes || 'Expense approved',
    });

    // Get updated budget
    const remainingBudget = await getRemainingBudget(expense.disasterId, expense.category);

    res.status(200).json({
      message: 'Expense approved successfully',
      expense,
      budgetStatus: remainingBudget,
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ message: 'Error approving expense', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/reject
 * Reject expense
 */
const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending expenses can be rejected' });
    }

    const oldValues = expense.toObject();

    // Reject expense
    expense.status = 'Rejected';
    expense.rejectionReason = rejectionReason;

    await expense.save();

    // Create audit log
    await createAuditLog({
      actionType: 'REJECT',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues: oldValues,
      newValues: expense.toObject(),
      reason: rejectionReason,
    });

    res.status(200).json({
      message: 'Expense rejected successfully',
      expense,
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ message: 'Error rejecting expense', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/void
 * Void expense record
 */
const voidExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Void reason is required' });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.isVoided) {
      return res.status(400).json({ message: 'Expense is already voided' });
    }

    const oldValues = expense.toObject();

    // Void expense
    expense.isVoided = true;
    expense.voidReason = reason;
    expense.voidedBy = req.user?.id || req.body.userId || 'System';
    expense.voidedAt = new Date();

    await expense.save();

    // Create audit log
    await createAuditLog({
      actionType: 'VOID',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      oldValues: oldValues,
      newValues: expense.toObject(),
      reason: reason,
    });

    res.status(200).json({
      message: 'Expense voided successfully',
      expense,
    });
  } catch (error) {
    console.error('Error voiding expense:', error);
    res.status(500).json({ message: 'Error voiding expense', error: error.message });
  }
};

/**
 * @GET /auditlogs/:disasterId
 * Get audit trail for disaster
 */
const getAuditLogs = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { limit = 100 } = req.query;

    const logs = await getDisasterAuditLogs(disasterId, parseInt(limit));

    res.status(200).json({
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};

/**
 * @GET /auditlogs/entity/:entityId/:entityType
 * Get audit trail for specific entity
 */
const getEntityAuditTrail = async (req, res) => {
  try {
    const { entityId, entityType } = req.params;

    const logs = await getAuditTrail(entityId, entityType);

    res.status(200).json({
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching entity audit trail:', error);
    res
      .status(500)
      .json({ message: 'Error fetching audit trail', error: error.message });
  }
};

/**
 * @GET /budgets/:disasterId/breakdown
 * Get budget breakdown by category
 */
const getBudgetBreakdownByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;

    const breakdown = await getBudgetBreakdown(disasterId);
    const totalBudget = await getTotalBudgetByDisaster(disasterId);
    const totalSpent = await getTotalSpendingByDisaster(disasterId);

    res.status(200).json({
      breakdown,
      totalAllocated: totalBudget,
      totalSpent: totalSpent,
      percentageUsed: (totalSpent / totalBudget) * 100,
      remainingBudget: totalBudget - totalSpent,
    });
  } catch (error) {
    console.error('Error getting budget breakdown:', error);
    res.status(500).json({ message: 'Error getting budget breakdown', error: error.message });
  }
}

export default {
  createBudget: createBudget,
  getBudgetsByDisaster: getBudgetsByDisaster,
  approveBudget: approveBudget,
  voidBudget: voidBudget,
  getBudgetBreakdownByDisaster: getBudgetBreakdownByDisaster,
  createExpense: createExpense,
  getExpensesByDisaster: getExpensesByDisaster,
  approveExpense: approveExpense,
  rejectExpense: rejectExpense,
  voidExpense: voidExpense,
  getAuditLogs: getAuditLogs,
  getEntityAuditTrail: getEntityAuditTrail,
};
