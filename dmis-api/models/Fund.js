import mongoose from "mongoose";

const fundSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    allocatedAmount: { type: Number, required: true },
    expenses: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Closed", "Pending"], default: "Active" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Fund", fundSchema);
