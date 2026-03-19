import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { TrendingUp, DollarSign } from "lucide-react";
import "./FundManagement.css";

export default function ForecastAlignment({ embedded = false }) {
  const [forecast, setForecast] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const results = await Promise.allSettled([
          API.get("/forecast/generate"),
          API.get("/finance/budget/current"),
        ]);
        if (results[0].status === "fulfilled") setForecast(results[0].value.data);
        if (results[1].status === "fulfilled") setBudget(results[1].value.data);
      } catch (err) {
        setError("Failed to load forecast alignment");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatMoney = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString();

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading forecast alignment...</p>
      </div>
    );
  }

  const remainingBudget = budget?.remainingBudget ?? 0;
  const fundingGap = forecast?.fundingGap ?? 0;

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Forecast Alignment</h1>
            <p className="dashboard-subtitle">Compare projected cost vs remaining budget</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Projected Cost</p>
            <h3 className="stat-value">M {formatMoney(forecast?.totalProjectedCost)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Remaining Budget</p>
            <h3 className="stat-value">M {formatMoney(remainingBudget)}</h3>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Gap Analysis</h2>
          <span className="forecast-period">{forecast?.period || "Next Quarter"}</span>
        </div>
        <div className="forecast-insights-grid">
          <div className={`forecast-insight-card ${fundingGap > 0 ? "gap" : "surplus"}`}>
            <span className="label">Funding Gap</span>
            <span className="value">M {formatMoney(Math.abs(fundingGap))}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Budget Risk</span>
            <span className="value">{forecast?.budgetRisk || "Low"}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Confidence</span>
            <span className="value">{forecast?.confidenceScore ?? 0}%</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Remaining %</span>
            <span className="value">
              {budget?.allocatedBudget
                ? `${((remainingBudget / budget.allocatedBudget) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
