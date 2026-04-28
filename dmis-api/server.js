// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Import routes
import authRoutes from "./routes/auth.js";
import disasterRoutes from "./routes/disasters.js";
import forecastingRoutes from "./routes/forecasting.js";
import financialRoutes from "./routes/financial.js";
import predictionRoutes from "./routes/prediction.js";
import allocationRoutes from "./routes/allocation.js";
import fundsRoutes from "./routes/funds.js";
import incidentRoutes from "./routes/incidents.js";
import coordinatorRoutes from "./routes/coordinator.js";
import allocationController from "./controllers/allocationController.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });
const app = express();
const PORT = process.env.PORT || 5000;

console.log('APP CREATED:', typeof app);

// Middleware
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/disasters", disasterRoutes);
app.use("/api/prediction", predictionRoutes);
app.use("/api/forecasting", forecastingRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/funds", fundsRoutes);
app.use("/api/allocation", allocationRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/coordinator", coordinatorRoutes);


// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully ✅");
    await allocationController.seedDefaultAssistancePackages();
    console.log("About to start server...");

    // Add routes here
    app.use('/hello3', (req, res) => {
      console.log('HELLO3 ROUTE HIT');
      res.json({ message: 'Hello3 route works' });
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error ❌:", err));
