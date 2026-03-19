import express from "express";
import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import FundRequest from "../models/FundRequest.js";
import Expenditure from "../models/Expenditure.js";
import DisasterCostProfile from "../models/DisasterCostProfile.js";
import HousingCostProfile from "../models/HousingCostProfile.js";
import IncidentFinancialSnapshot from "../models/IncidentFinancialSnapshot.js";
import AnnualBudget from "../models/AnnualBudget.js";
import { protect as authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const getYearRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  return { start, end };
};

const calculateRemainingBudget = (budget) =>
  budget.allocatedBudget - budget.committedFunds - budget.spentFunds;

const calculateFinancialRisk = (budget) => {
  if (budget.allocatedBudget <= 0) return "Low";
  const remaining = calculateRemainingBudget(budget);
  const ratio = remaining / budget.allocatedBudget;
  if (ratio < 0.1) return "High";
  if (ratio < 0.3) return "Medium";
  return "Low";
};

const applyBudgetUpdates = (budget) => {
  budget.remainingBudget = calculateRemainingBudget(budget);
  budget.financialRisk = calculateFinancialRisk(budget);
  budget.lastUpdated = new Date();
};

const getCurrentBudget = async () => {
  const fiscalYear = new Date().getFullYear();
  let budget = await Budget.findOne({ fiscalYear });
  if (!budget) {
    budget = await Budget.findOne().sort({ fiscalYear: -1 });
  }
  return budget;
};

const requireFinanceOfficer = (req, res) => {
  const role = req.user?.role;
  if (role !== "Finance Officer" && role !== "Administrator") {
    res.status(403).json({ message: "Finance Officer access required" });
    return false;
  }
  return true;
};

router.post("/budget/create", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const { fiscalYear, allocatedBudget } = req.body;
    if (!Number.isFinite(fiscalYear) || !Number.isFinite(allocatedBudget)) {
      return res.status(400).json({ message: "Invalid fiscalYear or allocatedBudget" });
    }
    const existing = await Budget.findOne({ fiscalYear });
    if (existing) {
      return res.status(409).json({ message: "Budget already exists for fiscal year" });
    }
    const budget = new Budget({
      fiscalYear,
      allocatedBudget,
      committedFunds: 0,
      spentFunds: 0,
    });
    applyBudgetUpdates(budget);
    await budget.save();
    return res.status(201).json(budget);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create budget", error: error.message });
  }
});

router.get("/budget/current", authMiddleware, async (req, res) => {
  try {
    const budget = await getCurrentBudget();
    if (!budget) {
      return res.status(404).json({ message: "No budget found" });
    }
    applyBudgetUpdates(budget);
    await budget.save();
    return res.json(budget);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch budget", error: error.message });
  }
});

router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { incidentId, requestedAmount, category, urgency, purpose, notes, supportingDocs } = req.body;
    if (!incidentId || !mongoose.Types.ObjectId.isValid(incidentId)) {
      return res.status(400).json({ message: "Invalid incidentId" });
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: "Invalid requestedAmount" });
    }
    const requestedBy = req.user?.name || "Coordinator";
    const fundRequest = await FundRequest.create({
      incidentId,
      requestedAmount,
      category: category || "General",
      urgency: urgency || "Normal",
      purpose: purpose || "",
      notes: notes || "",
      supportingDocs: Array.isArray(supportingDocs) ? supportingDocs : [],
      approvedAmount: 0,
      status: "Pending",
      requestedBy,
    });
    return res.status(201).json(fundRequest);
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit request", error: error.message });
  }
});

router.put("/request/approve/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const request = await FundRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "Pending") {
      return res.status(400).json({ message: "Request already processed" });
    }
    const approvedAmount = Number.isFinite(req.body.approvedAmount)
      ? req.body.approvedAmount
      : request.requestedAmount;
    if (approvedAmount <= 0) {
      return res.status(400).json({ message: "Invalid approvedAmount" });
    }
    const budget = await getCurrentBudget();
    if (!budget) {
      return res.status(404).json({ message: "No budget found" });
    }
    request.status = "Approved";
    request.approvedAmount = approvedAmount;
    request.approvedBy = req.user?.name || "Finance Officer";
    await request.save();

    budget.committedFunds += approvedAmount;
    applyBudgetUpdates(budget);
    await budget.save();

    return res.json({ request, budget });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve request", error: error.message });
  }
});

router.put("/request/reject/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const request = await FundRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "Pending") {
      return res.status(400).json({ message: "Request already processed" });
    }
    request.status = "Rejected";
    request.approvedAmount = 0;
    request.approvedBy = req.user?.name || "Finance Officer";
    await request.save();
    return res.json(request);
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject request", error: error.message });
  }
});

