import mongoose from "mongoose";

const annualBudgetSchema = new mongoose.Schema(
  {
    fiscalYear: { type: String, required: true, unique: true },
    totalAllocated: { type: Number, required: true },
    reservedForForecast: { type: Number, default: 0 },
    committed: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("AnnualBudget", annualBudgetSchema);
