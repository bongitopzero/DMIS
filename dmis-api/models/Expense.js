import mongoose from 'mongoose';

/**
 * Expense Schema
 * Tracks all expenses related to disaster management
 * 
 * Rules:
 * - Cannot log expense without approved budget
 * - Cannot exceed allocated budget
 * - Cannot approve without supporting documents
 * - Automatic budget calculation
 * - Prevent deletion (use void instead)
 */
const ExpenseSchema = new mongoose.Schema(
  {
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
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
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    vendorRegistrationNumber: {
      type: String,
      required: [true, 'Vendor registration number is required'],
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      index: true,
    },
    bankReferenceNumber: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
      validate: {
        validator: function(v) {
          return !isNaN(v) && v > 0;
        },
        message: 'Amount must be a positive number'
      }
    },
    supportingDocumentUrl: {
      type: String,
      default: null,
    },
    loggedBy: {
      type: String,
      required: [true, 'Logger ID is required'],
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Check', 'Cash', 'Mobile Money', 'Other'],
      default: 'Bank Transfer',
    },
    receipientName: {
      type: String,
      trim: true,
    },
    receipientBankAccount: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
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
    collection: 'expenses'
  }
);

// Index for duplicate invoice detection
ExpenseSchema.index({ vendorName: 1, invoiceNumber: 1, disasterId: 1 });

// Prevent deletion of expense records
ExpenseSchema.statics.deleteOne = function() {
  throw new Error('Expense records cannot be deleted. Use void instead.');
};

ExpenseSchema.statics.deleteMany = function() {
  throw new Error('Expense records cannot be deleted. Use void instead.');
};

// Validate supportingDocumentUrl before approval
ExpenseSchema.pre('findByIdAndUpdate', async function(next) {
  const update = this.getUpdate();
  
  // If updating status to Approved
  if (update.$set?.status === 'Approved') {
    const expense = await this.model.findById(this.getQuery()._id);
    
    if (!expense.supportingDocumentUrl) {
      throw new Error('Cannot approve expense without supporting documentation');
    }
  }
  
  next();
});

export default mongoose.model('Expense', ExpenseSchema);
