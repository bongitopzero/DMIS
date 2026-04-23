import mongoose from 'mongoose';

const allocationPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
    },
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disaster',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    planDate: {
      type: Date,
      default: Date.now,
    },
    totalHouseholdsAssessed: {
      type: Number,
      default: 0,
    },
    totalHouseholdsCovered: {
      type: Number,
      default: 0,
    },
    totalBudgetRequired: {
      type: Number,
      default: 0,
    },
    allocations: [
      {
        householdId: String,
        householdName: String,
        aidAllocationRequestId: mongoose.Schema.Types.ObjectId,
        compositeScore: Number,
        aidTier: String,
        packages: [
          {
            packageId: String,
            packageName: String,
            quantity: Number,
            unitCost: Number,
            totalCost: Number,
          },
        ],
        subtotal: Number,
      },
    ],
    procurementSummary: [
      {
        packageId: String,
        packageName: String,
        category: String,
        totalQuantity: Number,
        unitCost: Number,
        totalCost: Number,
      },
    ],
    vulnerabilityDistribution: {
      tier0_3: {
        count: Number,
        percentage: String,
      },
      tier4_6: {
        count: Number,
        percentage: String,
      },
      tier7_9: {
        count: Number,
        percentage: String,
      },
      tier10Plus: {
        count: Number,
        percentage: String,
      },
    },
    disasterTypeBreakdown: {
      heavyRainfall: {
        count: Number,
        totalCost: Number,
      },
      strongWinds: {
        count: Number,
        totalCost: Number,
      },
      drought: {
        count: Number,
        totalCost: Number,
      },
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Implemented'],
      default: 'Draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, collection: 'allocationplans' }
);

export default mongoose.model('AllocationPlan', allocationPlanSchema);
