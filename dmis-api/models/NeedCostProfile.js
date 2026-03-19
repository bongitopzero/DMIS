import mongoose from "mongoose";

const needSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    costPerHousehold: { type: Number, required: true },
    costPerPerson: { type: Number, required: true },
  },
  { _id: false }
);

const needCostProfileSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      enum: ["drought", "heavy_rainfall", "strong_winds"],
      required: true,
      unique: true,
    },
    costPerHectare: { type: Number, default: 0 },
    needs: { type: [needSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("NeedCostProfile", needCostProfileSchema);
