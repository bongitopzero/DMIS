import mongoose from "mongoose";

const baselineAllocationSchema = new mongoose.Schema(
  {
    disasterType: { type: String, required: true },
    allocationPercent: { type: Number, required: true },
    baselineAmount: { type: Number, required: true },
  },
  { _id: false }
);

const baselineBudgetSchema = new mongoose.Schema(
  {
    fiscalYear: { type: String, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ["draft", "approved", "locked"], default: "draft" },
    allocations: { type: [baselineAllocationSchema], default: [] },
    createdBy: { type: String, default: "System" },
    approvedBy: { type: String },
    approvals: [
      {
        role: { type: String },
        name: { type: String },
        decision: { type: String, enum: ["approved", "rejected"] },
        date: { type: Date, default: Date.now },
      },
    ],
    lockedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("BaselineBudget", baselineBudgetSchema);
