import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    fiscalYear: { type: Number, required: true, unique: true },
    allocatedBudget: { type: Number, required: true },
    committedFunds: { type: Number, default: 0 },
    spentFunds: { type: Number, default: 0 },
    remainingBudget: { type: Number, default: 0 },
    financialRisk: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Budget", budgetSchema);
