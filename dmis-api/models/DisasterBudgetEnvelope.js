import mongoose from 'mongoose';

const disasterBudgetEnvelopeSchema = new mongoose.Schema(
  {
    // Identifies which disaster type this envelope covers
    disasterType: {
      type: String,
      required: true,
      enum: ['drought', 'heavy_rainfall', 'strong_winds', 'strategic_reserve'],
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
      required: false,
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
