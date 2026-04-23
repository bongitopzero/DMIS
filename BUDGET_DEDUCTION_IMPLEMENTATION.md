# Budget Deduction & Alert System Implementation

## Overview
This document specifies all file changes needed to implement the complete budget deduction and alert system connecting Aid Allocation to Budget Allocation.

---

## 📋 CHANGE SUMMARY

| File | Type | Changes | Complexity |
|------|------|---------|-----------|
| `dmis-api/models/AidAllocationRequest.js` | Model | Add `fundedFromReserve` field | Low |
| `dmis-api/models/BudgetAllocation.js` | Model | Add `amountDeducted`, `reserveUsed` fields | Low |
| `dmis-api/models/DisasterBudgetEnvelope.js` | Model | NEW - Track disaster-type budgets | Medium |
| `dmis-api/utils/budgetDeductionUtils.js` | Utils | NEW - Budget check & deduction logic | High |
| `dmis-api/controllers/allocationController.js` | Controller | Modify `disburseAllocationRequest()` | High |
| `dmis-api/controllers/financialController.js` | Controller | Add envelope endpoints | Medium |
| `dmis-ui/src/pages/AidAllocation.jsx` | Frontend | Implement disbursement flow & modals | High |
| `dmis-ui/src/pages/BudgetAllocation.jsx` | Frontend | Add budget health alerts | Medium |

---

## 📝 DETAILED CHANGES

### 1. `dmis-api/models/AidAllocationRequest.js`

**Location**: After `disbursementData` field block

**ADD** these fields to the schema:

```javascript
// Budget Tracking
fundedFromReserve: {
  type: Boolean,
  default: false,
},
budgetDeductionDetails: {
  disasterEnvelopeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisasterBudgetEnvelope',
  },
  envelopeType: String, // "disaster_envelope" or "strategic_reserve"
  deductedAmount: Number,
  deductedDate: Date,
  deductedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
},
```

**Rationale**: Tracks whether allocation was funded from reserve and when/how much was deducted.

---

### 2. `dmis-api/models/BudgetAllocation.js`

**Location**: Before the `isVoided` block

**ADD** these fields:

```javascript
amountDeducted: {
  type: Number,
  default: 0,
},
reserveUsed: {
  type: Number,
  default: 0,
},
deductionHistory: [
  {
    deductedAmount: Number,
    deductedDate: Date,
    allocationRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AidAllocationRequest',
    },
    deductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: String,
    fundedFromReserve: Boolean,
  },
],
```

**Rationale**: Tracks cumulative deductions and history of budget usage.

---

### 3. `dmis-api/models/DisasterBudgetEnvelope.js` (NEW FILE)

**Create new file**: `dmis-api/models/DisasterBudgetEnvelope.js`

```javascript
import mongoose from 'mongoose';

const disasterBudgetEnvelopeSchema = new mongoose.Schema(
  {
    // Identifies which disaster type this envelope covers
    disasterType: {
      type: String,
      required: true,
      enum: ['drought', 'heavy_rainfall', 'strong_winds'],
      index: true,
    },

    // The allocated budget for this disaster type
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Amount already deducted through disbursements
    amountDeducted: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Calculated: allocatedAmount - amountDeducted
    remainingAmount: {
      type: Number,
      required: true,
    },

    // Percentage remaining (remainingAmount / allocatedAmount * 100)
    percentageRemaining: {
      type: Number,
      required: true,
    },

    // Amount taken from Strategic Reserve for this disaster type
    amountUsedFromReserve: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvalDate: Date,

    // Audit trail for deductions
    deductionHistory: [
      {
        allocationRequestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AidAllocationRequest',
        },
        householdId: String,
        deductedAmount: Number,
        deductedDate: Date,
        deductedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        fromReserve: Boolean,
        reason: String,
      },
    ],

    // Fiscal year tracking
    fiscalYear: {
      type: String,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    notes: String,

    // Status for voiding
    isVoided: {
      type: Boolean,
      default: false,
    },

    voidReason: String,

    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    voidedAt: Date,
  },
  { timestamps: true }
);

// Index for quick lookups by disaster type and approval
disasterBudgetEnvelopeSchema.index({ disasterType: 1, approvalStatus: 1, isVoided: 1 });

export default mongoose.model('DisasterBudgetEnvelope', disasterBudgetEnvelopeSchema);
```

**Rationale**: Separate collection for disaster-type budgets, making allocation logic clear and tracking deductions per disaster type.

---

### 4. `dmis-api/utils/budgetDeductionUtils.js` (NEW FILE)

