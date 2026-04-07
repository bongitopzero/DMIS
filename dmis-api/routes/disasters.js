import express from "express";
import Disaster from "../models/Disaster.js";
import Expense from "../models/Expense.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const districtCoordinates = {
  "maseru": [-29.6100, 27.5500],
  "berea": [-29.4800, 28.3400],
  "leribe": [-29.6500, 28.0600],
  "butha-buthe": [-29.3100, 28.4600],
  "mokhotlong": [-29.0800, 28.9100],
  "thaba-tseka": [-29.6400, 28.6400],
  "qacha's nek": [-30.2700, 28.6400],
  "quthing": [-30.5500, 27.7200],
  "mohale's hoek": [-30.1950, 27.6650],
  "mafeteng": [-29.8200, 27.2800],
};
const villageCoordinates = {
  "ha hlalele": [-29.8, 28.2],
  "ketane": [-29.2, 28.5],
  "maseru central": [-29.61, 28.24],
  "mafeteng central": [-29.78, 27.68],
  "ha-amoheloa": [-29.35, 28.45],
  "ha-makhoarane": [-29.25, 28.35],
};

const getCoordinates = (village, district) => {
  if (village) {
    const villageLower = village.toLowerCase().trim();
    if (villageCoordinates[villageLower]) {
      return villageCoordinates[villageLower];
    }
    const hash = villageLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const districtCoords = districtCoordinates[district?.toLowerCase()] || [-29.6, 27.5];
    const offset = ((hash % 20) - 10) * 0.05;
    return [districtCoords[0] + offset, districtCoords[1] + offset];
  }
  const districtKey = district?.toLowerCase();
  return districtCoordinates[districtKey] || [-29.6, 27.5];
};

router.get("/dashboard/by-type", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disasters = await Disaster.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    const byType = {};
    disasters.forEach(d => {
      const type = d.type || "Unknown";
      byType[type] = (byType[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: byType,
      totalDisasters: disasters.length
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Error fetching dashboard stats", error: err.message });
  }
});

router.get("/dashboard/by-month", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disasters = await Disaster.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    const byMonth = {};
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    disasters.forEach(d => {
      const date = new Date(d.createdAt);
      const monthYear = `${monthLabels[date.getMonth()]}-${date.getFullYear()}`;
      byMonth[monthYear] = (byMonth[monthYear] || 0) + 1;
    });

    res.json({
      success: true,
      data: byMonth,
      totalDisasters: disasters.length
    });
  } catch (err) {
    console.error("Dashboard monthly stats error:", err);
    res.status(500).json({ message: "Error fetching monthly stats", error: err.message });
  }
});

router.get("/dashboard/financial-summary", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await Expense.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    const byMonth = {};
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    expenses.forEach(e => {
      const date = new Date(e.createdAt);
      const monthYear = `${monthLabels[date.getMonth()]}-${date.getFullYear()}`;
      byMonth[monthYear] = (byMonth[monthYear] || 0) + (e.amount || 0);
    });

    res.json({
      success: true,
      data: byMonth,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    });
  } catch (err) {
    console.error("Dashboard financial stats error:", err);
    res.status(500).json({ message: "Error fetching financial stats", error: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    console.log("📝 Creating disaster with data:", req.body);

    const coords = getCoordinates(req.body.location, req.body.district);

    // Count all disasters created before this moment to generate sequential code
    const currentYear = new Date().getFullYear();
    const disastersThisYear = await Disaster.countDocuments({
      createdAt: { $gte: new Date(`${currentYear}-01-01`) }
    });
    const sequentialNumber = disastersThisYear + 1;
    const disasterCode = `D-${currentYear}-${String(sequentialNumber).padStart(3, '0')}`;

    // Explicitly handle status field - default to "reported" if not provided
    const disasterData = {
      ...req.body,
      latitude: coords[0],
      longitude: coords[1],
      village: req.body.location,
      reportedBy: req.user._id,
      status: req.body.status || "reported", // Explicitly set status
      disasterCode // Assign the generated code immediately
    };

    console.log("📝 Final disaster data to save:", disasterData);
    console.log("✅ Generated disaster code: " + disasterCode);

    const disaster = await Disaster.create(disasterData);

    console.log("✅ Disaster created successfully:", disaster._id, "Code:", disaster.disasterCode, "Status:", disaster.status);
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

// Get approved/verified disasters (for Finance Officer)
router.get("/approved", protect, async (req, res) => {
  try {
    const disasters = await Disaster.find({ status: "verified" }).populate("reportedBy", "name email").sort("-createdAt");
    res.json(disasters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const disasters = await Disaster.find().populate("reportedBy", "name email");
    res.json(disasters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    console.log("📝 Updating disaster:", req.params.id, "with data:", req.body);

    let updateData = { ...req.body };

    if (req.body.district || req.body.location) {
      const currentDisaster = await Disaster.findById(req.params.id);
      const district = req.body.district || currentDisaster?.district;
      const location = req.body.location || currentDisaster?.location;

      const coords = getCoordinates(location, district);
      updateData.latitude = coords[0];
      updateData.longitude = coords[1];

      if (req.body.location) {
        updateData.village = req.body.location;
      }
    }

    // Note: disasterCode is now generated at creation time, not on verification

    const disaster = await Disaster.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false }
    ).populate("reportedBy", "name email");

    if (!disaster) {
      console.error("❌ Disaster not found:", req.params.id);
      return res.status(404).json({ message: "Disaster not found" });
    }

    console.log("✅ Disaster updated successfully:", disaster._id, "Code:", disaster.disasterCode);
    res.json(disaster);
  } catch (err) {
    console.error("❌ Error updating disaster:", err.message, err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

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




