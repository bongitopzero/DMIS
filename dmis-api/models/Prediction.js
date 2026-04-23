import mongoose from "mongoose";

const PredictionSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      required: true,
      enum: ["Heavy Rainfall", "Strong Winds", "Drought"],
    },
    district: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["Low", "Moderate", "Critical"],
    },
    season: {
      type: String,
      required: true,
      enum: ["Summer", "Autumn", "Winter", "Spring"],
    },
    numHouseholds: {
      type: Number,
      required: true,
      min: 1,
    },
    avgDamageLevel: {
      type:     Number,
      required: true,
      min:      1,
      max:      4,
    },
    estimatedFunding: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Prediction", PredictionSchema);