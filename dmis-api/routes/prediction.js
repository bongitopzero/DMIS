// routes/prediction.js
// ---------------------
// This route receives disaster details from the frontend
// and returns a predicted funding amount by calling the Python model.

import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import Prediction from "../models/Prediction.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PREDICT_SCRIPT = path.join(__dirname, "../../predict.py");
const MODEL_DIR      = path.join(__dirname, "../../");


// ─────────────────────────────────────────────────────────────────────────────
// DISTRICT VULNERABILITY PROFILES
// These values are looked up automatically based on the selected district.
// They are NOT entered by the user — they come from district demographic data
// used to train the model. The user only selects the district name.
// ─────────────────────────────────────────────────────────────────────────────

const DISTRICT_PROFILES = {
  "Maseru":        { pctElderly: 0.08, pctChildrenU5: 0.12, pctDisabled: 0.05, avgHouseholdSize: 4.5 },
  "Berea":         { pctElderly: 0.10, pctChildrenU5: 0.15, pctDisabled: 0.06, avgHouseholdSize: 5.5 },
  "Leribe":        { pctElderly: 0.11, pctChildrenU5: 0.16, pctDisabled: 0.06, avgHouseholdSize: 5.5 },
  "Mafeteng":      { pctElderly: 0.12, pctChildrenU5: 0.18, pctDisabled: 0.07, avgHouseholdSize: 6.0 },
  "Mohale's Hoek": { pctElderly: 0.13, pctChildrenU5: 0.19, pctDisabled: 0.07, avgHouseholdSize: 6.0 },
  "Quthing":       { pctElderly: 0.14, pctChildrenU5: 0.20, pctDisabled: 0.08, avgHouseholdSize: 7.0 },
  "Qacha's Nek":   { pctElderly: 0.15, pctChildrenU5: 0.22, pctDisabled: 0.09, avgHouseholdSize: 7.0 },
  "Butha-Buthe":   { pctElderly: 0.14, pctChildrenU5: 0.19, pctDisabled: 0.08, avgHouseholdSize: 6.5 },
  "Thaba-Tseka":   { pctElderly: 0.16, pctChildrenU5: 0.23, pctDisabled: 0.09, avgHouseholdSize: 7.5 },
  "Mokhotlong":    { pctElderly: 0.17, pctChildrenU5: 0.24, pctDisabled: 0.10, avgHouseholdSize: 8.0 },
};


/**
 * GET /api/prediction/test
 * Simple test endpoint to verify API is running
 */
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Prediction API is running"
  });
});


/**
 * POST /api/prediction/estimate
 *
 * Request body:
 * {
 *   disasterType:    "Heavy Rainfall" | "Strong Winds" | "Drought"
 *   district:        "Maseru" | "Leribe" | "Berea" | ...
 *   severity:        "Low" | "Moderate" | "Critical"
 *   season:          "Summer" | "Autumn" | "Winter" | "Spring"
 *   numHouseholds:   150
 *   avgDamageLevel:  2.5   (1.0 = minor, 2.0 = moderate, 3.0 = severe, 4.0 = destroyed)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   estimatedFunding: 2608437,
 *   formatted: "M 2,608,437",
 *   predictionId: "67890xyz"
 * }
 */
