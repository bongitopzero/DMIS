import mongoose from "mongoose";

const incidentFinancialSnapshotSchema = new mongoose.Schema(
  {
    disasterId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true, unique: true },
    impactId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentImpact", required: true },
    baseCost: { type: Number, required: true },
    housingCost: { type: Number, required: true },
    householdCost: { type: Number, default: 0 },
    infrastructureCost: { type: Number, default: 0 },
    livelihoodLossCost: { type: Number, default: 0 },
    adjustedCost: { type: Number, default: 0 },
    logisticsCost: { type: Number, default: 0 },
    severityMultiplier: { type: Number, default: 1 },
    operationalCost: { type: Number, required: true },
    contingencyCost: { type: Number, required: true },
    totalBudget: { type: Number, required: true },
    forecastRiskLevel: { type: String, default: "Low" },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("IncidentFinancialSnapshot", incidentFinancialSnapshotSchema);
