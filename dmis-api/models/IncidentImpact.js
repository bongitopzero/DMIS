import mongoose from "mongoose";

const incidentImpactSchema = new mongoose.Schema(
  {
    disasterId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true, unique: true },
    disasterType: { type: String, required: true },
    householdsAffected: { type: Number, required: true },
    individualsAffected: { type: Number, required: true },
    livestockAffected: { type: Number, default: 0 },
    farmingHouseholds: { type: Number, default: 0 },
    tierBreakdown: {
      tierA: { type: Number, default: 0 },
      tierB: { type: Number, default: 0 },
      tierC: { type: Number, default: 0 },
    },
    severityLevel: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("IncidentImpact", incidentImpactSchema);
