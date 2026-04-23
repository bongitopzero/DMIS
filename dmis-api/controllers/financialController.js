/**
 * Financial Controller
 * Handles budget allocation and audit trails
 */

import BudgetAllocation from '../models/BudgetAllocation.js';
import Budget from '../models/Budget.js';
import AuditLog from '../models/AuditLog.js';
import Disaster from '../models/Disaster.js';
import Expense from '../models/Expense.js';
import AidAllocationRequest from '../models/AidAllocationRequest.js';
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
  trackAllocationBudgetImpact,
  getAllocationSummary,
} from '../utils/financialUtils.js';

/**
 * @POST /budgets
 * Create new budget allocation
 */
const createBudget = async (req, res) => {
  try {
    const { disasterId, category, allocatedAmount, approvedBy, approvalDate, description } = req.body;

    const disaster = await Disaster.findById(disasterId);
    if (!disaster) return res.status(404).json({ message: 'Disaster not found' });

    if (allocatedAmount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    const existingBudget = await BudgetAllocation.findOne({
      disasterId,
      category,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (existingBudget) {
      return res.status(400).json({ message: `Budget already exists for ${category}.` });
    }

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

    await createAuditLog({
      action: 'CREATE',
      actionType: 'CREATE',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId,
      performedBy: req.user?.id || req.body.createdBy || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      newValues: budget.toObject(),
      reason: 'Budget allocation created',
    });

    res.status(201).json({ message: 'Budget created successfully (pending approval)', budget });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Error creating budget', error: error.message });
  }
};

/**
 * @POST /budgets/national
 * Create or update national budget
 */
const createNationalBudget = async (req, res) => {
  try {
    const { amount, fiscalYear } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });
    if (!fiscalYear) return res.status(400).json({ message: 'Fiscal year is required' });

    let fiscalYearNum;
    if (fiscalYear.includes('/')) {
      fiscalYearNum = parseInt(fiscalYear.split('/')[0]);
    } else {
      fiscalYearNum = parseInt(fiscalYear);
    }

    if (isNaN(fiscalYearNum)) return res.status(400).json({ message: 'Invalid fiscal year format' });

    const existingBudget = await Budget.findOne({ fiscalYear: fiscalYearNum });

    if (existingBudget) {
      const oldValues = existingBudget.toObject();
      existingBudget.allocatedBudget = amount;
      existingBudget.remainingBudget = amount - existingBudget.committedFunds - existingBudget.spentFunds;
      existingBudget.lastUpdated = new Date();

      await existingBudget.save();

      await createAuditLog({
        action: 'UPDATE',
        actionType: 'UPDATE',
        entityType: 'NationalBudget',
        entityId: existingBudget._id,
        performedBy: req.user?.id || req.body.createdBy || 'System',
        performerRole: req.user?.role || 'Finance Officer',
        previousValues: oldValues,
        newValues: existingBudget.toObject(),
        reason: `National budget updated for fiscal year ${fiscalYear}`,
      });

      return res.status(200).json({ message: 'National budget updated successfully', budget: existingBudget });
    } else {
      const budget = new Budget({
        fiscalYear: fiscalYearNum,
        allocatedBudget: amount,
        remainingBudget: amount,
      });

      await budget.save();

      await createAuditLog({
        action: 'CREATE',
        actionType: 'CREATE',
        entityType: 'NationalBudget',
        entityId: budget._id,
        performedBy: req.user?.id || req.body.createdBy || 'System',
        performerRole: req.user?.role || 'Finance Officer',
        newValues: budget.toObject(),
        reason: `National budget created for fiscal year ${fiscalYear}`,
      });

      return res.status(201).json({ message: 'National budget created successfully', budget });
    }
  } catch (error) {
    console.error('Error creating/updating national budget:', error);
    res.status(500).json({ message: 'Error saving national budget', error: error.message });
  }
};

/**
 * @GET /budgets/:disasterId
 */
const getBudgetsByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status, category } = req.query;

    let query = { disasterId, isVoided: false };
    if (status) query.approvalStatus = status;
    if (category) query.category = category;

    const budgets = await BudgetAllocation.find(query).sort({ createdAt: -1 });
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
 */
const approveBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const budget = await BudgetAllocation.findById(id);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.approvalStatus === 'Approved') return res.status(400).json({ message: 'Budget is already approved' });

    const oldValues = budget.toObject();
    budget.approvalStatus = 'Approved';
    budget.approvalDate = new Date();
    budget.approvedBy = req.user?.id || req.body.approverId || 'System';

    await budget.save();

    await createAuditLog({
      action: 'APPROVE',
      actionType: 'APPROVE',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId: budget.disasterId,
      performedBy: req.user?.id || req.body.approverId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues,
      newValues: budget.toObject(),
      changes: trackChanges(oldValues, budget.toObject()),
      reason: approvalNotes || 'Budget approved',
    });

    res.status(200).json({ message: 'Budget approved successfully', budget });
  } catch (error) {
    console.error('Error approving budget:', error);
    res.status(500).json({ message: 'Error approving budget', error: error.message });
  }
};

/**
 * @PUT /budgets/:id/void
 */
const voidBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ message: 'Void reason is required' });

    const budget = await BudgetAllocation.findById(id);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.isVoided) return res.status(400).json({ message: 'Budget is already voided' });

    const oldValues = budget.toObject();
    budget.isVoided = true;
    budget.voidReason = reason;
    budget.voidedBy = req.user?.id || req.body.userId || 'System';
    budget.voidedAt = new Date();

    await budget.save();

    await createAuditLog({
      action: 'VOID',
      actionType: 'VOID',
      entityType: 'Budget',
      entityId: budget._id,
      disasterId: budget.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      oldValues,
      newValues: budget.toObject(),
      reason,
    });

    res.status(200).json({ message: 'Budget voided successfully', budget });
  } catch (error) {
    console.error('Error voiding budget:', error);
    res.status(500).json({ message: 'Error voiding budget', error: error.message });
  }
};

/**
 * @POST /expenses
 */
const createExpense = async (req, res) => {
  try {
    const {
      disasterId, category, vendorName, vendorRegistrationNumber, invoiceNumber,
      bankReferenceNumber, amount, supportingDocumentUrl, paymentMethod,
      receipientName, receipientBankAccount, description,
    } = req.body;

    const disaster = await Disaster.findById(disasterId);
    if (!disaster) return res.status(404).json({ message: 'Disaster not found' });
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    try { await checkDuplicateInvoice(vendorName, invoiceNumber, disasterId); }
    catch (error) { return res.status(409).json({ message: error.message }); }

    try { await validateBudgetExists(disasterId, category); }
    catch (error) { return res.status(400).json({ message: error.message }); }

    try { await validateExpenseAgainstBudget(disasterId, category, amount); }
    catch (error) { return res.status(400).json({ message: error.message }); }

    const expense = new Expense({
      disasterId, category,
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

    await createAuditLog({
      action: 'CREATE',
      actionType: 'CREATE',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      newValues: expense.toObject(),
      reason: `Expense logged for ${category}`,
    });

    res.status(201).json({ message: 'Expense logged successfully (pending approval)', expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Error creating expense', error: error.message });
  }
};

/**
 * @GET /expenses/:disasterId
 */
const getExpensesByDisaster = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status, category } = req.query;

    let query = { disasterId, isVoided: false };
    if (status) query.status = status;
    if (category) query.category = category;

    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    const totalSpent = expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0);
    const pending = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);

    res.status(200).json({ expenses, summary: { totalApproved: totalSpent, totalPending: pending, totalExpenses: expenses.length } });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/approve
 */
const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status === 'Approved') return res.status(400).json({ message: 'Expense is already approved' });
    if (!expense.supportingDocumentUrl) return res.status(400).json({ message: 'Cannot approve expense without supporting documentation' });

    try { await checkBudgetOverrun(expense.disasterId, expense.category, expense.amount); }
    catch (error) { return res.status(400).json({ message: error.message }); }

    const oldValues = expense.toObject();
    expense.status = 'Approved';
    expense.approvalDate = new Date();
    expense.approvedBy = req.user?.id || req.body.approverId || 'System';

    await expense.save();

    await createAuditLog({
      action: 'APPROVE',
      actionType: 'APPROVE',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.approverId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues,
      newValues: expense.toObject(),
      changes: trackChanges(oldValues, expense.toObject()),
      reason: approvalNotes || 'Expense approved',
    });

    const remainingBudget = await getRemainingBudget(expense.disasterId, expense.category);
    res.status(200).json({ message: 'Expense approved successfully', expense, budgetStatus: remainingBudget });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ message: 'Error approving expense', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/reject
 */
