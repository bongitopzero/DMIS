import express from "express";
import { protect as authMiddleware } from "../middleware/auth.js";
import AnnualBudget from "../models/AnnualBudget.js";
import DisasterBudgetEnvelope from "../models/DisasterBudgetEnvelope.js";
import DisasterCostProfile from "../models/DisasterCostProfile.js";
import HousingCostProfile from "../models/HousingCostProfile.js";
import NeedCostProfile from "../models/NeedCostProfile.js";
import IncidentFinancialSnapshot from "../models/IncidentFinancialSnapshot.js";
import IncidentImpact from "../models/IncidentImpact.js";
import IncidentFund from "../models/IncidentFund.js";
import IncidentExpenditure from "../models/IncidentExpenditure.js";
import FundRequest from "../models/FundRequest.js";
import BaselineBudget from "../models/BaselineBudget.js";
import BudgetAdjustmentRequest from "../models/BudgetAdjustmentRequest.js";
import IncidentClosureReport from "../models/IncidentClosureReport.js";
import StandardCostConfig from "../models/StandardCostConfig.js";
import AuditLog from "../models/AuditLog.js";
import { generateForecast } from "../models/forecasting.js";

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

const refreshForecast = async () => {
  try {
    await generateForecast();
  } catch (error) {
    console.error("Forecast refresh failed", error.message);
  }
};

const DISASTER_RATIOS = {
  drought: 0.4,
  heavy_rainfall: 0.35,
  strong_winds: 0.25,
};

const ensureEnvelopes = async () => {
  const annualBudget = await AnnualBudget.findOne().sort({ fiscalYear: -1 });
  if (!annualBudget) return [];
  const envelopes = [];
  for (const [type, ratio] of Object.entries(DISASTER_RATIOS)) {
    const existing = await DisasterBudgetEnvelope.findOne({ disasterType: type });
    if (existing) {
      envelopes.push(existing);
      continue;
    }
    const totalAllocated = Math.round(annualBudget.totalAllocated * ratio);
    const created = await DisasterBudgetEnvelope.create({
      disasterType: type,
      totalAllocated,
      committed: 0,
      spent: 0,
      remaining: totalAllocated,
    });
    envelopes.push(created);
  }
  return envelopes;
};

const computeNeedsCost = (impact, needProfile) => {
  if (!impact || !needProfile) return 0;
  return needProfile.needs.reduce((sum, need) => {
    const householdCost = (impact.householdsAffected || 0) * (need.costPerHousehold || 0);
    const personCost = (impact.individualsAffected || 0) * (need.costPerPerson || 0);
    return sum + householdCost + personCost;
  }, 0);
};

const computeAdjustmentCost = (snapshot, housingProfile, adjustments, needProfile) => {
  if (!snapshot || !housingProfile) return 0;
  const tierMultipliers = {
    TierA: 1,
    TierB: 1.2,
    TierC: 1.45,
  };
  const housingMultiplier = tierMultipliers[adjustments.houseTier || "TierA"] || 1;
  const housingAdjustment = snapshot.housingCost * (housingMultiplier - 1);
  const landCost = (adjustments.damagedLandHectares || 0) * (needProfile?.costPerHectare || 0);
  return housingAdjustment + landCost;
};

router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const envelopes = await ensureEnvelopes();
    const annualBudget = await AnnualBudget.findOne().sort({ fiscalYear: -1 });
    const range = getYearRange(req.query.year);
    const fundFilter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
    const funds = await IncidentFund.find(fundFilter);
    const totals = funds.reduce(
      (acc, fund) => {
        acc.base += fund.baseBudget;
        acc.adjusted += fund.adjustedBudget;
        acc.committed += fund.committed;
        acc.spent += fund.spent;
        acc.remaining += fund.remaining;
        return acc;
      },
      { base: 0, adjusted: 0, committed: 0, spent: 0, remaining: 0 }
    );

    const riskIndex = annualBudget?.totalAllocated
      ? totals.adjusted / annualBudget.totalAllocated
      : 0;

    return res.json({
      annualBudget,
      envelopes,
      totals,
      riskIndex,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch overview", error: error.message });
  }
});

