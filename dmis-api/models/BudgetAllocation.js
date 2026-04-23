import mongoose from 'mongoose';

const budgetAllocationSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Shelter', 'Food', 'Water', 'Health', 'Livelihood', 'Education', 'Other'],
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
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
    isVoided: {
      type: Boolean,
      default: false,
    },
    voidReason: {
      type: String,
      default: null,
    },
    voidedBy: {
      type: String,
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate allocation for same disaster/category
budgetAllocationSchema.index({ disasterId: 1, category: 1, approvalStatus: 1, isVoided: 1 });

export default mongoose.model('BudgetAllocation', budgetAllocationSchema);