const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) return res.status(400).json({ message: 'Rejection reason is required' });

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'Pending') return res.status(400).json({ message: 'Only pending expenses can be rejected' });

    const oldValues = expense.toObject();
    expense.status = 'Rejected';
    expense.rejectionReason = rejectionReason;

    await expense.save();

    await createAuditLog({
      action: 'REJECT',
      actionType: 'REJECT',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Finance Officer',
      oldValues,
      newValues: expense.toObject(),
      reason: rejectionReason,
    });

    res.status(200).json({ message: 'Expense rejected successfully', expense });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ message: 'Error rejecting expense', error: error.message });
  }
};

/**
 * @PUT /expenses/:id/void
 */
const voidExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ message: 'Void reason is required' });

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.isVoided) return res.status(400).json({ message: 'Expense is already voided' });

    const oldValues = expense.toObject();
    expense.isVoided = true;
    expense.voidReason = reason;
    expense.voidedBy = req.user?.id || req.body.userId || 'System';
    expense.voidedAt = new Date();

    await expense.save();

    await createAuditLog({
      action: 'VOID',
      actionType: 'VOID',
      entityType: 'Expense',
      entityId: expense._id,
      disasterId: expense.disasterId,
      performedBy: req.user?.id || req.body.userId || 'System',
      performerRole: req.user?.role || 'Data Clerk',
      oldValues,
      newValues: expense.toObject(),
      reason,
    });

    res.status(200).json({ message: 'Expense voided successfully', expense });
  } catch (error) {
    console.error('Error voiding expense:', error);
    res.status(500).json({ message: 'Error voiding expense', error: error.message });
  }
};

/**
 * @GET /auditlogs/:disasterId
 */
const getAuditLogs = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { limit = 100 } = req.query;
    const logs = await getDisasterAuditLogs(disasterId, parseInt(limit));
    res.status(200).json({ logs, total: logs.length });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};

/**
 * @GET /auditlogs/entity/:entityId/:entityType
 */
const getEntityAuditTrail = async (req, res) => {
  try {
    const { entityId, entityType } = req.params;
    const logs = await getAuditTrail(entityId, entityType);
    res.status(200).json({ logs, total: logs.length });
  } catch (error) {
    console.error('Error fetching entity audit trail:', error);
    res.status(500).json({ message: 'Error fetching audit trail', error: error.message });
  }
};

/**
 * @GET /budgets/:disasterId/breakdown
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
      totalSpent,
      percentageUsed: (totalSpent / totalBudget) * 100,
      remainingBudget: totalBudget - totalSpent,
    });
  } catch (error) {
    console.error('Error getting budget breakdown:', error);
    res.status(500).json({ message: 'Error getting budget breakdown', error: error.message });
  }
};

/**
 * @GET /allocation/budget-impact/:disasterId
 */
const getAllocationBudgetImpact = async (req, res) => {
  try {
    const { disasterId } = req.params;
    const impact = await trackAllocationBudgetImpact(disasterId, 0);
    const summary = await getAllocationSummary(disasterId);
    res.status(200).json({ budgetImpact: impact, allocationSummary: summary });
  } catch (error) {
    console.error('Error getting allocation budget impact:', error);
    res.status(500).json({ message: 'Error getting allocation budget impact', error: error.message });
  }
};

/**
 * @POST /api/budgets/envelopes
 */
const createDisasterEnvelope = async (req, res) => {
  try {
    const { disasterType, allocatedAmount, description } = req.body;

    if (!disasterType || allocatedAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields: disasterType, allocatedAmount' });
    }
    if (allocatedAmount <= 0) return res.status(400).json({ message: 'Allocated amount must be greater than 0' });

    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;

    const existing = await DisasterBudgetEnvelope.findOne({ disasterType, approvalStatus: 'Approved', isVoided: false });
    if (existing) {
      return res.status(400).json({ message: `Active budget envelope already exists for ${disasterType}. Void it first.` });
    }

    const envelope = new DisasterBudgetEnvelope({
      disasterType,
      allocatedAmount,
      remainingAmount: allocatedAmount,
      percentageRemaining: 100,
      approvalStatus: 'Pending',
      fiscalYear: new Date().getFullYear().toString(),
      createdBy: req.user?.id,
      notes: description,
    });

    await envelope.save();

    await AuditLog.create({
      action: 'CREATE',
      actionType: 'CREATE_ENVELOPE',
      entityType: 'DisasterBudgetEnvelope',
      entityId: envelope._id,
      performedBy: req.user?.id,
      performerRole: req.user?.role,
      newValues: envelope.toObject(),
      reason: `Disaster budget envelope created for ${disasterType}`,
    });

    res.status(201).json({ message: 'Disaster budget envelope created successfully', envelope });
  } catch (error) {
    console.error('Error creating disaster envelope:', error);
    res.status(500).json({ message: 'Error creating disaster envelope', error: error.message });
  }
};