router.get("/standard-costs", authMiddleware, async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (financialYear) {
      const config = await StandardCostConfig.findOne({ financialYear });
      return res.json({ config });
    }
    const latest = await StandardCostConfig.findOne().sort({ createdAt: -1 });
    return res.json({ config: latest });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch standard costs", error: error.message });
  }
});

router.post("/standard-costs", authMiddleware, async (req, res) => {
  try {
    const {
      financialYear,
      costPerPartialHouse,
      costPerSevereHouse,
      costPerDestroyedHouse,
      costPerSchool,
      costPerClinic,
      costPerKmRoad,
      costPerLivestockUnit,
      logisticsRate,
      contingencyPercentage,
      severityMultipliers,
    } = req.body;

    if (!financialYear) {
      return res.status(400).json({ message: "financialYear is required" });
    }

    const config = await StandardCostConfig.findOneAndUpdate(
      { financialYear },
      {
        financialYear,
        costPerPartialHouse,
        costPerSevereHouse,
        costPerDestroyedHouse,
        costPerSchool,
        costPerClinic,
        costPerKmRoad,
        costPerLivestockUnit,
        logisticsRate,
        contingencyPercentage,
        severityMultipliers,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({ config });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save standard costs", error: error.message });
  }
});

router.get("/baseline", authMiddleware, async (req, res) => {
  try {
    const baseline = await BaselineBudget.findOne().sort({ createdAt: -1 });
    return res.json({ baseline });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch baseline budget", error: error.message });
  }
});

router.post("/baseline", authMiddleware, async (req, res) => {
  try {
    const { fiscalYear, allocations } = req.body;
    if (!fiscalYear || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ message: "Invalid baseline payload" });
    }
    const latest = await BaselineBudget.findOne({ fiscalYear }).sort({ version: -1 });
    const version = latest ? latest.version + 1 : 1;
    const baseline = await BaselineBudget.create({
      fiscalYear,
      allocations,
      version,
      status: "draft",
      createdBy: req.user?.name || "System",
    });
    return res.status(201).json({ baseline });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create baseline budget", error: error.message });
  }
});

router.put("/baseline/:id/approve", authMiddleware, async (req, res) => {
  try {
    const baseline = await BaselineBudget.findById(req.params.id);
    if (!baseline) return res.status(404).json({ message: "Baseline budget not found" });

    const role = req.user?.role || "Unknown";
    const name = req.user?.name || "Approver";
    if (!baseline.approvals.find((item) => item.role === role)) {
      baseline.approvals.push({ role, name, decision: "approved", date: new Date() });
    }

    const approvalsNeeded = ["Finance Officer", "Coordinator"];
    const hasAll = approvalsNeeded.every((reqRole) =>
      baseline.approvals.some((item) => item.role === reqRole && item.decision === "approved")
    );
    if (hasAll) {
      baseline.status = "approved";
      baseline.approvedBy = name;
    }
    await baseline.save();
    return res.json({ baseline });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve baseline budget", error: error.message });
  }
});

router.put("/baseline/:id/lock", authMiddleware, async (req, res) => {
  try {
    const baseline = await BaselineBudget.findById(req.params.id);
    if (!baseline) return res.status(404).json({ message: "Baseline budget not found" });
    baseline.status = "locked";
    baseline.lockedAt = new Date();
    await baseline.save();
    return res.json({ baseline });
  } catch (error) {
    return res.status(500).json({ message: "Failed to lock baseline budget", error: error.message });
  }
});

router.get("/adjustments", authMiddleware, async (req, res) => {
  try {
    const requests = await BudgetAdjustmentRequest.find().sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch adjustment requests", error: error.message });
  }
});

