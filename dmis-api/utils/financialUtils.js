/**
 * Financial Utilities
 * Helper functions for budget calculations, validations, and business logic
 */

import BudgetAllocation from '../models/BudgetAllocation.js';
import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Calculate total spent for a specific budget category
 */
async function getTotalSpentByCategory(disasterId, category) {
  try {
    const result = await Expense.aggregate([
      {
        $match: {
          disasterId: disasterId,
          category: category,
          status: 'Approved',
          isVoided: false,
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalSpent : 0;
  } catch (error) {
    console.error('Error calculating total spent:', error);
    throw new Error('Failed to calculate total spent');
  }
}

/**
 * Get approved budget for specific category
 */
async function getApprovedBudgetByCategory(disasterId, category) {
  try {
    const budget = await BudgetAllocation.findOne({
      disasterId: disasterId,
      category: category,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (!budget) {
      return null;
    }

    return budget;
  } catch (error) {
    console.error('Error fetching budget:', error);
    throw new Error('Failed to fetch budget');
  }
}

/**
 * Calculate remaining budget for a category
 */
async function getRemainingBudget(disasterId, category) {
  try {
    const budget = await getApprovedBudgetByCategory(disasterId, category);
    
    if (!budget) {
      return 0;
    }

    const totalSpent = await getTotalSpentByCategory(disasterId, category);
    const remaining = budget.allocatedAmount - totalSpent;

    return {
      allocatedAmount: budget.allocatedAmount,
      totalSpent: totalSpent,
      remainingAmount: remaining,
      percentageUsed: (totalSpent / budget.allocatedAmount) * 100
    };
  } catch (error) {
    console.error('Error calculating remaining budget:', error);
    throw new Error('Failed to calculate remaining budget');
  }
}

/**
 * Check if budget exists and is approved for category
 */
async function validateBudgetExists(disasterId, category) {
  const budget = await getApprovedBudgetByCategory(disasterId, category);
  
  if (!budget) {
    throw new Error(`No approved budget found for category: ${category}`);
  }

  return budget;
}

/**
 * Check for duplicate invoice
 */
async function checkDuplicateInvoice(vendorName, invoiceNumber, disasterId) {
  try {
    const duplicate = await Expense.findOne({
      vendorName: vendorName,
      invoiceNumber: invoiceNumber,
      disasterId: disasterId,
      isVoided: false,
    });

    if (duplicate) {
      throw new Error(
        `Duplicate invoice found: Vendor "${vendorName}" already has invoice #${invoiceNumber} in system`
      );
    }

    return false;
  } catch (error) {
    if (error.message.includes('Duplicate invoice')) {
      throw error;
    }
    throw new Error('Error checking for duplicate invoices');
  }
}

/**
 * Validate expense against budget
 */
async function validateExpenseAgainstBudget(disasterId, category, amount) {
  try {
    // Ensure budget exists
    const budget = await validateBudgetExists(disasterId, category);

    // Calculate remaining budget
    const remaining = await getRemainingBudget(disasterId, category);

    // Check if expense exceeds remaining budget
    if (amount > remaining.remainingAmount) {
      throw new Error(
        `Expense amount ($${amount}) exceeds remaining budget ($${remaining.remainingAmount}). ` +
        `Total spent: $${remaining.totalSpent} / Allocated: $${remaining.allocatedAmount}`
      );
    }

    return { valid: true, budget: budget, remaining: remaining };
  } catch (error) {
    throw error;
  }
}

/**
 * Check if approval will cause budget overrun
 */
async function checkBudgetOverrun(disasterId, category, expenseAmount) {
  try {
    const budget = await getApprovedBudgetByCategory(disasterId, category);
    
    if (!budget) {
      throw new Error('No approved budget found for this category');
    }

    const totalSpent = await getTotalSpentByCategory(disasterId, category);
    const projectedTotal = totalSpent + expenseAmount;

    if (projectedTotal > budget.allocatedAmount) {
      throw new Error(
        `Budget overrun detected. Approving this expense would exceed budget by $${
          projectedTotal - budget.allocatedAmount
        }. Allocated: $${budget.allocatedAmount}, Total after approval: $${projectedTotal}`
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Get total budget by disaster
 */
async function getTotalBudgetByDisaster(disasterId) {
  try {
    const result = await BudgetAllocation.aggregate([
      {
        $match: {
          disasterId: disasterId,
          approvalStatus: 'Approved',
          isVoided: false,
        }
      },
      {
        $group: {
          _id: '$disasterId',
          totalBudget: { $sum: '$allocatedAmount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalBudget : 0;
  } catch (error) {
    console.error('Error calculating total budget:', error);
    throw new Error('Failed to calculate total budget');
  }
}

/**
 * Get total spending by disaster
 */
async function getTotalSpendingByDisaster(disasterId) {
  try {
    const result = await Expense.aggregate([
      {
        $match: {
          disasterId: disasterId,
          status: 'Approved',
          isVoided: false,
        }
      },
      {
        $group: {
          _id: '$disasterId',
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalSpent : 0;
  } catch (error) {
    console.error('Error calculating total spending:', error);
    throw new Error('Failed to calculate total spending');
  }
}

/**
 * Get budget breakdown by category
 */
async function getBudgetBreakdown(disasterId) {
  try {
    const budgets = await BudgetAllocation.aggregate([
      {
        $match: {
          disasterId: disasterId,
          approvalStatus: 'Approved',
          isVoided: false,
        }
      },
      {
        $group: {
          _id: '$category',
          allocatedAmount: { $sum: '$allocatedAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { allocatedAmount: -1 }
      }
    ]);

    // Get spending for each category
    const breakdown = await Promise.all(
      budgets.map(async (budget) => {
        const totalSpent = await getTotalSpentByCategory(disasterId, budget._id);
        return {
          category: budget._id,
          allocatedAmount: budget.allocatedAmount,
          totalSpent: totalSpent,
          remainingAmount: budget.allocatedAmount - totalSpent,
          percentageUsed: (totalSpent / budget.allocatedAmount) * 100
        };
      })
    );

    return breakdown;
  } catch (error) {
    console.error('Error getting budget breakdown:', error);
    throw new Error('Failed to get budget breakdown');
  }
}

/**
 * Create audit log entry
 */
async function createAuditLog(auditData) {
  try {
    const log = new AuditLog(auditData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw new Error('Failed to create audit log entry');
  }
}

/**
 * Get audit trail for entity
 */
async function getAuditTrail(entityId, entityType) {
  try {
    const logs = await AuditLog.find({
      entityId: entityId,
      entityType: entityType,
    }).sort({ timestamp: -1 });

    return logs;
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    throw new Error('Failed to fetch audit trail');
  }
}

/**
 * Get audit logs by disaster
 */
async function getDisasterAuditLogs(disasterId, limit = 100) {
  try {
    const logs = await AuditLog.find({
      disasterId: disasterId,
    })
      .sort({ timestamp: -1 })
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('Error fetching disaster audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Track field changes for audit
 */
function trackChanges(oldValues, newValues) {
  const changes = [];

  // Find all fields in both objects
  const allFields = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {})
  ]);

  allFields.forEach(field => {
    const oldVal = oldValues?.[field];
    const newVal = newValues?.[field];

    // Skip if values are the same
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        fieldName: field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  });

  return changes;
}

export {
  getTotalSpentByCategory,
  getApprovedBudgetByCategory,
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
};

export default {
  getTotalSpentByCategory,
  getApprovedBudgetByCategory,
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
};
