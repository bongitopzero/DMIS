// routes/disasters.js
import express from "express";
import Disaster from "../models/Disaster.js";
import Expense from "../models/Expense.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const districtCoordinates = {
  "berea":         [-29.3, 28.3],
  "butha-buthe":   [-29.1, 28.7],
  "leribe":        [-29.3, 28.0],
  "mafeteng":      [-29.7, 27.7],
  "maseru":        [-29.6, 27.5],
  "mohale's hoek": [-30.1, 28.1],
  "mokhotlong":    [-30.4, 29.3],
  "qacha's nek":   [-30.7, 29.1],
  "quthing":       [-30.7, 28.9],
  "thaba-tseka":   [-29.5, 29.2],
};

const villageCoordinates = {
  "ha hlalele":       [-29.8, 28.2],
  "ketane":           [-29.2, 28.5],
  "maseru central":   [-29.61, 28.24],
  "mafeteng central": [-29.78, 27.68],
  "ha-amoheloa":      [-29.35, 28.45],
  "ha-makhoarane":    [-29.25, 28.35],
};

const getCoordinates = (village, district) => {
  if (village) {
    const key = village.toLowerCase().trim();
    if (villageCoordinates[key]) return villageCoordinates[key];
    const hash = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const base = districtCoordinates[(district || "").toLowerCase()] || [-29.6, 27.5];
    const offset = ((hash % 20) - 10) * 0.05;
    return [base[0] + offset, base[1] + offset];
  }
  return districtCoordinates[(district || "").toLowerCase()] || [-29.6, 27.5];
};

// ── Dashboard stats ───────────────────────────────────────────────────────────

router.get("/dashboard/by-type", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const disasters = await Disaster.find({ createdAt: { $gte: sixMonthsAgo } });
    const byType = {};
    disasters.forEach((d) => {
      const t = d.type || "Unknown";
      byType[t] = (byType[t] || 0) + 1;
    });
    res.json({ success: true, data: byType, totalDisasters: disasters.length });
  } catch (err) {
    console.error("Dashboard by-type error:", err);
    res.status(500).json({ message: "Error fetching dashboard stats", error: err.message });
  }
});

router.get("/dashboard/by-month", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const disasters = await Disaster.find({ createdAt: { $gte: sixMonthsAgo } });
    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMonth = {};
    disasters.forEach((d) => {
      const dt = new Date(d.createdAt);
      const key = `${labels[dt.getMonth()]}-${dt.getFullYear()}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    res.json({ success: true, data: byMonth, totalDisasters: disasters.length });
  } catch (err) {
    console.error("Dashboard by-month error:", err);
    res.status(500).json({ message: "Error fetching monthly stats", error: err.message });
  }
});

router.get("/dashboard/financial-summary", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const expenses = await Expense.find({ createdAt: { $gte: sixMonthsAgo } });
    const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMonth = {};
    expenses.forEach((e) => {
      const dt = new Date(e.createdAt);
      const key = `${labels[dt.getMonth()]}-${dt.getFullYear()}`;
      byMonth[key] = (byMonth[key] || 0) + (e.amount || 0);
    });
    res.json({
      success: true,
      data: byMonth,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + (e.amount || 0), 0),
    });
  } catch (err) {
    console.error("Dashboard financial-summary error:", err);
    res.status(500).json({ message: "Error fetching financial stats", error: err.message });
  }
});

// ── Create disaster ───────────────────────────────────────────────────────────

router.post("/", protect, async (req, res) => {
  try {
    console.log("POST /disasters body:", JSON.stringify(req.body, null, 2));
    const coords = getCoordinates(req.body.location, req.body.district);

    const disaster = await Disaster.create({
      ...req.body,
      numberOfHouseholdsAffected:
        req.body.numberOfHouseholdsAffected ||
        req.body.totalAffectedHouseholds ||
        parseInt((req.body.affectedPopulation?.match(/(\d+)/) || [0, 0])[1]) || 0,
      latitude:   coords[0],
      longitude:  coords[1],
      village:    req.body.location,
      reportedBy: req.user._id,
      status:     req.body.status || "reported",
    });

    console.log("✅ Disaster created:", disaster._id, "status:", disaster.status);
    res.status(201).json(disaster);
  } catch (err) {
    console.error("❌ POST /disasters error:", err.message);
    console.error("Validation errors:", err.errors);
    res.status(500).json({ message: "Server error", error: err.message, details: err.errors });
  }
});

// ── Get all disasters ─────────────────────────────────────────────────────────

router.get("/", protect, async (req, res) => {
  try {
    const disasters = await Disaster.find()
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name email");
    res.json(disasters);
  } catch (err) {
    console.error("GET /disasters error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Update disaster ───────────────────────────────────────────────────────────
//
// FIX: Replaced findByIdAndUpdate(..., { runValidators: true }) with a
// find-then-save pattern.
//
// The old code used runValidators:true which runs the Mongoose schema enum
// checks on the update payload.  Since "submitted" was not in the status enum,
// the validator silently returned the old document with HTTP 200 — no error
// was surfaced to the frontend, so the badge never changed and the disaster
// never appeared in the coordinator's pending list.
//
// Using find() + doc.save() runs the pre-save hooks (district normalisation)
// and properly persists every field including status values that have now been
// added to the enum.

router.put("/:id", protect, async (req, res) => {
  try {
    console.log("PUT /disasters/:id", req.params.id, "body:", JSON.stringify(req.body, null, 2));

    const disaster = await Disaster.findById(req.params.id);
    if (!disaster) {
      console.error("❌ Disaster not found:", req.params.id);
      return res.status(404).json({ message: "Disaster not found" });
    }

    const prevStatus = disaster.status;

    // Apply every field from the request body onto the document
    Object.keys(req.body).forEach((key) => {
      disaster[key] = req.body[key];
    });

    // Recalculate coordinates if location or district changed
    if (req.body.district || req.body.location) {
      const coords = getCoordinates(
        req.body.location || disaster.location,
        req.body.district || disaster.district
      );
      disaster.latitude  = coords[0];
      disaster.longitude = coords[1];
      if (req.body.location) disaster.village = req.body.location;
    }

    // Save — pre-save hook normalises district capitalisation
    await disaster.save();

    console.log(
      `✅ Disaster ${disaster._id} saved | status: ${prevStatus} → ${disaster.status}`
    );

    await disaster.populate("reportedBy", "name email");
    res.json(disaster);
  } catch (err) {
    console.error("❌ PUT /disasters/:id error:", err.message, err.errors || "");
    res.status(500).json({ message: "Server error: " + err.message, details: err.errors });
  }
});

// ── Delete disaster ───────────────────────────────────────────────────────────

router.delete("/:id", protect, async (req, res) => {
  try {
    const disaster = await Disaster.findByIdAndDelete(req.params.id);
    if (!disaster) return res.status(404).json({ message: "Disaster not found" });
    res.json({ message: "Disaster deleted successfully" });
  } catch (err) {
    console.error("DELETE /disasters/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;