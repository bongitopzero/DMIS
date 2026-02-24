import dotenv from "dotenv";
import mongoose from "mongoose";
import Disaster from "../models/Disaster.js";
import IncidentImpact from "../models/IncidentImpact.js";
import IncidentFinancialSnapshot from "../models/IncidentFinancialSnapshot.js";
import NeedCostProfile from "../models/NeedCostProfile.js";

dotenv.config();

const toPopulationRange = (value) => {
  if (!Number.isFinite(value)) return "0-50";
  if (value <= 50) return "0-50";
  if (value <= 100) return "51-100";
  if (value <= 250) return "101-250";
  if (value <= 500) return "251-500";
  if (value <= 1000) return "501-1000";
  if (value <= 2500) return "1001-2500";
  if (value <= 5000) return "2501-5000";
  return "5000+";
};

const toHouseholdRange = (value) => {
  if (!Number.isFinite(value)) return "0-10";
  if (value <= 10) return "0-10";
  if (value <= 25) return "11-25";
  if (value <= 50) return "26-50";
  if (value <= 100) return "51-100";
  if (value <= 250) return "101-250";
  if (value <= 500) return "251-500";
  return "500+";
};

const isBlank = (value) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");

const regionMap = {
  Maseru: "North Area",
  Berea: "North Area",
  Leribe: "North Area",
  "Butha-Buthe": "North Area",
  Mafeteng: "South Area",
  "Mohale's Hoek": "South Area",
  Quthing: "South Area",
  Mokhotlong: "East Area",
  "Thaba-Tseka": "East Area",
  "Qacha's Nek": "West Area",
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const disasters = await Disaster.find();
  let updatedCount = 0;

  for (const disaster of disasters) {
    const impact = await IncidentImpact.findOne({ disasterId: disaster._id });
    const snapshot = await IncidentFinancialSnapshot.findOne({ disasterId: disaster._id });
    let changed = false;

    if (isBlank(disaster.type) && impact?.disasterType) {
      disaster.type = impact.disasterType;
      changed = true;
    }

    if (isBlank(disaster.district)) {
      disaster.district = "Unknown";
      changed = true;
    }

    if (isBlank(disaster.region) && disaster.district) {
      disaster.region = regionMap[disaster.district] || "North Area";
      changed = true;
    }

    if (isBlank(disaster.location) && disaster.district) {
      disaster.location = `${disaster.district} Central`;
      changed = true;
    }

    if (isBlank(disaster.affectedPopulation) && impact?.individualsAffected) {
      disaster.affectedPopulation = toPopulationRange(impact.individualsAffected);
      changed = true;
    }

    if (isBlank(disaster.households) && impact?.householdsAffected) {
      disaster.households = toHouseholdRange(impact.householdsAffected);
      changed = true;
    }

    if ((disaster.affectedHouses === null || disaster.affectedHouses === undefined || disaster.affectedHouses === 0) && impact) {
      const tier = impact.tierBreakdown || {};
      const tierTotal = (tier.tierA || 0) + (tier.tierB || 0) + (tier.tierC || 0);
      disaster.affectedHouses = tierTotal || Math.round((impact.householdsAffected || 0) * 0.1);
      changed = true;
    }

    if (isBlank(disaster.damages)) {
      disaster.damages = "Auto-filled from incident impact";
      changed = true;
    }

    if (isBlank(disaster.needs)) {
      const needsProfile = await NeedCostProfile.findOne({ disasterType: disaster.type });
      const needs = needsProfile?.needs?.map((item) => item.name).filter(Boolean).join(", ");
      disaster.needs = needs || "Food, Water";
      changed = true;
    }

    if (isBlank(disaster.severity) && impact?.severityLevel) {
      disaster.severity = impact.severityLevel;
      changed = true;
    }

    if ((disaster.damageCost === null || disaster.damageCost === undefined || disaster.damageCost === 0) && snapshot) {
      disaster.damageCost = Math.round((snapshot.housingCost || 0) + (snapshot.baseCost || 0) * 0.25);
      changed = true;
    }

    if (changed) {
      await disaster.save();
      updatedCount += 1;
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} incidents.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});