router.post("/adjustments", authMiddleware, async (req, res) => {
  try {
    const { fromType, toType, amount, reason } = req.body;
    if (!fromType || !toType || !Number.isFinite(Number(amount)) || !reason) {
      return res.status(400).json({ message: "Invalid adjustment request" });
    }
    const request = await BudgetAdjustmentRequest.create({
      fromType,
      toType,
      amount: Number(amount),
      reason,
      requestedBy: req.user?.name || "Coordinator",
      logs: [{ action: "created", actor: req.user?.name || "Coordinator", notes: reason }],
    });
    await logAudit(req, "budget_reallocation_requested", "BudgetAdjustmentRequest", request._id, {
      fromType,
      toType,
      amount: Number(amount),
      reason,
    });
    return res.status(201).json({ request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create adjustment request", error: error.message });
  }
});

router.put("/adjustments/:id/approve", authMiddleware, async (req, res) => {
  try {
    const request = await BudgetAdjustmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Adjustment request not found" });

    const approverRole = req.user?.role;
    if (!["Finance Officer", "Administrator"].includes(approverRole)) {
      return res.status(403).json({ message: "Finance Officer or Administrator approval required" });
    }

    const role = req.user?.role || "Unknown";
    const name = req.user?.name || "Approver";
    if (!request.approvals.find((item) => item.role === role)) {
      request.approvals.push({ role, name, decision: "approved", date: new Date() });
    }

    const approvalsNeeded = ["Finance Officer", "Administrator"];
    const hasAll = approvalsNeeded.every((reqRole) =>
      request.approvals.some((item) => item.role === reqRole && item.decision === "approved")
    );

    if (hasAll) {
      request.status = "approved";
      request.logs.push({ action: "approved", actor: name, notes: "Approved" });

      const fromEnvelope = await DisasterBudgetEnvelope.findOne({ disasterType: request.fromType });
      const toEnvelope = await DisasterBudgetEnvelope.findOne({ disasterType: request.toType });
      if (fromEnvelope && toEnvelope) {
        fromEnvelope.totalAllocated = Math.max(0, fromEnvelope.totalAllocated - request.amount);
        fromEnvelope.remaining = Math.max(0, fromEnvelope.totalAllocated - fromEnvelope.committed - fromEnvelope.spent);
        toEnvelope.totalAllocated += request.amount;
        toEnvelope.remaining = Math.max(0, toEnvelope.totalAllocated - toEnvelope.committed - toEnvelope.spent);
        await fromEnvelope.save();
        await toEnvelope.save();
      }

      await logAudit(req, "budget_reallocation_approved", "BudgetAdjustmentRequest", request._id, {
        fromType: request.fromType,
        toType: request.toType,
        amount: request.amount,
      });

      await refreshForecast();
    }

    await request.save();
    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve adjustment request", error: error.message });
  }
});

router.put("/adjustments/:id/reject", authMiddleware, async (req, res) => {
  try {
    const request = await BudgetAdjustmentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Adjustment request not found" });
    const approverRole = req.user?.role;
    if (!["Finance Officer", "Administrator"].includes(approverRole)) {
      return res.status(403).json({ message: "Finance Officer or Administrator approval required" });
    }
    request.status = "rejected";
    request.approvals.push({
      role: req.user?.role || "Unknown",
      name: req.user?.name || "Approver",
      decision: "rejected",
      date: new Date(),
    });
    request.logs.push({ action: "rejected", actor: req.user?.name || "Approver" });
    await request.save();
    await logAudit(req, "budget_reallocation_rejected", "BudgetAdjustmentRequest", request._id, {
      fromType: request.fromType,
      toType: request.toType,
      amount: request.amount,
    });
    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject adjustment request", error: error.message });
  }
});

router.get("/envelopes", authMiddleware, async (req, res) => {
  try {
    const envelopes = await ensureEnvelopes();
    return res.json({ envelopes });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch envelopes", error: error.message });
  }
});

router.get("/needs", authMiddleware, async (req, res) => {
  try {
    const profiles = await NeedCostProfile.find().sort({ disasterType: 1 });
    return res.json({ profiles });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch needs profiles", error: error.message });
  }
});

router.get("/cost-profiles", authMiddleware, async (req, res) => {
  try {
    const disasterProfiles = await DisasterCostProfile.find().sort({ disasterType: 1 });
    const housingProfile = await HousingCostProfile.findOne().sort({ createdAt: -1 });
    return res.json({ disasterProfiles, housingProfile });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch cost profiles", error: error.message });
  }
});

router.get("/incident-funds", authMiddleware, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const filter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
    const funds = await IncidentFund.find(filter)
      .populate("disasterId", "type district status affectedPopulation households affectedHouses")
      .populate({
        path: "snapshotId",
        populate: { path: "impactId" },
      })
      .sort({ createdAt: -1 });
    return res.json({ funds });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch incident funds", error: error.message });
  }
});

