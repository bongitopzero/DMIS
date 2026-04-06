import mongoose from "mongoose";

const DisasterSchema = new mongoose.Schema(
  {
    incidentTitle: { type: String, default: null },
    disasterCategory: { type: String, default: null },
    financialYear: { type: String, default: null },
    occurrenceDate: { type: Date, default: null },
    occurrenceTime: { type: String, default: null },
    reportDate: { type: Date, default: null },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    type: {
      type: String,
      required: true,
      enum: ["drought", "heavy_rainfall", "strong_winds"],
    },
    district: { type: String, required: true },
    region: {
      type: String,
      enum: ["North Area", "South Area", "East Area", "West Area"],
      default: null,
    },
    village: { type: String, default: null },
    constituency: { type: String, default: null },
    communityCouncil: { type: String, default: null },
    ward: { type: String, default: null },
    areaClassification: {
      type: String,
      enum: ["rural", "urban", "peri-urban"],
      default: null,
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    affectedPopulation: { type: String, required: true },
    totalAffectedPopulation: { type: Number, default: 0 },
    numberOfHouseholdsAffected: { type: Number, default: 0 },
    households: { type: String, default: "0-10" },
    totalAffectedHouseholds: { type: Number, default: 0 },
    affectedHouses: { type: Number, default: 0 },
    malePopulation: { type: Number, default: 0 },
    femalePopulation: { type: Number, default: 0 },
    childrenCount: { type: Number, default: 0 },
    elderlyCount: { type: Number, default: 0 },
    disabledCount: { type: Number, default: 0 },
    childHeadedHouseholds: { type: Number, default: 0 },
    femaleHeadedHouseholds: { type: Number, default: 0 },
    vulnerableHouseholds: { type: Number, default: 0 },
    location: { type: String, default: null },
    damages: { type: String, required: true },
    damageCost: { type: Number, default: 0 },
    householdDamageDetails: [
      {
        householdId: { type: String, default: null },
        headName: { type: String, default: null },
        nationalId: { type: String, default: null },
        contactNumber: { type: String, default: null },
        village: { type: String, default: null },
        structureType: { type: String, default: null },
        roofType: { type: String, default: null },
        conditionBefore: { type: String, default: null },
        damageLevel: {
          type: String,
          enum: ["partial", "severe", "destroyed"],
          default: "partial",
        },
        estimatedRepairCost: { type: Number, default: 0 },
        estimatedRebuildCost: { type: Number, default: 0 },
        livestockLost: { type: Number, default: 0 },
        cropsLost: { type: String, default: null },
        assetsDamaged: { type: String, default: null },
        needsCategory: [{ type: String }],
      },
    ],
    schoolsDamaged: { type: Number, default: 0 },
    clinicsDamaged: { type: Number, default: 0 },
    roadsDamagedKm: { type: Number, default: 0 },
    bridgesDamaged: { type: Number, default: 0 },
    waterSystemsAffected: { type: Number, default: 0 },
    electricityDamage: { type: Number, default: 0 },
    publicBuildingsDamaged: { type: Number, default: 0 },
    infrastructureRepairCost: { type: Number, default: 0 },
    totalHouseholdRepairCost: { type: Number, default: 0 },
    totalReconstructionCost: { type: Number, default: 0 },
    totalInfrastructureCost: { type: Number, default: 0 },
    reliefAssistanceCost: { type: Number, default: 0 },
    logisticsCost: { type: Number, default: 0 },
    contingencyCost: { type: Number, default: 0 },
    totalEstimatedRequirement: { type: Number, default: 0 },
    linkedDisasterPoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DisasterBudgetEnvelope",
      default: null,
    },
    photosUrls: [{ type: String }],
    needs: { type: String, required: true },

    // ── SEVERITY ──────────────────────────────────────────────────────────────
    // Added "moderate" and "critical" — the frontend form sends these values.
    severity: {
      type: String,
      enum: ["low", "medium", "moderate", "high", "critical"],
      default: "medium",
    },

    // ── STATUS ────────────────────────────────────────────────────────────────
    // THE BUG FIX: "submitted" and "responding" were missing from this enum.
    //
    // When the Data Clerk clicked "Submit for Coordinator Approval" the
    // frontend called PUT /disasters/:id with { status: "submitted" }.
    // The route used findByIdAndUpdate(..., { runValidators: true }) which
    // ran Mongoose validation — "submitted" failed the enum check, so Mongoose
    // silently returned the OLD document unchanged. No error was thrown, so
    // the frontend received HTTP 200 but the status was never saved as
    // "submitted" in the database.  The coordinator dashboard therefore never
    // showed the disaster in the pending-approval list.
    status: {
      type: String,
      enum: ["reported", "submitted", "verified", "responding", "closed"],
      default: "reported",
    },

    date: { type: Date, default: Date.now },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    source: { type: String, default: "Manual Entry" },
  },
  { timestamps: true }
);

// ── Middleware ────────────────────────────────────────────────────────────────

function normalizeDistrictName(val) {
  if (!val) return val;
  let s = val.toString().trim();
  s = s.replace(/['']/g, "'");
  s = s.replace(/\s+/g, " ");
  s = s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return s;
}

DisasterSchema.pre("save", function () {
  if (this.district) this.district = normalizeDistrictName(this.district);
});

DisasterSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (!update) return;
  if (update.district) update.district = normalizeDistrictName(update.district);
  if (update.$set?.district)
    update.$set.district = normalizeDistrictName(update.$set.district);
});

// ── Indexes ───────────────────────────────────────────────────────────────────
DisasterSchema.index({ status: 1 });
DisasterSchema.index({ createdAt: -1 });
DisasterSchema.index({ district: 1 });
DisasterSchema.index({ type: 1, district: 1, date: 1 }, { unique: false });

export default mongoose.model("Disaster", DisasterSchema);