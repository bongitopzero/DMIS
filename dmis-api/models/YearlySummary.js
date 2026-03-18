import mongoose from 'mongoose';

const YearlySummarySchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  incidentsCount: { type: Number, default: 0 },
  disastersCount: { type: Number, default: 0 },
  verifiedIncidents: { type: Number, default: 0 },
  totalAffectedPopulation: { type: Number, default: 0 },
  totalAllocatedFunds: { type: Number, default: 0 },
  totalRequestedFunds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('YearlySummary', YearlySummarySchema);
