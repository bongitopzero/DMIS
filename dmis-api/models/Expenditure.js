import mongoose from "mongoose";

const expenditureSchema = new mongoose.Schema(
  {
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true },
    amountSpent: { type: Number, required: true },
    description: { type: String, required: true },
    recordedBy: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Expenditure", expenditureSchema);
