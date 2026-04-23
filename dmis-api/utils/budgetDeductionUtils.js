import DisasterBudgetEnvelope from '../models/DisasterBudgetEnvelope.js';
import Disaster from '../models/Disaster.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Map disaster type to envelope name for display
 */
export function getEnvelopeName(disasterType) {
  const mapping = {
    drought: 'Drought Envelope',
    heavy_rainfall: 'Heavy Rainfall Envelope',
    strong_winds: 'Strong Winds Envelope',
    strategic_reserve: 'Strategic Reserve',
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
    const reserve = await DisasterBudgetEnvelope.findOne({
      disasterType: 'strategic_reserve',
      approvalStatus: 'Approved',
      isVoided: false,
    });

    if (reserve && reserve.remainingAmount >= disbursementAmount) {
      return {
        available: 'partial',
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
      actorId: userId,
      actorName: 'Finance User', // Could be improved to get actual name
      actorRole: userRole,
      entityType: 'DisasterBudgetEnvelope',
      entityId: envelopeId,
      details: {
        envelopeType: envelope.disasterType,
        amountDeducted: amount,
        remainingAfter: envelope.remainingAmount,
        allocationRequestId: allocationRequestId.toString(),
        householdId,
      },
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
      actorId: userId,
      actorName: 'Finance User', // Could be improved to get actual name
      actorRole: userRole,
      entityType: 'DisasterBudgetEnvelope',
      entityId: reserve._id,
      details: {
        envelopeType: 'strategic_reserve',
        amountDeducted: amount,
        remainingAfter: reserve.remainingAmount,
        allocationRequestId: allocationRequestId.toString(),
        householdId,
        disasterEnvelopeId: disasterEnvelopeId?.toString(),
      },
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
