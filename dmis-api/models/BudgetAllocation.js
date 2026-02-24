import mongoose from 'mongoose';

/**
 * BudgetAllocation Schema
 * Stores budget allocations for specific disaster relief categories
 * 
 * Rules:
 * - Immutable after approval
 * - Track approval process
 * - Prevent deletion
 */
const BudgetAllocationSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Budget category is required'],
      enum: [
        'Food & Water',
        'Medical Supplies',
        'Shelter & Housing',
        'Transportation',
        'Communication',
        'Security',
        'Infrastructure',
        'Education',
        'Livelihood Support',
        'Other'
      ],
      index: true,
    },
    allocatedAmount: {
      type: Number,
      required: [true, 'Allocated amount is required'],
      min: [0, 'Amount cannot be negative'],
      validate: {
        validator: function(v) {
          return !isNaN(v) && v > 0;
        },
        message: 'Allocated amount must be a positive number'
      }
    },
    approvedBy: {
      type: String,
      required: [true, 'Approver name/ID is required'],
    },
    approvalDate: {
      type: Date,
      required: [true, 'Approval date is required'],
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      required: [true, 'Creator ID is required'],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
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
  {
    timestamps: true,
    collection: 'budgets'
  }
);

// Prevent deletion of budget records
BudgetAllocationSchema.statics.deleteOne = function() {
  throw new Error('Budget records cannot be deleted. Use void instead.');
};

BudgetAllocationSchema.statics.deleteMany = function() {
  throw new Error('Budget records cannot be deleted. Use void instead.');
};

// Index for finding active budgets by disaster and category
BudgetAllocationSchema.index({ disasterId: 1, category: 1, approvalStatus: 1 });

// Calculate remaining budget (virtual field)
BudgetAllocationSchema.virtual('remainingBudget').get(function() {
  return this.allocatedAmount;
});

// Prevent editing after approval
BudgetAllocationSchema.pre('findByIdAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Check if trying to update approved budget
  this.model.findById(this.getQuery()._id).then(doc => {
    if (doc && doc.approvalStatus === 'Approved' && !update.$set?.isVoided) {
      throw new Error('Cannot edit budget after approval. Create a new allocation instead.');
    }
    next();
  }).catch(next);
});

export default mongoose.model('BudgetAllocation', BudgetAllocationSchema);
