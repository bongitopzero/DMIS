import mongoose from "mongoose";

const incidentExpenditureSchema = new mongoose.Schema(
  {
    incidentFundId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentFund", required: true },
    category: { type: String, enum: ["Direct Relief", "Infrastructure", "Operations"], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    recordedBy: { type: String, required: true },
    date: { type: Date, default: Date.now },
    overrideApproved: { type: Boolean, default: false },
    receiptUrl: { type: String },
    approvalStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("IncidentExpenditure", incidentExpenditureSchema);
