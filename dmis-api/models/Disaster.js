import mongoose from "mongoose";

const DisasterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["drought", "heavy_rainfall", "strong_winds"]
    },
    district: {
      type: String,
      required: true
    },
    village: {
      type: String,
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    affectedPopulation: {
      type: Number,
      required: true
    },
    damages: {
      type: String,
      required: true
    },
    needs: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Disaster", DisasterSchema);