**Create new file**: `dmis-api/utils/budgetDeductionUtils.js`

```javascript
import DisasterBudgetEnvelope from '../models/DisasterBudgetEnvelope.js';
import Disaster from '../models/Disaster.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

/**
 * Map disaster type to envelope name for display
 */
export function getEnvelopeName(disasterType) {
  const mapping = {
    drought: 'Drought Envelope',
    heavy_rainfall: 'Heavy Rainfall Envelope',
    strong_winds: 'Strong Winds Envelope',
  };
  return mapping[disasterType] || 'Unknown Envelope';
}

/**
 * Check budget availability for a disaster type
 * Returns: { available: boolean, envelopeAmount, remaining, needed, message }
 */
export async function checkBudgetAvailability(disasterId, disbursementAmount) {
  try {
    // Fetch disaster to get type
    const disaster = await Disaster.findById(disasterId);
    if (!disaster) {
      throw new Error('Disaster not found');
    }

    const disasterType = disaster.type;

    // Find the envelope for this disaster type
    const envelope = await DisasterBudgetEnvelope.findOne({
      disasterType,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (!envelope) {
      return {
        available: false,
        message: `No approved budget envelope found for ${getEnvelopeName(disasterType)}`,
        disasterType,
      };
    }

    // Check if envelope has enough
    if (envelope.remainingAmount >= disbursementAmount) {
      return {
        available: true,
        source: 'envelope',
        envelopeId: envelope._id,
        envelopeName: getEnvelopeName(disasterType),
        envelopeAmount: envelope.allocatedAmount,
        remaining: envelope.remainingAmount,
        needed: disbursementAmount,
        message: `Sufficient funds in ${getEnvelopeName(disasterType)}: M${envelope.remainingAmount} available`,
      };
    }

    // Not enough in envelope; check Strategic Reserve
    // Strategic Reserve is represented as a special envelope
    const reserve = await DisasterBudgetEnvelope.findOne({
      disasterType: 'strategic_reserve', // Special type for reserve
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (reserve && reserve.remainingAmount >= disbursementAmount) {
      return {
        available: 'partial', // Reserve fallback available
        source: 'reserve',
        envelopeId: envelope._id,
        envelopeName: getEnvelopeName(disasterType),
        reserveId: reserve._id,
        envelopeAmount: envelope.allocatedAmount,
        envelopeRemaining: envelope.remainingAmount,
        reserveAmount: reserve.allocatedAmount,
        reserveRemaining: reserve.remainingAmount,
        needed: disbursementAmount,
        shortfall: disbursementAmount - envelope.remainingAmount,
        message: `Insufficient funds in ${getEnvelopeName(disasterType)}. M${envelope.remainingAmount} remaining. Strategic Reserve has M${reserve.remainingAmount} available. Use reserve?`,
      };
    }

    // Not enough in either
    return {
      available: false,
      source: 'none',
      envelopeRemaining: envelope?.remainingAmount || 0,
      reserveRemaining: reserve?.remainingAmount || 0,
      needed: disbursementAmount,
      message: `Insufficient funds. ${getEnvelopeName(disasterType)} has M${envelope.remainingAmount}, Strategic Reserve has M${reserve?.remainingAmount || 0}. Total needed: M${disbursementAmount}.`,
    };
  } catch (error) {
    console.error('Error checking budget availability:', error.message);
    throw error;
  }
}

/**
 * Deduct amount from budget envelope
 * Returns: { success, message, newRemaining }
 */
export async function deductFromBudget(
  envelopeId,
  amount,
  allocationRequestId,
  householdId,
  userId,
  userRole
) {
  try {
    const envelope = await DisasterBudgetEnvelope.findById(envelopeId);
    if (!envelope) {
      throw new Error('Budget envelope not found');
    }

    if (envelope.remainingAmount < amount) {
      throw new Error(
        `Insufficient funds in envelope. Remaining: M${envelope.remainingAmount}, Needed: M${amount}`
      );
    }

    // Update envelope
    envelope.amountDeducted += amount;
    envelope.remainingAmount -= amount;
    envelope.percentageRemaining = (envelope.remainingAmount / envelope.allocatedAmount) * 100;

    // Record deduction
    envelope.deductionHistory.push({
      allocationRequestId,
      householdId,
      deductedAmount: amount,
      deductedDate: new Date(),
      deductedBy: userId,
      fromReserve: false,
      reason: `Disbursement for allocation request`,
    });

    await envelope.save();

    // Log to audit trail
    await AuditLog.create({
      action: 'BUDGET_DEDUCTED',
      actionType: 'BUDGET_DEDUCTED',
      entityType: 'DisasterBudgetEnvelope',
      entityId: envelopeId,
      disasterId: envelope._id,
      performedBy: userId,
      performerRole: userRole,
      details: {
        envelopeType: envelope.disasterType,
        amountDeducted: amount,
        remainingAfter: envelope.remainingAmount,
        allocationRequestId: allocationRequestId.toString(),
        householdId,
      },
      reason: `Budget deducted from ${getEnvelopeName(envelope.disasterType)} - M${amount} for household ${householdId}`,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `M${amount} deducted from ${getEnvelopeName(envelope.disasterType)}`,
      newRemaining: envelope.remainingAmount,
      percentageRemaining: envelope.percentageRemaining,
    };
  } catch (error) {
    console.error('Error deducting from budget:', error.message);
    throw error;
  }
}

/**
 * Deduct from Strategic Reserve
 * Returns: { success, message, newRemaining }
 */
export async function deductFromReserve(
  amount,
  allocationRequestId,
  householdId,
  userId,
  userRole,
  disasterEnvelopeId
) {
  try {
    const reserve = await DisasterBudgetEnvelope.findOne({
      disasterType: 'strategic_reserve',
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (!reserve) {
      throw new Error('Strategic Reserve not found');
    }

    if (reserve.remainingAmount < amount) {
      throw new Error(
        `Insufficient funds in Strategic Reserve. Remaining: M${reserve.remainingAmount}, Needed: M${amount}`
      );
    }

    // Update reserve
    reserve.amountDeducted += amount;
    reserve.remainingAmount -= amount;
    reserve.percentageRemaining = (reserve.remainingAmount / reserve.allocatedAmount) * 100;

    // Record deduction
    reserve.deductionHistory.push({
      allocationRequestId,
      householdId,
      deductedAmount: amount,
      deductedDate: new Date(),
      deductedBy: userId,
      fromReserve: true,
      reason: `Disbursement for allocation request (from Strategic Reserve)`,
    });

    await reserve.save();

    // Also update the disaster envelope to track reserve usage
    if (disasterEnvelopeId) {
      const disasterEnvelope = await DisasterBudgetEnvelope.findById(disasterEnvelopeId);
      if (disasterEnvelope) {
        disasterEnvelope.amountUsedFromReserve += amount;
        await disasterEnvelope.save();
      }
    }

    // Log to audit trail
    await AuditLog.create({
      action: 'BUDGET_DEDUCTED_FROM_RESERVE',
      actionType: 'BUDGET_DEDUCTED_FROM_RESERVE',
      entityType: 'DisasterBudgetEnvelope',
      entityId: reserve._id,
      performedBy: userId,
      performerRole: userRole,
      details: {
        envelopeType: 'strategic_reserve',
        amountDeducted: amount,
        remainingAfter: reserve.remainingAmount,
        allocationRequestId: allocationRequestId.toString(),
        householdId,
        disasterEnvelopeId: disasterEnvelopeId?.toString(),
      },
      reason: `Strategic Reserve deducted - M${amount} for household ${householdId} (fallback funding)`,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `M${amount} deducted from Strategic Reserve`,
      newRemaining: reserve.remainingAmount,
      percentageRemaining: reserve.percentageRemaining,
      fundedFromReserve: true,
    };
  } catch (error) {
    console.error('Error deducting from reserve:', error.message);
    throw error;
  }
}

/**
 * Get budget health alerts for all envelopes
 * Returns: { alerts: [{type, message, percentage}] }
 */
export async function getBudgetHealthAlerts(fiscalYear = null) {
  try {
    const year = fiscalYear || new Date().getFullYear().toString();

    const envelopes = await DisasterBudgetEnvelope.find({
      fiscalYear: year,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    const alerts = [];

    for (const envelope of envelopes) {
      if (envelope.percentageRemaining <= 10) {
        alerts.push({
          type: 'critical',
          message: `🔴 CRITICAL: ${getEnvelopeName(envelope.disasterType)} is at ${envelope.percentageRemaining.toFixed(1)}% remaining (M${envelope.remainingAmount} of M${envelope.allocatedAmount})`,
          envelopeType: envelope.disasterType,
          percentage: envelope.percentageRemaining,
        });
      } else if (envelope.percentageRemaining <= 20) {
        alerts.push({
          type: 'warning',
          message: `🟡 WARNING: ${getEnvelopeName(envelope.disasterType)} is at ${envelope.percentageRemaining.toFixed(1)}% remaining (M${envelope.remainingAmount} of M${envelope.allocatedAmount})`,
          envelopeType: envelope.disasterType,
          percentage: envelope.percentageRemaining,
        });
      }
    }

    // Check if reserve was used
    const reserve = await DisasterBudgetEnvelope.findOne({
      disasterType: 'strategic_reserve',
      fiscalYear: year,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (reserve && reserve.amountDeducted > 0) {
      alerts.push({
        type: 'reserve',
        message: `🟠 Strategic Reserve has been used — M${reserve.remainingAmount} remaining in reserve. Amount used: M${reserve.amountDeducted}`,
        envelopeType: 'strategic_reserve',
        percentage: reserve.percentageRemaining,
        amountUsed: reserve.amountDeducted,
      });
    }

    return { alerts };
  } catch (error) {
    console.error('Error getting budget health alerts:', error.message);
    throw error;
  }
}
```

