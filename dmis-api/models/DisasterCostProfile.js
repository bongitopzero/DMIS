import mongoose from "mongoose";

const disasterCostProfileSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      enum: ["drought", "heavy_rainfall", "strong_winds"],
      required: true,
      unique: true,
    },
    costPerHousehold: { type: Number, required: true },
    costPerPerson: { type: Number, required: true },
    costPerLivestockUnit: { type: Number, required: true },
    costPerFarmingHousehold: { type: Number, required: true },
    operationalRate: { type: Number, required: true },
    contingencyRate: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("DisasterCostProfile", disasterCostProfileSchema);
