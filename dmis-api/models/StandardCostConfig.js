import mongoose from "mongoose";

const standardCostConfigSchema = new mongoose.Schema(
  {
    financialYear: { type: String, required: true },
    costPerPartialHouse: { type: Number, required: true },
    costPerSevereHouse: { type: Number, required: true },
    costPerDestroyedHouse: { type: Number, required: true },
    costPerSchool: { type: Number, required: true },
    costPerClinic: { type: Number, required: true },
    costPerKmRoad: { type: Number, required: true },
    costPerLivestockUnit: { type: Number, required: true },
    logisticsRate: { type: Number, required: true },
    contingencyPercentage: { type: Number, required: true },
    severityMultipliers: {
      low: { type: Number, required: true },
      medium: { type: Number, required: true },
      high: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

standardCostConfigSchema.index({ financialYear: 1 }, { unique: true });

export default mongoose.model("StandardCostConfig", standardCostConfigSchema);
