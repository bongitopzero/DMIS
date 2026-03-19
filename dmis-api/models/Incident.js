import mongoose from "mongoose";


const IncidentSchema = new mongoose.Schema({
  disasterType: { type: String, required: true },
  district: { type: String, required: true },
  householdsAffected: { type: Number, required: true },
  severityIndex: { type: Number, required: true },
  verifiedStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
}, { timestamps: true });

// Prevent duplicate incidents: same disasterType, district, and createdAt day
IncidentSchema.index(
  { disasterType: 1, district: 1, householdsAffected: 1, severityIndex: 1 },
  { unique: true, partialFilterExpression: { disasterType: { $exists: true }, district: { $exists: true } } }
);

// Normalize district helper (same logic as Disaster)
function normalizeDistrictNameIncident(val) {
  if (!val) return val;
  let s = val.toString().trim();
  s = s.replace(/[’‘]/g, "'");
  s = s.replace(/\s+/g, ' ');
  s = s.toLowerCase()
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return s;
}

IncidentSchema.pre('save', function () {
  if (this.district) this.district = normalizeDistrictNameIncident(this.district);
});

IncidentSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (!update) return;
  if (update.district) update.district = normalizeDistrictNameIncident(update.district);
  if (update.$set && update.$set.district) update.$set.district = normalizeDistrictNameIncident(update.$set.district);
});

export default mongoose.model("Incident", IncidentSchema);