router.get("/incident-funds/:id", authMiddleware, async (req, res) => {
  try {
    const fund = await IncidentFund.findById(req.params.id)
      .populate("disasterId", "type district status affectedPopulation households affectedHouses");
    if (!fund) return res.status(404).json({ message: "Incident fund not found" });
    const expenditures = await IncidentExpenditure.find({ incidentFundId: fund._id }).sort({ date: -1 });
    return res.json({ fund, expenditures });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch incident fund", error: error.message });
  }
});

router.get("/activities", authMiddleware, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const requestFilter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
    const requests = await FundRequest.find(requestFilter)
      .populate("incidentId", "type district region")
      .sort({ createdAt: -1 })
      .limit(12);

    const [summary] = await FundRequest.aggregate([
      ...(range ? [{ $match: { createdAt: { $gte: range.start, $lt: range.end } } }] : []),
      {
        $group: {
          _id: null,
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          totalRequested: { $sum: "$requestedAmount" },
          totalApproved: { $sum: "$approvedAmount" },
        },
      },
    ]);

    return res.json({
      requests,
      summary: {
        pendingCount: summary?.pendingCount || 0,
        totalRequested: summary?.totalRequested || 0,
        totalApproved: summary?.totalApproved || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch financial activities", error: error.message });
  }
});

router.get("/expenditures", authMiddleware, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const expFilter = range ? { date: { $gte: range.start, $lt: range.end } } : {};
    const expenditures = await IncidentExpenditure.find(expFilter)
      .sort({ date: -1 })
      .populate({
        path: "incidentFundId",
        populate: { path: "disasterId", select: "type district status" },
      });
    return res.json({ expenditures });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch expenditures", error: error.message });
  }
});

router.put("/incident-funds/:id/adjustments", authMiddleware, async (req, res) => {
  try {
    const fund = await IncidentFund.findById(req.params.id);
    if (!fund) return res.status(404).json({ message: "Incident fund not found" });

    const snapshot = await IncidentFinancialSnapshot.findById(fund.snapshotId);
    const housingProfile = await HousingCostProfile.findOne().sort({ createdAt: -1 });
    const needProfile = await NeedCostProfile.findOne({ disasterType: fund.disasterType });

    fund.adjustments.houseTier = req.body.houseTier || fund.adjustments.houseTier;
    fund.adjustments.damagedLandHectares = Number(req.body.damagedLandHectares || fund.adjustments.damagedLandHectares || 0);

    const adjustmentCost = computeAdjustmentCost(snapshot, housingProfile, fund.adjustments, needProfile);
    const needsCost = fund.needsCost;
    fund.adjustmentCost = adjustmentCost;
    fund.adjustedBudget = fund.baseBudget + needsCost + adjustmentCost;
    fund.remaining = Math.max(0, fund.adjustedBudget - fund.committed - fund.spent);

    await fund.save();

    return res.json({ fund });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update adjustments", error: error.message });
  }
});

