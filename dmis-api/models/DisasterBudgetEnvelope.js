import mongoose from "mongoose";

const disasterBudgetEnvelopeSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      enum: ["drought", "heavy_rainfall", "strong_winds"],
      required: true,
      unique: true,
    },
    totalAllocated: { type: Number, required: true },
    committed: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("DisasterBudgetEnvelope", disasterBudgetEnvelopeSchema);