/**
 * @GET /api/budgets/envelopes
 */
const getDisasterEnvelopes = async (req, res) => {
  try {
    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;
    const { disasterType, approvalStatus } = req.query;

    let query = { isVoided: false };
    if (disasterType) query.disasterType = disasterType;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const envelopes = await DisasterBudgetEnvelope.find(query).sort({ disasterType: 1 }).lean();
    res.json({ count: envelopes.length, envelopes });
  } catch (error) {
    console.error('Error fetching envelopes:', error);
    res.status(500).json({ message: 'Error fetching envelopes', error: error.message });
  }
};

/**
 * @GET /api/budgets/envelopes/health-alerts
 */
const getBudgetHealthAlerts = async (req, res) => {
  try {
    const { getBudgetHealthAlerts: getAlerts } = await import('../utils/budgetDeductionUtils.js');
    const { fiscalYear } = req.query;
    const result = await getAlerts(fiscalYear);
    res.json(result);
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({ message: 'Error fetching budget alerts', error: error.message });
  }
};

/**
 * @PUT /api/budgets/envelopes/:envelopeId/approve
 */
const approveDisasterEnvelope = async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { justification } = req.body;

    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;
    const envelope = await DisasterBudgetEnvelope.findById(envelopeId);
    if (!envelope) return res.status(404).json({ message: 'Envelope not found' });

    envelope.approvalStatus = 'Approved';
    envelope.approvedBy = req.user?.id;
    envelope.approvalDate = new Date();

    await envelope.save();

    await AuditLog.create({
      action: 'APPROVE',
      actionType: 'APPROVE_ENVELOPE',
      entityType: 'DisasterBudgetEnvelope',
      entityId: envelope._id,
      performedBy: req.user?.id,
      performerRole: req.user?.role,
      newValues: { approvalStatus: 'Approved' },
      reason: justification || 'Envelope approved',
    });

    res.json({ message: 'Envelope approved successfully', envelope });
  } catch (error) {
    console.error('Error approving envelope:', error);
    res.status(500).json({ message: 'Error approving envelope', error: error.message });
  }
};

/**
 * @GET /budgets/envelope-status/all
 * FIXED: Reads committed amounts directly from envelope (allocatedAmount - remainingAmount)
 * so it always reflects real disbursements without needing to re-populate allocations.
 */
const getEnvelopeStatus = async (req, res) => {
  try {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, '_') || '';

    // Get all disbursed allocations
    const disbursedAllocations = await AidAllocationRequest.find({ status: 'Disbursed' }).lean();

    console.log('💰 Disbursed allocations found:', disbursedAllocations.length);

    const envelopeStatus = {};

    for (const alloc of disbursedAllocations) {
      // Manually fetch disaster — avoids populate ref issues
      const disaster = await Disaster.findById(alloc.disasterId).lean();
      const type = disaster?.type || disaster?.disasterType;
      
      console.log(`  → disasterId: ${alloc.disasterId}, type: ${type}, amount: ${alloc.totalEstimatedCost}`);
      
      if (!type) continue;
      const key = normalize(type);

      if (!envelopeStatus[key]) {
        envelopeStatus[key] = { allocated: 0 };
      }
      envelopeStatus[key].allocated += alloc.totalEstimatedCost || 0;
    }

    console.log('📊 Envelope status result:', envelopeStatus);

    res.status(200).json(envelopeStatus);
  } catch (error) {
    console.error('Error fetching envelope status:', error);
    res.status(500).json({ message: 'Error fetching envelope status', error: error.message });
  }
};

export default {
  createBudget,
  createNationalBudget,
  getBudgetsByDisaster,
  approveBudget,
  voidBudget,
  getBudgetBreakdownByDisaster,
  getAllocationBudgetImpact,
  createExpense,
  getExpensesByDisaster,
  approveExpense,
  rejectExpense,
  voidExpense,
  getAuditLogs,
  getEntityAuditTrail,
  createDisasterEnvelope,
  getDisasterEnvelopes,
  getBudgetHealthAlerts,
  approveDisasterEnvelope,
  getEnvelopeStatus,
};