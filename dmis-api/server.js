// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";

// Import routes
import authRoutes from "./routes/auth.js";
import disasterRoutes from "./routes/disasters.js";
import fundRoutes from "./routes/fundRoutes.js";
import forecastingRoutes from "./routes/forecasting.js";
import forecastRoutes from "./routes/forecastRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import financeV2Routes from "./routes/financeV2Routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Test route
app.get("/", (req, res) => {
  res.send("DMIS API is running ✅");
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/disasters", disasterRoutes);
app.use("/api/funds", fundRoutes);
app.use("/api/forecasting", forecastingRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/finance-v2", financeV2Routes);


// Connect to MongoDB
Promise.all([mongoose.connect(process.env.MONGO_URI), connectDB()])
  .then(() => {
    console.log("MongoDB connected successfully ✅");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error ❌:", err));
