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
  "thaba tseka": [-29.5, 29.2]
};

// Create disaster (protected)
router.post("/", protect, async (req, res) => {
  try {
    const districtKey = req.body.district.toLowerCase();
    const coords = districtCoordinates[districtKey] || [-29.6, 27.5];
    
    const disaster = await Disaster.create({
      ...req.body,
      latitude: coords[0],
      longitude: coords[1],
      reportedBy: req.user._id
    });

    res.status(201).json(disaster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    const districtKey = req.body.district.toLowerCase();
    const coords = districtCoordinates[districtKey] || [-29.6, 27.5];

    const disaster = await Disaster.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        latitude: coords[0],
        longitude: coords[1]
      },
      { new: true }
    ).populate("reportedBy", "name email");

    if (!disaster) {
      return res.status(404).json({ message: "Disaster not found" });
    }

    res.json(disaster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
