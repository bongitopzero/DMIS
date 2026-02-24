// routes/disasters.js
import express from "express";
import Disaster from "../models/Disaster.js";
import DisasterCostProfile from "../models/DisasterCostProfile.js";
import HousingCostProfile from "../models/HousingCostProfile.js";
import IncidentImpact from "../models/IncidentImpact.js";
import IncidentFinancialSnapshot from "../models/IncidentFinancialSnapshot.js";
import NeedCostProfile from "../models/NeedCostProfile.js";
import IncidentFund from "../models/IncidentFund.js";
import DisasterBudgetEnvelope from "../models/DisasterBudgetEnvelope.js";
import StandardCostConfig from "../models/StandardCostConfig.js";
import AuditLog from "../models/AuditLog.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const getYearRange = (yearParam) => {
  if (yearParam === "all") return null;
  const now = new Date();
  const numericYear = Number(yearParam);
  const year = Number.isFinite(numericYear) ? numericYear : now.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return { start, end };
};

// District coordinates mapping (lowercase keys for case-insensitive matching)
const districtCoordinates = {
  "berea": [-29.3, 28.3],
  "butha-buthe": [-29.1, 28.7],
  "leribe": [-29.3, 28.0],
  "mafeteng": [-29.7, 27.7],
  "maseru": [-29.6, 27.5],
  "mohale's hoek": [-30.1, 28.1],
  "mokhotlong": [-30.4, 29.3],
  "qacha's nek": [-30.7, 29.1],
  "quthing": [-30.7, 28.9],
  "thaba-tseka": [-29.5, 29.2]
};

const parseRangeValue = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const raw = String(value).replace(/[^0-9\-+]/g, "");
  if (!raw) return 0;
  if (raw.includes("-")) {
    const [min, max] = raw.split("-").map((n) => Number(n));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return Math.round((min + max) / 2);
    }
  }
  if (raw.endsWith("+")) {
    const base = Number(raw.replace("+", ""));
    return Number.isFinite(base) ? base : 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStandardCostConfig = async (financialYear) => {
  const latest = await StandardCostConfig.findOne(
    financialYear ? { financialYear } : {}
  ).sort({ createdAt: -1 });

  if (latest) return latest;

  return {
    costPerPartialHouse: 3000,
    costPerSevereHouse: 6000,
    costPerDestroyedHouse: 15000,
    costPerSchool: 150000,
    costPerClinic: 200000,
    costPerKmRoad: 80000,
    costPerLivestockUnit: 250,
    logisticsRate: 0.05,
    contingencyPercentage: 0.07,
    severityMultipliers: { low: 0.9, medium: 1.0, high: 1.2 },
  };
};

const logAudit = async (req, action, entityType, entityId, details = {}) => {
  try {
    await AuditLog.create({
      action,
      actorId: req.user?._id || null,
      actorName: req.user?.name || "System",
      actorRole: req.user?.role || "System",
      entityType,
      entityId,
      details,
    });
  } catch (error) {
    console.error("Failed to write audit log", error.message);
  }
};

const computeDisasterFinancials = async (payload = {}) => {
  const householdDetails = Array.isArray(payload.householdDamageDetails)
    ? payload.householdDamageDetails
    : [];

  const config = await getStandardCostConfig(payload.financialYear);

  let partialCount = 0;
  let severeCount = 0;
  let destroyedCount = 0;
  let livestockLostCount = 0;

  householdDetails.forEach((detail) => {
    const damageLevel = detail?.damageLevel || "partial";
    if (damageLevel === "destroyed") destroyedCount += 1;
    else if (damageLevel === "severe") severeCount += 1;
    else partialCount += 1;
    livestockLostCount += parseNumber(detail?.livestockLost);
  });

  const affectedHouses = parseNumber(payload.affectedHouses);
  if (householdDetails.length === 0 && affectedHouses > 0) {
    partialCount = affectedHouses;
  }

  const householdCost =
    partialCount * config.costPerPartialHouse +
    severeCount * config.costPerSevereHouse +
    destroyedCount * config.costPerDestroyedHouse;

  const infrastructureCost =
    parseNumber(payload.schoolsDamaged) * config.costPerSchool +
    parseNumber(payload.clinicsDamaged) * config.costPerClinic +
    parseNumber(payload.roadsDamagedKm) * config.costPerKmRoad;

  const livelihoodLossCost = livestockLostCount * config.costPerLivestockUnit;

  const baseCost = householdCost + infrastructureCost + livelihoodLossCost;
  const severityMultiplier =
    config.severityMultipliers?.[payload.severity] || config.severityMultipliers?.medium || 1;
  const adjustedCost = baseCost * severityMultiplier;
  const logisticsCost = adjustedCost * config.logisticsRate;
  const contingencyCost = adjustedCost * config.contingencyPercentage;
  const totalEstimatedRequirement = adjustedCost + logisticsCost + contingencyCost;

  return {
    householdCost,
    infrastructureCost,
    livelihoodLossCost,
    baseCost,
    adjustedCost,
    logisticsCost,
    contingencyCost,
    severityMultiplier,
    totalEstimatedRequirement,
  };
};

const computeTierBreakdown = (affectedHouses = 0) => {
  const total = Math.max(affectedHouses, 0);
  const tierA = Math.round(total * 0.5);
  const tierB = Math.round(total * 0.3);
  const tierC = Math.max(total - tierA - tierB, 0);
  return { tierA, tierB, tierC };
};

const severityToDamageMultiplier = (severity, multipliers) => {
  if (severity === "high") return multipliers.destroyed;
  if (severity === "medium") return multipliers.severe;
  return multipliers.partial;
};

const computeNeedsCost = (impact, needProfile) => {
  if (!impact || !needProfile) return 0;
  return needProfile.needs.reduce((sum, need) => {
    const householdCost = (impact.householdsAffected || 0) * (need.costPerHousehold || 0);
    const personCost = (impact.individualsAffected || 0) * (need.costPerPerson || 0);
    return sum + householdCost + personCost;
  }, 0);
};

// Create disaster (protected)
router.post("/", protect, async (req, res) => {
  try {
    console.log("📝 Creating disaster with data:", req.body);
    if (req.body.approvalStatus === "approved") {
      const role = req.user?.role;
      if (!["Coordinator", "Finance Officer", "Administrator"].includes(role)) {
        return res.status(403).json({ message: "Approval requires Coordinator or Finance Officer" });
      }
    }
    const financials = await computeDisasterFinancials(req.body);
    const districtKey = req.body.district ? req.body.district.toLowerCase() : "";
    const coords = districtCoordinates[districtKey] || [-29.6, 27.5];
    
    const disaster = await Disaster.create({
      ...req.body,
      ...financials,
      latitude: coords[0],
      longitude: coords[1],
      reportedBy: req.user._id
    });

    await logAudit(req, "incident_created", "Disaster", disaster._id, {
      district: disaster.district,
      type: disaster.type,
      severity: disaster.severity,
      approvalStatus: disaster.approvalStatus,
      status: disaster.status,
    });

    console.log("✅ Disaster created successfully:", disaster._id);
    res.status(201).json(disaster);
  } catch (err) {
    console.error("❌ Error creating disaster:", err.message);
    console.error("Error details:", err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message,
      details: err.errors 
    });
  }
});

