import mongoose from 'mongoose';

/**
 * AllocationPlan Schema
 * Comprehensive plan for disaster aid allocation with itemized procurement
 */
const allocationPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      unique: true,
      index: true,
    },
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: [true, 'Disaster ID is required'],
      index: true,
    },
    planName: {
      type: String,
      required: true,
    },
    planDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Plan Summary
    totalHouseholdsAssessed: Number,
    totalHouseholdsCovered: Number,
    totalBudgetRequired: {
      type: Number,
      required: true,
      default: 0,
    },
    // Itemized Allocation
    allocations: [
      {
        householdId: String,
        householdName: String,
        aidAllocationRequestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AidAllocationRequest',
        },
        compositeScore: Number,
        aidTier: String,
        packages: [
          {
            packageId: String,
            packageName: String,
            quantity: Number,
            unitCost: Number,
            totalCost: Number,
            category: String,
          },
        ],
        subtotal: Number,
      },
    ],
    // Procurement Breakdown
    procurementSummary: [
      {
        packageId: String,
        packageName: String,
        category: String,
        totalQuantity: Number,
        unitCost: Number,
        totalCost: Number,
        vendors: [
          {
            vendorName: String,
            quantity: Number,
            unitPrice: Number,
            totalPrice: Number,
            contactInfo: String,
          },
        ],
      },
    ],
    // Vulnerability Distribution
    vulnerabilityDistribution: {
      tier0_3: { count: Number, percentage: Number },
      tier4_6: { count: Number, percentage: Number },
      tier7_9: { count: Number, percentage: Number },
      tier10Plus: { count: Number, percentage: Number },
    },
    // Disaster Type Breakdown
    disasterTypeBreakdown: {
      heavyRainfall: { count: Number, totalCost: Number },
      strongWinds: { count: Number, totalCost: Number },
      drought: { count: Number, totalCost: Number },
    },
    // Status
    status: {
      type: String,
      enum: ['Draft', 'Pending Review', 'Approved', 'In Progress', 'Completed', 'Voided'],
      default: 'Draft',
      index: true,
    },
    approvalStatus: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvalDate: Date,
      reviewComments: String,
    },
    // Execution Tracking
    executionStatus: {
      startDate: Date,
      expectedCompletionDate: Date,
      actualCompletionDate: Date,
      percentageComplete: { type: Number, default: 0, min: 0, max: 100 },
    },
    // Audit & Governance
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  {
    timestamps: true,
    collection: 'allocation_plans',
  }
);

// Index for finding plans by disaster
allocationPlanSchema.index({ disasterId: 1, status: 1 });

export default mongoose.model('AllocationPlan', allocationPlanSchema);
