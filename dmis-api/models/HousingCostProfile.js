import mongoose from "mongoose";

const housingCostProfileSchema = new mongoose.Schema(
  {
    tierA: { type: Number, required: true },
    tierB: { type: Number, required: true },
    tierC: { type: Number, required: true },
    damageMultipliers: {
      partial: { type: Number, required: true },
      severe: { type: Number, required: true },
      destroyed: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("HousingCostProfile", housingCostProfileSchema);