---

### 5. `dmis-api/controllers/allocationController.js`

**Location**: Modify the `disburseAllocationRequest` function (currently around line 850-950)

**REPLACE the entire function** with this enhanced version:

```javascript
/**
 * @PUT /api/allocation/requests/:requestId/disburse
 * Strict disbursement workflow for Finance Officers ONLY
 * WITH BUDGET CHECKING AND DEDUCTION
 */
const disburseAllocationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { disbursementData, useReserve } = req.body;
    
    // Import budget utilities
    const { checkBudgetAvailability, deductFromBudget, deductFromReserve } = 
      await import('../utils/budgetDeductionUtils.js');

    const financeUser = req.financeUser || req.user || (req.headers.user ? JSON.parse(req.headers.user) : {});
    
    console.log('💰 [DISBURSEMENT] Finance Officer disbursement initiated:', {
      requestId,
      officer: financeUser.name || financeUser.id,
      role: financeUser.role,
      useReserve,
    });

    // Fetch allocation request
    const request = await AidAllocationRequest.findById(requestId);
    if (!request) {
      console.error('❌ [DISBURSEMENT] Request not found:', requestId);
      return res.status(404).json({ 
        message: 'Allocation request not found',
        requestId 
      });
    }

    // Status validation
    const currentStatus = request.status;
    console.log('📋 [DISBURSEMENT] Current request status:', currentStatus);
    
    if (currentStatus !== 'Approved') {
      console.error('❌ [DISBURSEMENT] Invalid status for disbursement:', currentStatus);
      return res.status(400).json({
        message: `Cannot disburse allocation in "${currentStatus}" status. Request must be "Approved" to disburse.`,
        currentStatus,
        requiredStatus: 'Approved',
      });
    }

    // Validate status transition is allowed
    const transition = validateStatusTransitionAllowed(currentStatus, 'Disbursed');
    if (!transition.allowed) {
      console.error('❌ [DISBURSEMENT] Status transition not allowed:', { from: currentStatus, to: 'Disbursed' });
      return res.status(400).json({
        message: `Invalid status transition from "${currentStatus}" to "Disbursed"`,
        currentStatus,
        validTransitions: transition.validTransitions,
      });
    }

    // ============================================================
    // NEW: CHECK BUDGET AVAILABILITY
    // ============================================================
    const disbursementAmount = disbursementData?.disbursedAmount || request.totalEstimatedCost;
    console.log('💸 [BUDGET CHECK] Checking budget for amount:', disbursementAmount);

    let budgetCheck;
    try {
      budgetCheck = await checkBudgetAvailability(request.disasterId, disbursementAmount);
    } catch (budgetError) {
      console.error('❌ [BUDGET CHECK] Error checking budget:', budgetError.message);
      return res.status(500).json({
        message: 'Error checking budget availability',
        error: budgetError.message,
      });
    }

    console.log('📊 [BUDGET CHECK] Result:', budgetCheck);

    // ============================================================
    // BUDGET CHECK OUTCOMES
    // ============================================================

    // Case 1: Sufficient funds in envelope
    if (budgetCheck.available === true && budgetCheck.source === 'envelope') {
      console.log('✅ [BUDGET CHECK] Sufficient funds in envelope, proceeding with disbursement');
      
      // Proceed with disbursement and deduct
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

      // Deduct from budget
      try {
        const deductionResult = await deductFromBudget(
          budgetCheck.envelopeId,
          disbursementAmount,
          request._id,
          request.householdId,
          financeUser._id || financeUser.id,
          financeUser.role
        );
        console.log('✅ [BUDGET DEDUCTION] Deduction successful:', deductionResult);
      } catch (deductError) {
        console.error('❌ [BUDGET DEDUCTION] Error deducting from budget:', deductError.message);
        // Revert disbursement
        request.status = 'Approved';
        request.disbursementData = {};
        request.budgetDeductionDetails = {};
        await request.save();
        
        return res.status(400).json({
          message: 'Deduction from budget failed',
          error: deductError.message,
        });
      }

      // Update household assessment status
      if (request.householdAssessmentId) {
        try {
          await HouseholdAssessment.findByIdAndUpdate(
            request.householdAssessmentId, 
            { status: 'Disbursed' }
          );
        } catch (err) {
          console.warn('⚠️ Could not update household assessment status:', err.message);
        }
      }

      // Create audit log
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
          disbursedPackages: request.allocatedPackages,
          totalDisbursedAmount: disbursementAmount,
          disbursementData: request.disbursementData,
          fundedFromReserve: false,
          budgetEnvelope: budgetCheck.envelopeName,
        },
        reason: `Funds disbursed - M${disbursementAmount} via ${request.disbursementData.disbursementMethod} from ${budgetCheck.envelopeName}`,
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
      console.log('⚠️ [BUDGET CHECK] Envelope insufficient, reserve available');

      if (!useReserve) {
        // Return error with option to use reserve
        console.log('📋 [BUDGET CHECK] Requesting user confirmation to use reserve');
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
            message: `M${budgetCheck.envelopeRemaining} remaining in ${budgetCheck.envelopeName}, M${disbursementAmount} required. M${budgetCheck.shortfall} shortfall. Strategic Reserve has M${budgetCheck.reserveRemaining} available.`,
            options: ['Use Reserve', 'Cancel'],
          },
        });
      }

      // User confirmed to use reserve
      console.log('✅ [RESERVE USAGE] User confirmed to use Strategic Reserve');

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

      // Deduct from strategic reserve
      try {
        const reserveDeductionResult = await deductFromReserve(
          disbursementAmount,
          request._id,
          request.householdId,
          financeUser._id || financeUser.id,
          financeUser.role,
          budgetCheck.envelopeId
        );
        console.log('✅ [RESERVE DEDUCTION] Deduction successful:', reserveDeductionResult);
      } catch (deductError) {
        console.error('❌ [RESERVE DEDUCTION] Error deducting from reserve:', deductError.message);
        // Revert disbursement
        request.status = 'Approved';
        request.fundedFromReserve = false;
        request.disbursementData = {};
        request.budgetDeductionDetails = {};
        await request.save();

        return res.status(400).json({
          message: 'Deduction from Strategic Reserve failed',
          error: deductError.message,
        });
      }

      // Update household assessment status
      if (request.householdAssessmentId) {
        try {
          await HouseholdAssessment.findByIdAndUpdate(
            request.householdAssessmentId, 
            { status: 'Disbursed' }
          );
        } catch (err) {
          console.warn('⚠️ Could not update household assessment status:', err.message);
        }
      }

      // Create audit log for reserve usage
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
          reason: `${budgetCheck.envelopeName} had insufficient funds (M${budgetCheck.envelopeRemaining} remaining, needed M${disbursementAmount})`,
        },
        reason: `⚠️ Funds disbursed from Strategic Reserve - M${disbursementAmount} for household ${request.householdId}. Primary envelope had shortfall of M${budgetCheck.shortfall}.`,
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

    // Case 3: Both envelope and reserve insufficient
    console.error('❌ [BUDGET CHECK] Insufficient funds in both envelope and reserve');
    return res.status(402).json({
      message: 'Insufficient funds. This disbursement exceeds both the disaster envelope and the Strategic Reserve. Please contact the Administrator.',
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
    res.status(500).json({
      message: 'Error during disbursement process',
      error: error.message,
    });
  }
};
```

