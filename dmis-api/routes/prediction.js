// routes/prediction.js
// ---------------------
// This route receives disaster details from the frontend
// and returns a predicted funding amount by calling the Python model.

import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Get the directory where this file lives so we can find predict.py
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Path to predict.py — sitting in the root of your DMIS folder
// Adjust this path if you move predict.py somewhere else
const PREDICT_SCRIPT = path.join(__dirname, "../../predict.py");
const MODEL_DIR      = path.join(__dirname, "../../");

/**
 * POST /api/prediction/estimate
 *
 * Request body:
 * {
 *   disasterType:  "Heavy Rainfall" | "Strong Winds" | "Drought"
 *   district:      "Maseru" | "Leribe" | "Berea" | ...
 *   severity:      "Low" | "Moderate" | "Critical"
 *   season:        "Summer" | "Autumn" | "Winter" | "Spring"
 *   numHouseholds: 150
 * }
 *
 * Response:
 * {
 *   success: true,
 *   estimatedFunding: 2608437,
 *   formatted: "M 2,608,437"
 * }
 */
router.post("/estimate", async (req, res) => {
  try {
    const { disasterType, district, severity, season, numHouseholds } = req.body;

    // Validate all fields are present
    if (!disasterType || !district || !severity || !season || !numHouseholds) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: disasterType, district, severity, season, numHouseholds",
      });
    }

    // Call the Python prediction script
    const prediction = await runPythonModel(
      disasterType,
      district,
      severity,
      season,
      numHouseholds
    );

    // Format the number nicely
    const formatted = "M " + Number(prediction).toLocaleString("en-LS");

    return res.status(200).json({
      success: true,
      estimatedFunding: Number(prediction),
      formatted,
    });

  } catch (error) {
    console.error("Prediction error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate prediction. " + error.message,
    });
  }
});


/**
 * Runs predict.py as a child process and returns the predicted value.
 * Node.js cannot read .pkl files directly, so we call Python for this.
 */
function runPythonModel(disasterType, district, severity, season, numHouseholds) {
  return new Promise((resolve, reject) => {
    // Spawn a Python process with the inputs as arguments
    const python = spawn("python", [
      PREDICT_SCRIPT,
      disasterType,
      district,
      severity,
      season,
      String(numHouseholds),
    ], {
      cwd: MODEL_DIR, // Run from the folder where the .pkl files are
    });

    let output = "";
    let errorOutput = "";

    // Collect output from Python
    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Collect any errors from Python
    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // When Python finishes
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

export default router;