router.post("/incident-funds/:id/expenditures", authMiddleware, async (req, res) => {
  try {
    const fund = await IncidentFund.findById(req.params.id);
    if (!fund) return res.status(404).json({ message: "Incident fund not found" });

    const { amount, category, description, overrideApproved, receiptUrl } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const remainingBudget = Math.max(0, fund.adjustedBudget - fund.spent);
    if (numericAmount > remainingBudget) {
      return res.status(400).json({ message: "Amount exceeds remaining incident allocation" });
    }

    const caps = {
      "Direct Relief": 0.7,
      "Infrastructure": 0.2,
      "Operations": 0.1,
    };
    const cap = caps[category] || 0.1;
    const categorySpent = await IncidentExpenditure.aggregate([
      { $match: { incidentFundId: fund._id, category } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const spentSoFar = categorySpent[0]?.total || 0;
    const capAmount = fund.adjustedBudget * cap;
    const exceedsCap = spentSoFar + numericAmount > capAmount;

    if (exceedsCap && !overrideApproved) {
      return res.status(400).json({ message: "Amount exceeds category cap. Finance Officer override required." });
    }

    const expenditure = await IncidentExpenditure.create({
      incidentFundId: fund._id,
      amount: numericAmount,
      category,
      description,
      recordedBy: req.user?.name || "Finance Officer",
      overrideApproved: Boolean(overrideApproved),
      receiptUrl,
      approvalStatus: "Pending",
    });

    await logAudit(req, "incident_expenditure_recorded", "IncidentExpenditure", expenditure._id, {
      incidentFundId: fund._id,
      amount: numericAmount,
      category,
    });

    return res.status(201).json({ expenditure });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record expenditure", error: error.message });
  }
});

router.put("/incident-expenditures/:id/approve", authMiddleware, async (req, res) => {
  try {
    const expenditure = await IncidentExpenditure.findById(req.params.id).populate("incidentFundId");
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    if (expenditure.approvalStatus === "Approved") {
      return res.status(400).json({ message: "Expenditure already approved" });
    }

    const fund = await IncidentFund.findById(expenditure.incidentFundId?._id || expenditure.incidentFundId);
    if (!fund) return res.status(404).json({ message: "Incident fund not found" });

    const remainingBudget = Math.max(0, fund.adjustedBudget - fund.spent);
    if (expenditure.amount > remainingBudget) {
      return res.status(409).json({ message: "Expenditure exceeds remaining incident allocation" });
    }

    expenditure.approvalStatus = "Approved";
    expenditure.approvedBy = req.user?.name || "Finance Officer";
    expenditure.approvedAt = new Date();
    await expenditure.save();

    fund.spent += expenditure.amount;
    fund.remaining = Math.max(0, fund.adjustedBudget - fund.committed - fund.spent);
    await fund.save();

    const envelope = await DisasterBudgetEnvelope.findOne({ disasterType: fund.disasterType });
    if (envelope) {
      envelope.spent += expenditure.amount;
      envelope.remaining = Math.max(0, envelope.totalAllocated - envelope.committed - envelope.spent);
      await envelope.save();
    }

    await logAudit(req, "incident_expenditure_approved", "IncidentExpenditure", expenditure._id, {
      incidentFundId: fund._id,
      amount: expenditure.amount,
      category: expenditure.category,
    });

    await refreshForecast();

    return res.json({ expenditure, fund });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve expenditure", error: error.message });
  }
});

router.put("/incident-expenditures/:id/reject", authMiddleware, async (req, res) => {
  try {
    const expenditure = await IncidentExpenditure.findById(req.params.id);
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    expenditure.approvalStatus = "Rejected";
    expenditure.approvedBy = req.user?.name || "Finance Officer";
    expenditure.approvedAt = new Date();
    await expenditure.save();
    await logAudit(req, "incident_expenditure_rejected", "IncidentExpenditure", expenditure._id, {
      incidentFundId: expenditure.incidentFundId,
      amount: expenditure.amount,
      category: expenditure.category,
    });
    return res.json({ expenditure });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject expenditure", error: error.message });
  }
});

router.get("/forecast", authMiddleware, async (req, res) => {
  try {
    const budgets = await AnnualBudget.find().sort({ fiscalYear: 1 });
    const expenditures = await IncidentExpenditure.aggregate([
      {
        $group: {
          _id: { $year: "$date" },
          totalSpent: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const budgetSeries = budgets.map((budget) => ({
      label: budget.fiscalYear,
      value: budget.totalAllocated,
    }));

    const spendSeries = expenditures.map((item) => ({
      label: String(item._id),
      value: item.totalSpent,
    }));

    const averageSpend = spendSeries.length
      ? spendSeries.reduce((sum, item) => sum + item.value, 0) / spendSeries.length
      : 0;

    return res.json({
      budgetSeries,
      spendSeries,
      averageSpend,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to build forecast", error: error.message });
  }
});

router.get("/snapshots", authMiddleware, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const snapshotFilter = range ? { generatedAt: { $gte: range.start, $lt: range.end } } : {};
    const snapshots = await IncidentFinancialSnapshot.find(snapshotFilter)
      .populate("disasterId", "type district status")
      .populate("impactId")
      .sort({ generatedAt: -1 });
    return res.json({ snapshots });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch snapshots", error: error.message });
  }
});

router.get("/closure-reports", authMiddleware, async (req, res) => {
  try {
    const range = getYearRange(req.query.year);
    const reportFilter = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
    const reports = await IncidentClosureReport.find(reportFilter)
      .populate("incidentFundId", "disasterType adjustedBudget")
      .populate("disasterId", "type district status")
      .sort({ createdAt: -1 });
    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch closure reports", error: error.message });
  }
});

export default router;
