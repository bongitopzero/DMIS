// routes/disasters.js
import express from "express";
import Disaster from "../models/Disaster.js";
import Expense from "../models/Expense.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

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

// Village coordinates mapping for more precise locations
const villageCoordinates = {
  "ha hlalele": [-29.8, 28.2],
  "ketane": [-29.2, 28.5],
  "maseru central": [-29.61, 28.24],
  "mafeteng central": [-29.78, 27.68],
  "ha-amoheloa": [-29.35, 28.45],
  "ha-makhoarane": [-29.25, 28.35],
  // Add more villages as needed
};

// Function to get coordinates based on village or district
const getCoordinates = (village, district) => {
  // If village is provided, try to find its coordinates
  if (village) {
    const villageLower = village.toLowerCase().trim();
    if (villageCoordinates[villageLower]) {
      return villageCoordinates[villageLower];
    }
    // Generate approximate coordinates based on village name hash for consistency
    const hash = villageLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const districtCoords = districtCoordinates[district.toLowerCase()] || [-29.6, 27.5];
    const offset = ((hash % 20) - 10) * 0.05; // Random offset within district
    return [districtCoords[0] + offset, districtCoords[1] + offset];
  }
  
  // Otherwise use district coordinates
  const districtKey = district.toLowerCase();
  return districtCoordinates[districtKey] || [-29.6, 27.5];
};

// Get disasters by type for last 6 months (dashboard stats)
router.get("/dashboard/by-type", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disasters = await Disaster.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    // Group by type
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

// Get disasters aggregated by month for last 6 months (dashboard)
router.get("/dashboard/by-month", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disasters = await Disaster.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    // Group by month
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

// Get financial summary by month for last 6 months (dashboard)
router.get("/dashboard/financial-summary", protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await Expense.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    // Aggregate by month and category
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

// Create disaster (protected)
router.post("/", protect, async (req, res) => {
  try {
    console.log("📝 Creating disaster with data:", req.body);
    
    // Get coordinates based on village (location) or district
    const coords = getCoordinates(req.body.location, req.body.district);
    
    const disaster = await Disaster.create({
      ...req.body,
      latitude: coords[0],
      longitude: coords[1],
      village: req.body.location, // Store location as village
      reportedBy: req.user._id
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
    const disasters = await Disaster.find().populate("reportedBy", "name email");
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
    
    let updateData = { ...req.body };
    
    // Update coordinates based on village/location or district
    if (req.body.district || req.body.location) {
      // Get the current disaster to find district if not in update
      const currentDisaster = await Disaster.findById(req.params.id);
      const district = req.body.district || currentDisaster?.district;
      const location = req.body.location || currentDisaster?.location;
      
      const coords = getCoordinates(location, district);
      updateData.latitude = coords[0];
      updateData.longitude = coords[1];
      
      // Store location as village
      if (req.body.location) {
        updateData.village = req.body.location;
      }
    }

    const disaster = await Disaster.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("reportedBy", "name email");

    if (!disaster) {
      console.error("❌ Disaster not found:", req.params.id);
      return res.status(404).json({ message: "Disaster not found" });
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
