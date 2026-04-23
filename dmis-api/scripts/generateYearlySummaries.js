#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Disaster from '../models/Disaster.js';
import Incident from '../models/Incident.js';
import Allocation from '../models/BudgetAllocation.js';

dotenv.config();

async function startOfYear(year) { return new Date(Date.UTC(year,0,1)); }
async function endOfYear(year) { return new Date(Date.UTC(year+1,0,1)); }

async function generate(year) {
  const start = await startOfYear(year);
  const end = await endOfYear(year);

  const incidentsCount = await Incident.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const disastersCount = await Disaster.countDocuments({ date: { $gte: start, $lt: end } });
  const verifiedIncidents = await Incident.countDocuments({ verifiedStatus: 'verified', updatedAt: { $gte: start, $lt: end } });

  const disasters = await Disaster.find({ date: { $gte: start, $lt: end } }).select('totalAffectedPopulation totalEstimatedRequirement');
  let totalAffectedPopulation = 0;
  let totalRequestedFunds = 0;
  for (const d of disasters) {
    totalAffectedPopulation += Number(d.totalAffectedPopulation || 0);
    totalRequestedFunds += Number(d.totalEstimatedRequirement || 0);
  }

  let totalAllocatedFunds = 0;
  try {
    const allocs = await Allocation.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, sum: { $sum: '$amount' } } }
    ]);
    totalAllocatedFunds = allocs?.[0]?.sum || 0;
  } catch (e) {
    // ignore if collection missing
  }

  const doc = await YearlySummary.findOneAndUpdate({ year }, {
    year,
    incidentsCount,
    disastersCount,
    verifiedIncidents,
    totalAffectedPopulation,
    totalAllocatedFunds,
    totalRequestedFunds,
  }, { upsert: true, new: true });

  console.log('Yearly summary saved for', year);
  return doc;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const now = new Date();
  const currentYear = now.getFullYear();
  // generate for previous 3 years as default
  for (let y = currentYear-3; y <= currentYear-1; y++) {
    await generate(y);
  }
  await mongoose.disconnect();
  console.log('Yearly summaries generated.');
}

run().catch(e=>{console.error(e); process.exit(1);});
