import express from "express";
import Fund from "../models/Fund.js";
import { protect as authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * Create fund
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const fund = new Fund({
      ...req.body,
      createdBy: req.user.id
    });

    await fund.save();
    res.status(201).json(fund);
  } catch (err) {
    res.status(500).json({ message: "Failed to create fund", error: err.message });
  }
});

/**
 * Get all funds
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const funds = await Fund.find().sort({ createdAt: -1 });
    res.json(funds);
  } catch (err) {
    res.status(500).json({ message: "Failed to load funds" });
  }
});

/**
 * Update fund
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const fund = await Fund.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(fund);
  } catch (err) {
    res.status(500).json({ message: "Failed to update fund" });
  }
});

/**
 * Delete fund
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Fund.findByIdAndDelete(req.params.id);
    res.json({ message: "Fund deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete fund" });
  }
});

export default router;
