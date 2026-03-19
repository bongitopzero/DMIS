import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import "./Forecasting.css";

export default function Forecasting() {
  const [form, setForm] = useState({
    disaster_type: "Heavy Rainfall",
    severity_level: 1,
    households_affected: "",
    household_size: "",
    income_level: 1,
    damage_level: 1,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePredict = async () => {
    setError("");
    setResult(null);

    if (!form.households_affected || !form.household_size) {
      setError("Please fill in all fields before predicting.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/forecasting/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disaster_type: form.disaster_type,
          severity_level: parseInt(form.severity_level),
          households_affected: parseInt(form.households_affected),
          household_size: parseInt(form.household_size),
          income_level: parseInt(form.income_level),
          damage_level: parseInt(form.damage_level),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.predicted_cost);
      } else {
        setError(data.message || "Prediction failed.");
      }
    } catch (err) {
      setError("Could not connect to forecasting service. Make sure the Python server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forecasting-container">


      {/* Form */}
      <div className="forecast-form-card">
        <h2 className="form-title">Enter Disaster Details</h2>
        <p className="form-subtitle">
          Fill in the disaster and household information below to generate a cost prediction.
        </p>

        <div className="form-grid">
          {/* Disaster Type */}
          <div className="form-group">
            <label>Disaster Type</label>
            <select name="disaster_type" value={form.disaster_type} onChange={handleChange}>
              <option value="Heavy Rainfall">Heavy Rainfall</option>
              <option value="Strong Winds">Strong Winds</option>
              <option value="Drought">Drought</option>
            </select>
          </div>

          {/* Severity Level */}
          <div className="form-group">
            <label>Severity Level</label>
            <select name="severity_level" value={form.severity_level} onChange={handleChange}>
              <option value={1}>Low — minor disruption, few households</option>
              <option value={2}>Medium — some damage, partial displacement</option>
              <option value={3}>High — major damage, widespread impact</option>
            </select>
          </div>

          {/* Households Affected */}
          <div className="form-group">
            <label>Number of Households Affected</label>
            <input
              type="number"
              name="households_affected"
              value={form.households_affected}
              onChange={handleChange}
              placeholder="e.g. 35"
              min="1"
            />
          </div>

          {/* Average Household Size */}
          <div className="form-group">
            <label>Average Household Size</label>
            <input
              type="number"
              name="household_size"
              value={form.household_size}
              onChange={handleChange}
              placeholder="e.g. 5"
              min="1"
            />
          </div>

          {/* Income Level */}
          <div className="form-group">
            <label>Average Income Level</label>
            <select name="income_level" value={form.income_level} onChange={handleChange}>
              <option value={1}>High — above M10,000/month</option>
              <option value={2}>Medium — M3,001 to M10,000/month</option>
              <option value={3}>Low — M3,000 or below/month</option>
            </select>
          </div>

          {/* Damage Level */}
          <div className="form-group">
            <label>Extent of Damage</label>
            <select name="damage_level" value={form.damage_level} onChange={handleChange}>
              <option value={1}>Low — minimal structural damage</option>
              <option value={2}>Medium — partial damage, some assets lost</option>
              <option value={3}>High — severe or complete loss</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Button */}
        <button
          className="predict-button"
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? "Predicting..." : "Generate Cost Prediction"}
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="result-card">
          <div className="result-content">
            <p className="result-label">Estimated Disaster Response Cost</p>
            <p className="result-amount">
              M {result.toLocaleString("en-LS", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="result-note">
              This estimate is generated by the DMIS machine learning model based on disaster
              type, severity, number of households, income level, and extent of damage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}