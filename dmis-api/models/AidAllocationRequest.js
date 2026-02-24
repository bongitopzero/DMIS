import mongoose from 'mongoose';

/**
 * AidAllocationRequest Schema
 * Records aid allocation requests with computed scores and assigned packages
 */
const aidAllocationRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: [true, 'Request ID is required'],
      unique: true,
      index: true,
    },
    householdAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HouseholdAssessment',
      required: [true, 'Household Assessment ID is required'],
      index: true,
    },
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    householdId: {
      type: String,
      required: true,
    },
    // Scoring Components
    damageLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    vulnerabilityPoints: {
      elderlyHeadScore: { type: Number, default: 0 },
      childrenUnder5Score: { type: Number, default: 0 },
      femaleHeadedScore: { type: Number, default: 0 },
      largeFamilyScore: { type: Number, default: 0 },
      incomeScore: { type: Number, default: 0 },
    },
    compositeScore: {
      type: Number,
      required: true,
      min: 0,
    },
    scoreBreakdown: {
      damageComponent: Number,
      vulnerabilityComponent: Number,
      totalVulnerability: Number,
    },
    // Aid Assignment
    aidTier: {
      type: String,
      enum: [
        'Basic Support (0-3)',
        'Shelter + Food + Cash (4-6)',
        'Tent + Reconstruction + Food (7-9)',
        'Priority Reconstruction + Livelihood (10+)',
      ],
      required: true,
    },
    allocatedPackages: [
      {
        packageId: String,
        packageName: String,
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true },
        totalCost: { type: Number, required: true },
        category: String,
      },
    ],
    totalEstimatedCost: {
      type: Number,
      required: true,
      default: 0,
    },
    // Approval & Status
    status: {
      type: String,
      enum: ['Proposed', 'Pending Approval', 'Approved', 'Rejected', 'Disbursed', 'Voided'],
      default: 'Proposed',
      index: true,
    },
    approvalStatus: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvalDate: Date,
      rejectionReason: String,
      justification: String, // For overrides
    },
    // Override Information
    isOverride: {
      type: Boolean,
      default: false,
    },
    overrideReason: String,
    overrideJustification: String,
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    overrideDate: Date,
    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Disbursement Tracking
    disbursementData: {
      disbursedDate: Date,
      disbursedAmount: Number,
      disbursementMethod: String,
      referenceNumber: String,
    },
  },
  {
    timestamps: true,
    collection: 'aid_allocation_requests',
  }
);

// Index for finding allocations by disaster and status
aidAllocationRequestSchema.index({ disasterId: 1, status: 1 });
aidAllocationRequestSchema.index({ householdId: 1, disasterId: 1 });

export default mongoose.model('AidAllocationRequest', aidAllocationRequestSchema);