router.post("/estimate", protect, async (req, res) => {
  try {
    const {
      disasterType,
      district,
      severity,
      season,
      numHouseholds,
      avgDamageLevel,
    } = req.body;

    // --- Validate all required fields are present ---
    if (!disasterType || !district || !severity || !season || !numHouseholds || !avgDamageLevel) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: disasterType, district, severity, season, numHouseholds, avgDamageLevel",
      });
    }

    // --- Look up district vulnerability profile ---
    const profile = DISTRICT_PROFILES[district];
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: `Unknown district: "${district}". Must be one of: ${Object.keys(DISTRICT_PROFILES).join(", ")}`,
      });
    }

    // --- Call Python model with all 9 arguments ---
    const prediction = await runPythonModel(
      disasterType,
      severity,
      season,
      numHouseholds,
      avgDamageLevel,
      profile.pctElderly,
      profile.pctChildrenU5,
      profile.pctDisabled,
      profile.avgHouseholdSize,
    );

    // --- Format the result ---
    const formatted = "M " + Number(prediction).toLocaleString("en-LS");

    // --- Save to database ---
    const userId = req.user?._id || null;

    const predictionDoc = await Prediction.create({
      disasterType,
      district,
      severity,
      season,
      numHouseholds:    Number(numHouseholds),
      avgDamageLevel:   Number(avgDamageLevel),
      estimatedFunding: Number(prediction),
      userId,
    });

    return res.status(200).json({
      success:          true,
      estimatedFunding: Number(prediction),
      formatted,
      predictionId:     predictionDoc._id,
    });

  } catch (error) {
    console.error("Prediction error:", error.message);
    return res.status(500).json({
      success:  false,
      message:  "Failed to generate prediction. " + error.message,
    });
  }
});


/**
 * Runs predict.py as a child process and returns the predicted value.
 * Node.js cannot read .pkl files directly so we call Python for this.
 *
 * Arguments passed to predict.py (in order):
 *   1. disasterType
 *   2. severity
 *   3. season
 *   4. numHouseholds
 *   5. avgDamageLevel
 *   6. pctElderly         ← from DISTRICT_PROFILES, not from user input
 *   7. pctChildrenU5      ← from DISTRICT_PROFILES, not from user input
 *   8. pctDisabled        ← from DISTRICT_PROFILES, not from user input
 *   9. avgHouseholdSize   ← from DISTRICT_PROFILES, not from user input
 */
function runPythonModel(
  disasterType,
  severity,
  season,
  numHouseholds,
  avgDamageLevel,
  pctElderly,
  pctChildrenU5,
  pctDisabled,
  avgHouseholdSize,
) {
  return new Promise((resolve, reject) => {
    const python = spawn("python", [
      PREDICT_SCRIPT,
      disasterType,
      severity,
      season,
      String(numHouseholds),
      String(avgDamageLevel),
      String(pctElderly),
      String(pctChildrenU5),
      String(pctDisabled),
      String(avgHouseholdSize),
    ], {
      cwd: MODEL_DIR,
    });

    let output      = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Python error: " + errorOutput));
      } else {
        const value = parseFloat(output.trim());
        if (isNaN(value)) {
          reject(new Error("Python returned an invalid number: " + output));
        } else {
          resolve(value);
        }
      }
    });
  });
}


/**
 * GET /api/prediction/history
 * Get all predictions for the current user
 */
router.get("/history", protect, async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const predictions = await Prediction.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count:   predictions.length,
      data:    predictions,
    });
  } catch (error) {
    console.error("History error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prediction history",
      error:   error.message,
    });
  }
});


/**
 * GET /api/prediction/:id
 * Get a specific prediction by ID
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const { id }     = req.params;
    const userId     = req.user?._id;
    const prediction = await Prediction.findById(id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found",
      });
    }

    if (
      prediction.userId?.toString() !== userId?.toString() &&
      req.user?.role !== "Administrator"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this prediction",
      });
    }

    return res.status(200).json({
      success: true,
      data:    prediction,
    });
  } catch (error) {
    console.error("Get prediction error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prediction",
      error:   error.message,
    });
  }
});


/**
 * DELETE /api/prediction/:id
 * Delete a prediction (owner or Administrator only)
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id }     = req.params;
    const userId     = req.user?._id;
    const prediction = await Prediction.findById(id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found",
      });
    }

    if (
      prediction.userId?.toString() !== userId?.toString() &&
      req.user?.role !== "Administrator"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this prediction",
      });
    }

    await Prediction.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Prediction deleted successfully",
    });
  } catch (error) {
    console.error("Delete prediction error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete prediction",
      error:   error.message,
    });
  }
});

export default router;