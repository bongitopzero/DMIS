import mongoose from "mongoose";

const incidentFundSchema = new mongoose.Schema(
  {
    disasterId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true, unique: true },
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentFinancialSnapshot", required: true },
    disasterType: { type: String, required: true },
    baseBudget: { type: Number, required: true },
    needsCost: { type: Number, default: 0 },
    adjustmentCost: { type: Number, default: 0 },
    adjustedBudget: { type: Number, required: true },
    committed: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    adjustments: {
      houseTier: { type: String, enum: ["TierA", "TierB", "TierC"], default: "TierA" },
      damagedLandHectares: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

export default mongoose.model("IncidentFund", incidentFundSchema);