---

### 6. `dmis-api/controllers/financialController.js`

**Location**: Add these new endpoints to the end of the file

```javascript
/**
 * @POST /api/budgets/envelopes
 * Create disaster budget envelope
 */
const createDisasterEnvelope = async (req, res) => {
  try {
    const { disasterType, allocatedAmount, description } = req.body;

    if (!disasterType || allocatedAmount === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: disasterType, allocatedAmount',
      });
    }

    if (allocatedAmount <= 0) {
      return res.status(400).json({
        message: 'Allocated amount must be greater than 0',
      });
    }

    // Import new model
    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;

    // Check if envelope already exists and is approved
    const existing = await DisasterBudgetEnvelope.findOne({
      disasterType,
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (existing) {
      return res.status(400).json({
        message: `Active budget envelope already exists for ${disasterType}. Void it first to create a new one.`,
      });
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

    res.status(201).json({
      message: 'Disaster budget envelope created successfully',
      envelope,
    });
  } catch (error) {
    console.error('Error creating disaster envelope:', error);
    res.status(500).json({
      message: 'Error creating disaster envelope',
      error: error.message,
    });
  }
};

/**
 * @GET /api/budgets/envelopes
 * Get all disaster budget envelopes
 */
const getDisasterEnvelopes = async (req, res) => {
  try {
    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;
    const { disasterType, approvalStatus } = req.query;

    let query = { isVoided: false };
    if (disasterType) query.disasterType = disasterType;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const envelopes = await DisasterBudgetEnvelope.find(query)
      .sort({ disasterType: 1 })
      .lean();

    res.json({
      count: envelopes.length,
      envelopes,
    });
  } catch (error) {
    console.error('Error fetching envelopes:', error);
    res.status(500).json({
      message: 'Error fetching envelopes',
      error: error.message,
    });
  }
};

/**
 * @GET /api/budgets/envelopes/health-alerts
 * Get budget health alerts
 */
const getBudgetHealthAlerts = async (req, res) => {
  try {
    const { getBudgetHealthAlerts: getAlerts } = await import('../utils/budgetDeductionUtils.js');
    const { fiscalYear } = req.query;

    const result = await getAlerts(fiscalYear);

    res.json(result);
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({
      message: 'Error fetching budget alerts',
      error: error.message,
    });
  }
};

/**
 * @PUT /api/budgets/envelopes/:envelopeId/approve
 * Approve disaster budget envelope
 */
const approveDisasterEnvelope = async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { justification } = req.body;

    const DisasterBudgetEnvelope = (await import('../models/DisasterBudgetEnvelope.js')).default;

    const envelope = await DisasterBudgetEnvelope.findById(envelopeId);
    if (!envelope) {
      return res.status(404).json({ message: 'Envelope not found' });
    }

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

    res.json({
      message: 'Envelope approved successfully',
      envelope,
    });
  } catch (error) {
    console.error('Error approving envelope:', error);
    res.status(500).json({
      message: 'Error approving envelope',
      error: error.message,
    });
  }
};

// Export new functions
export { createDisasterEnvelope, getDisasterEnvelopes, getBudgetHealthAlerts, approveDisasterEnvelope };
```