router.post("/expenditure", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const { incidentId, amountSpent, description, date } = req.body;
    if (!incidentId || !mongoose.Types.ObjectId.isValid(incidentId)) {
      return res.status(400).json({ message: "Invalid incidentId" });
    }
    if (!Number.isFinite(amountSpent) || amountSpent <= 0) {
      return res.status(400).json({ message: "Invalid amountSpent" });
    }
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }
    const snapshot = await IncidentFinancialSnapshot.findOne({ disasterId: incidentId });
    const expenditure = await Expenditure.create({
      incidentId,
      snapshotId: snapshot?._id || null,
      amountSpent,
      description,
      recordedBy: req.user?.name || "Finance Officer",
      date: date ? new Date(date) : new Date(),
    });

    const budget = await getCurrentBudget();
    if (!budget) {
      return res.status(404).json({ message: "No budget found" });
    }
    budget.spentFunds += amountSpent;
    applyBudgetUpdates(budget);
    await budget.save();

    return res.status(201).json({ expenditure, budget });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record expenditure", error: error.message });
  }
});

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const { start: yearStart, end: yearEnd } = getYearRange();
    const budget = await getCurrentBudget();
    const annualBudget = await AnnualBudget.findOne().sort({ fiscalYear: -1 });
    const [requestAgg] = await FundRequest.aggregate([
      { $match: { createdAt: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id: null,
          totalRequested: { $sum: "$requestedAmount" },
          totalApproved: { $sum: "$approvedAmount" },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const [expenditureAgg] = await Expenditure.aggregate([
      { $match: { date: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$amountSpent" },
          transactions: { $sum: 1 },
        },
      },
    ]);

    const forecastsCollection = mongoose.connection.db.collection("forecasts");
    const latestForecast = await forecastsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    return res.json({
      budget,
      annualBudget,
      totalRequested: requestAgg?.totalRequested || 0,
      totalApproved: requestAgg?.totalApproved || 0,
      pendingRequests: requestAgg?.pendingCount || 0,
      totalSpent: expenditureAgg?.totalSpent || 0,
      expenditureTransactions: expenditureAgg?.transactions || 0,
      latestForecast: latestForecast[0] || null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch summary", error: error.message });
  }
});

router.get("/profiles/disaster", authMiddleware, async (req, res) => {
  try {
    const profiles = await DisasterCostProfile.find().sort({ disasterType: 1 });
    return res.json({ profiles });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disaster cost profiles", error: error.message });
  }
});

router.put("/profiles/disaster", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const updates = Array.isArray(req.body?.profiles) ? req.body.profiles : [];
    const results = [];
    for (const profile of updates) {
      const updated = await DisasterCostProfile.findOneAndUpdate(
        { disasterType: profile.disasterType },
        profile,
        { upsert: true, new: true, runValidators: true }
      );
      results.push(updated);
    }
    return res.json({ profiles: results });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update disaster cost profiles", error: error.message });
  }
});

router.get("/profiles/housing", authMiddleware, async (req, res) => {
  try {
    const profile = await HousingCostProfile.findOne().sort({ createdAt: -1 });
    return res.json({ profile });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch housing cost profile", error: error.message });
  }
});

router.put("/profiles/housing", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const updated = await HousingCostProfile.findOneAndUpdate(
      {},
      req.body,
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({ profile: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update housing cost profile", error: error.message });
  }
});

router.get("/annual-budgets", authMiddleware, async (req, res) => {
  try {
    const budgets = await AnnualBudget.find().sort({ fiscalYear: 1 });
    return res.json({ budgets });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch annual budgets", error: error.message });
  }
});

router.get("/incident-snapshots", authMiddleware, async (req, res) => {
  try {
    const { start, end } = getYearRange();
    const snapshots = await IncidentFinancialSnapshot.find({ generatedAt: { $gte: start, $lt: end } })
      .populate("disasterId", "type district region location status")
      .sort({ generatedAt: -1 })
      .limit(200);
    return res.json({ snapshots });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch incident snapshots", error: error.message });
  }
});

router.get("/expenditures", authMiddleware, async (req, res) => {
  try {
    const { start, end } = getYearRange();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const expenditures = await Expenditure.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $sort: { date: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "incidents",
          localField: "incidentId",
          foreignField: "_id",
          as: "incidentRecord",
        },
      },
      {
        $lookup: {
          from: "disasters",
          localField: "incidentId",
          foreignField: "_id",
          as: "disasterRecord",
        },
      },
      {
        $addFields: {
          incident: {
            $ifNull: [
              { $arrayElemAt: ["$incidentRecord", 0] },
              { $arrayElemAt: ["$disasterRecord", 0] },
            ],
          },
        },
      },
      {
        $project: {
          incidentRecord: 0,
          disasterRecord: 0,
        },
      },
    ]);

    return res.json({ expenditures });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch expenditures", error: error.message });
  }
});

router.get("/risk", authMiddleware, async (req, res) => {
  try {
    const budget = await getCurrentBudget();
    if (!budget) {
      return res.status(404).json({ message: "No budget found" });
    }
    applyBudgetUpdates(budget);
    await budget.save();
    return res.json({
      fiscalYear: budget.fiscalYear,
      allocatedBudget: budget.allocatedBudget,
      remainingBudget: budget.remainingBudget,
      financialRisk: budget.financialRisk,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch risk", error: error.message });
  }
});

export default router;