// Get all disasters (protected)
router.get("/", protect, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const filter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
    if (req.user?.role === "Data Clerk") {
      filter.reportedBy = req.user._id;
    }
    const disasters = await Disaster.find(filter)
      .populate("reportedBy", "name email");
    res.json(disasters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update disaster (protected)
router.put("/:id", protect, async (req, res) => {
  try {
    console.log("📝 Updating disaster:", req.params.id, "with data:", req.body);

    const existingDisaster = await Disaster.findById(req.params.id);
    if (!existingDisaster) {
      return res.status(404).json({ message: "Disaster not found" });
    }

    if (req.body.approvalStatus === "approved") {
      const role = req.user?.role;
      if (!["Coordinator", "Finance Officer", "Administrator"].includes(role)) {
        return res.status(403).json({ message: "Approval requires Coordinator or Finance Officer" });
      }
    }

    const nextApprovalStatus = req.body.approvalStatus ?? existingDisaster.approvalStatus;
    const nextStatus = req.body.status ?? existingDisaster.status;
    if (nextStatus === "closed" && nextApprovalStatus !== "approved") {
      return res.status(400).json({ message: "Incident must be approved before closure" });
    }
    
    let updateData = { ...req.body, ...(await computeDisasterFinancials(req.body)) };
    
    // Only update coordinates if district is provided
    if (req.body.district) {
      const districtKey = req.body.district.toLowerCase();
      const coords = districtCoordinates[districtKey] || [-29.6, 27.5];
      updateData.latitude = coords[0];
      updateData.longitude = coords[1];
    }

    const disaster = await Disaster.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("reportedBy", "name email");

    if (req.body.approvalStatus === "approved" && existingDisaster.approvalStatus !== "approved") {
      await logAudit(req, "incident_approved", "Disaster", existingDisaster._id, {
        previousStatus: existingDisaster.status,
        approvalStatus: req.body.approvalStatus,
      });
    }

    if (req.body.status === "closed" && existingDisaster.status !== "closed") {
      await logAudit(req, "incident_closed", "Disaster", existingDisaster._id, {
        approvalStatus: req.body.approvalStatus ?? existingDisaster.approvalStatus,
      });
    }

    if ((req.body.status === "closed" || req.body.approvalStatus === "approved") && disaster) {
      const existingSnapshot = await IncidentFinancialSnapshot.findOne({ disasterId: disaster._id });
      if (!existingSnapshot) {
        const disasterType = disaster.type;
        const householdsAffected = parseRangeValue(disaster.households);
        const exactAffected = parseNumber(disaster.totalAffectedPopulation);
        const individualsAffected = exactAffected || parseRangeValue(disaster.affectedPopulation) || householdsAffected * 5;
        const farmingHouseholds = Math.round(householdsAffected * 0.2);
        const livestockAffected = Math.round(householdsAffected * 0.3);
        const affectedHouses = disaster.affectedHouses || Math.round(householdsAffected * 0.1);
        const tierBreakdown = computeTierBreakdown(affectedHouses);

        const impact = await IncidentImpact.create({
          disasterId: disaster._id,
          disasterType,
          householdsAffected,
          individualsAffected,
          livestockAffected,
          farmingHouseholds,
          tierBreakdown,
          severityLevel: disaster.severity || "medium",
        });

        const financials = await computeDisasterFinancials(disaster);
        await IncidentFinancialSnapshot.create({
          disasterId: disaster._id,
          impactId: impact._id,
          baseCost: financials.baseCost,
          housingCost: financials.householdCost,
          householdCost: financials.householdCost,
          infrastructureCost: financials.infrastructureCost,
          livelihoodLossCost: financials.livelihoodLossCost,
          adjustedCost: financials.adjustedCost,
          logisticsCost: financials.logisticsCost,
          operationalCost: financials.logisticsCost,
          contingencyCost: financials.contingencyCost,
          totalBudget: financials.totalEstimatedRequirement,
          severityMultiplier: financials.severityMultiplier,
          forecastRiskLevel: "Low",
        });
      }

      const snapshot = await IncidentFinancialSnapshot.findOne({ disasterId: disaster._id });
      if (snapshot) {
        const impact = await IncidentImpact.findOne({ disasterId: disaster._id });
        const needProfile = await NeedCostProfile.findOne({ disasterType: disaster.type });
        const needsCost = computeNeedsCost(impact, needProfile);
        const adjustedBudget = snapshot.totalBudget + needsCost;

        const existingFund = await IncidentFund.findOne({ disasterId: disaster._id });
        if (!existingFund) {
          const envelope = await DisasterBudgetEnvelope.findOne({ disasterType: disaster.type });
          if (envelope && envelope.remaining < adjustedBudget) {
            await logAudit(req, "pool_insufficient", "Disaster", disaster._id, {
              disasterType: disaster.type,
              required: adjustedBudget,
              remaining: envelope.remaining,
            });
            return res.status(409).json({
              message: "Insufficient pool balance. Reallocation workflow required.",
            });
          }

          const createdFund = await IncidentFund.create({
            disasterId: disaster._id,
            snapshotId: snapshot._id,
            disasterType: disaster.type,
            baseBudget: snapshot.totalBudget,
            needsCost,
            adjustmentCost: 0,
            adjustedBudget,
            committed: adjustedBudget,
            spent: 0,
            remaining: adjustedBudget,
            adjustments: { houseTier: "TierA", damagedLandHectares: 0 },
          });

          await logAudit(req, "incident_fund_created", "IncidentFund", createdFund._id, {
            disasterId: disaster._id,
            adjustedBudget,
            disasterType: disaster.type,
          });

          if (envelope) {
            envelope.committed += adjustedBudget;
            envelope.remaining = Math.max(0, envelope.totalAllocated - envelope.committed - envelope.spent);
            await envelope.save();
          }
        }
      }
    }

    console.log("✅ Disaster updated successfully:", disaster._id);
    res.json(disaster);
  } catch (err) {
    console.error("❌ Error updating disaster:", err.message, err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Delete disaster (protected)
router.delete("/:id", protect, async (req, res) => {
  try {
    const disaster = await Disaster.findByIdAndDelete(req.params.id);

    if (!disaster) {
      return res.status(404).json({ message: "Disaster not found" });
    }

    res.json({ message: "Disaster deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