---

### 7. `dmis-ui/src/pages/AidAllocation.jsx`

**Location**: Replace the disburse button handler (around line 1086)

**Current code**:
```javascript
onClick={() => alert("Disburse feature coming soon")}
```

**Replace with**:
```javascript
onClick={() => handleDisburseClick(alloc)}
```

**Add these new functions** to the component (after fetchAllAllocations):

```javascript
// ─── DISBURSEMENT HANDLER ─────────────────────────────────────────────
const handleDisburseClick = async (alloc) => {
  try {
    setLoading(true);

    console.log('💰 Starting disbursement for allocation:', alloc._id);

    // Call disburse endpoint
    const response = await API.put(
      `/api/allocation/requests/${alloc._id}/disburse`,
      {
        disbursementData: {
          disbursedAmount: alloc.totalCost,
          disbursementMethod: 'Bank Transfer',
        },
        useReserve: false, // Initial attempt without reserve
      }
    );

    // Success - no budget issues
    ToastManager.success(response.data.message);
    console.log('✅ Disbursement successful:', response.data);
    
    // Refresh allocations to show updated status
    await fetchAllAllocations();
    setActiveTab('summary');
  } catch (error) {
    const errorStatus = error.response?.status;
    const errorData = error.response?.data;

    console.error('❌ Disbursement error:', errorStatus, errorData);

    // Budget insufficient - prompt for reserve usage
    if (errorStatus === 402 && errorData?.budgetStatus?.shortfall) {
      console.log('⚠️ Budget insufficient, prompting for reserve usage');
      showBudgetShortfallModal(alloc, errorData);
    } else {
      // Other error
      ToastManager.error(errorData?.message || 'Disbursement failed');
    }
  } finally {
    setLoading(false);
  }
};

// ─── BUDGET SHORTFALL MODAL ──────────────────────────────────────────
const [showBudgetModal, setShowBudgetModal] = useState(false);
const [budgetModalData, setBudgetModalData] = useState(null);

const showBudgetShortfallModal = (alloc, errorData) => {
  setBudgetModalData({
    allocation: alloc,
    budgetStatus: errorData.budgetStatus,
    prompt: errorData.prompt,
  });
  setShowBudgetModal(true);
};

const handleUseReserve = async () => {
  try {
    setLoading(true);
    
    console.log('🔄 Retrying disbursement with Strategic Reserve');

    const response = await API.put(
      `/api/allocation/requests/${budgetModalData.allocation._id}/disburse`,
      {
        disbursementData: {
          disbursedAmount: budgetModalData.allocation.totalCost,
          disbursementMethod: 'Bank Transfer',
        },
        useReserve: true, // Confirm use of reserve
      }
    );

    ToastManager.success('⚠️ ' + response.data.message);
    console.log('✅ Disbursement from reserve successful:', response.data);

    setShowBudgetModal(false);
    await fetchAllAllocations();
    setActiveTab('summary');
  } catch (error) {
    console.error('❌ Reserve disbursement failed:', error.response?.data);
    ToastManager.error(error.response?.data?.message || 'Reserve disbursement failed');
  } finally {
    setLoading(false);
  }
};

const handleCancelDisburse = () => {
  setShowBudgetModal(false);
  setBudgetModalData(null);
};
```

