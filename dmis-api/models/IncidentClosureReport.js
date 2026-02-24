import mongoose from "mongoose";

const incidentClosureReportSchema = new mongoose.Schema(
  {
    incidentFundId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentFund", required: true },
    disasterId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true },
    totalAllocated: { type: Number, required: true },
    totalSpent: { type: Number, required: true },
    surplusReturned: { type: Number, required: true },
    generatedBy: { type: String, default: "System" },
  },
  { timestamps: true }
);

export default mongoose.model("IncidentClosureReport", incidentClosureReportSchema);
