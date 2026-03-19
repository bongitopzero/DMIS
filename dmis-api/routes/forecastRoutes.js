import express from "express";
import { generateForecast } from "../models/forecasting.js";

const router = express.Router();

router.get("/generate", async (req, res) => {
  try {
    const forecast = await generateForecast();
    res.json(forecast);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Forecast generation failed" });
  }
});

export default router;
