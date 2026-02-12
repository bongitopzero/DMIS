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
      type: String,
      required: true
    },
    households: {
      type: String,
      default: "0-10"
    },
    affectedHouses: {
      type: Number,
      default: 0
    },
    location: {
      type: String,
      default: null
    },
    damages: {
      type: String,
      required: true
    },
    damageCost: {
      type: Number,
      default: 0
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
    status: {
      type: String,
      enum: ["reported", "verified", "responding", "closed"],
      default: "reported"
    },
    date: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationNotes: {
      type: String,
      default: null
    },
    source: {
      type: String,
      default: "Manual Entry"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Disaster", DisasterSchema);
