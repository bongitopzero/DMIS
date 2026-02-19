import mongoose from "mongoose";

const fundRequestSchema = new mongoose.Schema(
  {
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Disaster", required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    requestedBy: { type: String, required: true },
    approvedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("FundRequest", fundRequestSchema);