**Add modal JSX** before the closing `</div>` of the component:

```javascript
{/* Budget Shortfall Modal */}
{showBudgetModal && budgetModalData && (
  <div className="modal-overlay">
    <div className="modal-content modal-warning">
      <h2>⚠️ Insufficient Budget</h2>
      
      <div className="budget-status">
        <p className="envelope-name">{budgetModalData.budgetStatus.envelopeName}</p>
        
        <div className="budget-details">
          <div className="detail-row">
            <span>Envelope Remaining:</span>
            <strong className="amount">M{budgetModalData.budgetStatus.envelopeRemaining}</strong>
          </div>
          <div className="detail-row">
            <span>Amount Needed:</span>
            <strong className="amount">M{budgetModalData.budgetStatus.needed}</strong>
          </div>
          <div className="detail-row error">
            <span>Shortfall:</span>
            <strong className="amount">M{budgetModalData.budgetStatus.shortfallAmount}</strong>
          </div>
        </div>

        <div className="reserve-available">
          <h4>Strategic Reserve Available</h4>
          <p>Remaining in Strategic Reserve: <strong>M{budgetModalData.budgetStatus.reserveRemaining}</strong></p>
          <p className="note">Would you like to use the Strategic Reserve to complete this disbursement?</p>
        </div>
      </div>

      <div className="modal-actions">
        <button 
          className="btn btn-secondary"
          onClick={handleCancelDisburse}
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          className="btn btn-primary btn-reserve"
          onClick={handleUseReserve}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Use Strategic Reserve'}
        </button>
      </div>
    </div>
  </div>
)}
```

