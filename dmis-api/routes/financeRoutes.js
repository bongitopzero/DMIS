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

router.put("/budget/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }
    const { allocatedBudget } = req.body;
    if (allocatedBudget && Number.isFinite(allocatedBudget)) {
      budget.allocatedBudget = allocatedBudget;
    }
    applyBudgetUpdates(budget);
    await budget.save();
    return res.json(budget);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update budget", error: error.message });
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
    const { incidentId, requestedAmount, category, urgency, purpose, notes, householdId, supportingDocs } = req.body;
    
    // Prevent duplicate allocation for same household/disaster
    const existing = await FundRequest.findOne({
      incidentId,
      notes: { $regex: householdId || 'HH', $options: 'i' }, // Match household ID in notes
      status: { $in: ['Pending', 'Approved', 'Disbursed'] }
    });
    
    if (existing) {
      return res.status(409).json({ message: "Allocation already exists for this household", existingId: existing._id });
    }
    
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
      householdId: householdId || 'N/A',
      supportingDocs: Array.isArray(supportingDocs) ? supportingDocs : [],
      approvedAmount: 0,
      status: "Pending",
      requestedBy,
    });

    // Create audit log entry
    await AuditLog.create({
      action: "Aid Allocation Request Created",
      actorId: req.user?.id,
      actorName: req.user?.name || requestedBy,
      actorRole: req.user?.role || "Finance Officer",
      entityType: "FundRequest",
      entityId: fundRequest._id,
      details: {
        incidentId,
        householdId,
        amount: requestedAmount,
        category,
        urgency,
        purpose: purpose.slice(0, 200),
      }
    });

    // Auto-commit budget on allocation request (immediate commitment)
    try {
      const budget = await getCurrentBudget();
      if (budget) {
        budget.committedFunds += requestedAmount;
        applyBudgetUpdates(budget);
        await budget.save();
        console.log(`💰 Auto-committed M${(requestedAmount/1_000_000).toFixed(1)} to budget for household ${householdId}`);
      }
    } catch (budgetErr) {
      console.warn('Budget auto-commit failed (non-blocking):', budgetErr.message);
    }

    return res.status(201).json({ ...fundRequest._doc, budgetCommitted: true });
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

router.put("/request/:id/disburse", authMiddleware, async (req, res) => {
  try {
    if (!requireFinanceOfficer(req, res)) return;
    const { amountDisbursed } = req.body;
    const request = await FundRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "Approved") return res.status(400).json({ message: "Only approved requests can be disbursed" });

    // Record expenditure
    await Expenditure.create({
      incidentId: request.incidentId,
      amountSpent: amountDisbursed || request.approvedAmount,
      description: `Disbursement for ${request.purpose.slice(0, 100)}`,
      recordedBy: req.user?.name || "Finance Officer"
    });

    // Update budget spentFunds
    const budget = await getCurrentBudget();
    if (budget) {
      budget.spentFunds += (amountDisbursed || request.approvedAmount);
      applyBudgetUpdates(budget);
      await budget.save();
    }

    // Mark as disbursed
    request.status = "Disbursed";
    request.disbursedAmount = amountDisbursed || request.approvedAmount;
    request.disbursedBy = req.user?.name || "Finance Officer";
    request.disbursedAt = new Date();
    await request.save();

    // Audit log
    await AuditLog.create({
      action: "Funds Disbursed",
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      entityType: "FundRequest",
      entityId: request._id,
      details: { amountDisbursed: amountDisbursed || request.approvedAmount }
    });

    res.json({ request, budget });
  } catch (error) {
    res.status(500).json({ message: "Disbursement failed", error: error.message });
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
router.get("/financial/auditlogs", authMiddleware, async (req, res) => {
  try {
    const { status, disasterId, limit = 100 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (disasterId) query.disasterId = disasterId;
    
    // Only financial actions
    query.action = { $in: [
      "BUDGET_CREATED", "BUDGET_UPDATED", "REQUEST_CREATED", "REQUEST_APPROVED",
      "REQUEST_REJECTED", "ALLOCATION_DISBURSED", "EXPENSE_LOGGED"
    ] };
    
    const auditLogs = await AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
      
    res.json({ auditLogs });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch audit logs", error: error.message });
  }
});

router.get("/financial/auditlogs/export", authMiddleware, async (req, res) => {
  try {
    // Same query as above
    const { disasterId, limit = 1000 } = req.query;
    const query = {
      action: { $in: [
        "BUDGET_CREATED", "BUDGET_UPDATED", "REQUEST_CREATED", "REQUEST_APPROVED",
        "REQUEST_REJECTED", "ALLOCATION_DISBURSED", "EXPENSE_LOGGED"
      ] }
    };
    
    if (disasterId) query.disasterId = disasterId;
    
    const auditLogs = await AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    
    // Generate CSV
    const headers = ['Timestamp', 'Action', 'Entity', 'Amount', 'User', 'Details'];
    const csvRows = auditLogs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.action,
      log.entityType,
      log.amount || '',
      log.actorName || log.actorRole || '',
      JSON.stringify(log.details || {}).slice(0,100)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-trail.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: "Export failed", error: error.message });
  }
});

router.get("/finance/envelopes/:disasterId", authMiddleware, async (req, res) => {
  try {
    const budget = await getCurrentBudget();
    if (!budget) {
      return res.status(404).json({ message: "No budget found" });
    }

    const disasterBudget = budget.allocatedBudget; // 100% national to disaster pool

    const envelopes = {
      core: {
        total: Math.round(disasterBudget * 0.7),
        committed: 0, // Track via allocations
        remaining: Math.round(disasterBudget * 0.7),
        subBreakdown: {
          drought: Math.round(disasterBudget * 0.7 * 0.4),
          flooding: Math.round(disasterBudget * 0.7 * 0.35),
          winds: Math.round(disasterBudget * 0.7 * 0.15),
          other: Math.round(disasterBudget * 0.7 * 0.1)
        }
      },
      backlog: {
        total: Math.round(disasterBudget * 0.15),
        committed: 0,
        remaining: Math.round(disasterBudget * 0.15)
      },
      reserve: {
        total: Math.round(disasterBudget * 0.1),
        committed: 0,
        remaining: Math.round(disasterBudget * 0.1)
      },
      admin: {
        total: Math.round(disasterBudget * 0.05),
        committed: 0,
        remaining: Math.round(disasterBudget * 0.05)
      }
    };

    return res.json(envelopes);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch envelopes", error: error.message });
  }
});

router.get("/auditlogs", authMiddleware, async (req, res) => {
  try {
    const { disasterId } = req.query;
    const query = disasterId ? { "details.incidentId": disasterId } : {};
 
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .populate("actorId", "name role")
      .limit(200);
 
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
});

router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
 
    const requests = await FundRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("incidentId", "type district severity status numberOfHouseholdsAffected");
 
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch fund requests",
      error: error.message,
    });
  }
});
export default router;
