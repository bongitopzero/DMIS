import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import "./FundManagement.css";

export default function RiskAlerts({ embedded = false }) {
  const [risk, setRisk] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRisk = async () => {
      setError("");
      try {
        const results = await Promise.allSettled([
          API.get("/finance/risk"),
          API.get("/forecast/generate"),
        ]);
        if (results[0].status === "fulfilled") setRisk(results[0].value.data);
        if (results[1].status === "fulfilled") setForecast(results[1].value.data);
      } catch (err) {
        setError("Failed to load risk alerts");
      } finally {
        setLoading(false);
      }
    };

    fetchRisk();
  }, []);

  const formatMoney = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString();

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading risk alerts...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Financial Risk Alerts</h1>
            <p className="dashboard-subtitle">Budget stress signals and forecast gaps</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card warning">
          <div className="stat-icon">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Risk Level</p>
            <h3 className="stat-value">{risk?.financialRisk || "Low"}</h3>
          </div>
        </div>
        <div className="stat-card primary">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Funding Gap</p>
            <h3 className="stat-value">M {formatMoney(Math.abs(forecast?.fundingGap ?? 0))}</h3>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Risk Factors</h2>
          <span className="forecast-period">Current budget state</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Allocated Budget</span>
            <span className="value">M {formatMoney(risk?.allocatedBudget)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Remaining Budget</span>
            <span className="value">M {formatMoney(risk?.remainingBudget)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Projected Cost</span>
            <span className="value">M {formatMoney(forecast?.totalProjectedCost)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Confidence</span>
            <span className="value">{forecast?.confidenceScore ?? 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