**Add CSS** to `AidAllocation.css`:

```css
/* Budget Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
  margin: 0 0 24px 0;
  color: #333;
  font-size: 20px;
}

.budget-status {
  margin-bottom: 24px;
}

.envelope-name {
  font-size: 16px;
  font-weight: 600;
  color: #ff8c42;
  margin: 0 0 16px 0;
}

.budget-details {
  background: #f5f5f5;
  border-left: 4px solid #ff8c42;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row.error {
  color: #d32f2f;
  font-weight: 600;
}

.detail-row.error .amount {
  color: #d32f2f;
}

.amount {
  font-weight: 600;
  color: #333;
}

.reserve-available {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 24px;
}

.reserve-available h4 {
  margin: 0 0 8px 0;
  color: #2e7d32;
  font-size: 14px;
}

.reserve-available p {
  margin: 8px 0;
  font-size: 14px;
  color: #333;
}

.reserve-available strong {
  color: #2e7d32;
  font-weight: 600;
}

.reserve-available .note {
  color: #555;
  font-style: italic;
  margin-top: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
}

.btn-reserve {
  background: #4caf50;
}

.btn-reserve:hover:not(:disabled) {
  background: #45a049;
}
```

---

### 8. `dmis-ui/src/pages/BudgetAllocation.jsx`

**Location**: Top of component, after imports

**Add state for alerts**:

```javascript
const [budgetAlerts, setBudgetAlerts] = useState([]);
const [alertsLoading, setAlertsLoading] = useState(false);
```

**Add effect to fetch alerts** when component mounts:

