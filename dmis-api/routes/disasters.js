// routes/disasters.js
import express from "express";
import Disaster from "../models/Disaster.js";
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

// Create disaster (protected)
router.post("/", protect, async (req, res) => {
  try {
    console.log("📝 Creating disaster with data:", req.body);
    
    const districtKey = req.body.district.toLowerCase();
    const coords = districtCoordinates[districtKey] || [-29.6, 27.5];
    
    const disaster = await Disaster.create({
      ...req.body,
      latitude: coords[0],
      longitude: coords[1],
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
