import mongoose from "mongoose";

const adjustmentLogSchema = new mongoose.Schema(
  {
    action: { type: String },
    actor: { type: String },
    notes: { type: String },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const approvalSchema = new mongoose.Schema(
  {
    role: { type: String },
    name: { type: String },
    decision: { type: String, enum: ["approved", "rejected"] },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const budgetAdjustmentRequestSchema = new mongoose.Schema(
  {
    fromType: { type: String, required: true },
    toType: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedBy: { type: String, required: true },
    approvals: { type: [approvalSchema], default: [] },
    logs: { type: [adjustmentLogSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("BudgetAdjustmentRequest", budgetAdjustmentRequestSchema);