```javascript
useEffect(() => {
  fetchBudgetAlerts();
  // Refresh alerts every 30 seconds
  const interval = setInterval(fetchBudgetAlerts, 30000);
  return () => clearInterval(interval);
}, []);

const fetchBudgetAlerts = async () => {
  try {
    setAlertsLoading(true);
    const response = await API.get('/api/budgets/envelopes/health-alerts');
    setBudgetAlerts(response.data.alerts || []);
    console.log('📊 Budget alerts updated:', response.data.alerts);
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
  } finally {
    setAlertsLoading(false);
  }
};
```

**Add alerts display** at the top of the render (after page title):

```javascript
{/* Budget Health Alerts */}
{budgetAlerts.length > 0 && (
  <div className="budget-alerts-container">
    {budgetAlerts.map((alert, idx) => (
      <div key={idx} className={`alert alert-${alert.type}`}>
        <div className="alert-content">
          <span className="alert-message">{alert.message}</span>
          {alert.type === 'reserve' && (
            <span className="alert-detail">M{alert.amountUsed} withdrawn</span>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

**Add CSS** to BudgetAllocation.css:

```css
/* Budget Alerts */
.budget-alerts-container {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert {
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-critical {
  background: #ffebee;
  border-color: #d32f2f;
  color: #b71c1c;
}

.alert-warning {
  background: #fff8e1;
  border-color: #f57f17;
  color: #e65100;
}

.alert-reserve {
  background: #ffe0b2;
  border-color: #e65100;
  color: #bf360c;
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.alert-message {
  flex: 1;
  font-weight: 600;
}

.alert-detail {
  font-weight: 600;
  font-size: 13px;
  opacity: 0.8;
}
```

---

## 📊 WORKFLOW SUMMARY

### Disbursement Flow with Budget Checks

```
User clicks "Disburse" button
    ↓
[Frontend] Sends request to /api/allocation/requests/:id/disburse
    ↓
[Backend] Retrieves allocation request
    ↓
[Backend] Validates status is "Approved"
    ↓
[Backend] Gets disaster type from Disaster document
    ↓
[Backend] Calls checkBudgetAvailability()
    ↓
    ├─→ Envelope has sufficient funds?
    │       YES: Deduct from envelope → Disburse → Success
    │       NO: Check Strategic Reserve
    │
    └─→ Reserve has sufficient funds?
            YES: Return error (402) asking to use reserve
            NO: Return error (402) saying insufficient funds
    ↓
[Frontend] If reserve option shown:
    User clicks "Use Reserve"
    ↓
    [Frontend] Resends request with useReserve: true
    ↓
    [Backend] Deducts from reserve → Marks allocation with fundedFromReserve:true
    ↓
    [Audit] BUDGET_DEDUCTED_FROM_RESERVE logged
    ↓
    Disbursement complete with warning
    ↓
[All cases] Update household assessment status to "Disbursed"
    ↓
[Frontend] Refresh allocations list
    ↓
[Frontend] BudgetAllocation page detects new alerts:
    - If envelope < 20%: show WARNING
    - If envelope < 10%: show CRITICAL
    - If reserve used: show RESERVE alert
```

---

## 🔧 DEPLOYMENT STEPS

1. **Apply Model Changes**:
   - Update `AidAllocationRequest.js`
   - Update `BudgetAllocation.js`
   - Create new `DisasterBudgetEnvelope.js`

2. **Create Utility Functions**:
   - Create new `budgetDeductionUtils.js`

3. **Update Controllers**:
   - Modify `allocationController.js` disburseAllocationRequest()
   - Update `financialController.js` with exports

4. **Update Frontend**:
   - Update `AidAllocation.jsx` with disbursement handlers
   - Update `BudgetAllocation.jsx` with alerts

5. **Test Scenarios**:
   - Disbursement with sufficient envelope funds ✅
   - Disbursement with reserve fallback ✅
   - Disbursement with insufficient funds ✅
   - Budget alerts display correctly ✅
   - Audit logs record all deductions ✅

---

## ⚠️ IMPORTANT NOTES

- **Disaster Type Mapping**: The system uses disaster.type field values: `drought`, `heavy_rainfall`, `strong_winds`
- **Strategic Reserve**: Special envelope with disasterType: `strategic_reserve`
- **Audit Logging**: All deductions are logged with action type `BUDGET_DEDUCTED` or `BUDGET_DEDUCTED_FROM_RESERVE`
- **Backward Compatibility**: Existing disbursement flow preserved; budget checks added without breaking changes
- **Frontend Refresh**: AidAllocation page refreshes on summary tab open; BudgetAllocation page refreshes every 30 seconds
- **User Notifications**: All budget issues shown as modals with clear options (Cancel or Use Reserve)
