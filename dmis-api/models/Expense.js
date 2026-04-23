import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
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
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    vendorRegistrationNumber: {
      type: String,
      trim: true,
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    bankReferenceNumber: {
      type: String,
      trim: true,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    supportingDocumentUrl: {
      type: String,
      trim: true,
      default: null,
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      default: 'Bank Transfer',
    },
    receipientName: {
      type: String,
      trim: true,
      default: null,
    },
    receipientBankAccount: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ disasterId: 1, invoiceNumber: 1, vendorName: 1 });

export default mongoose.model('Expense', expenseSchema);
