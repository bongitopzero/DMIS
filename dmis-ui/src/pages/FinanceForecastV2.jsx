import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinanceForecastV2() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchForecast = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/forecast");
        setForecast(res.data);
      } catch (err) {
        setError("Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading forecast...</p>
      </div>
    );
  }

  const budgetSeries = forecast?.budgetSeries || [];
  const spendSeries = forecast?.spendSeries || [];
  const averageSpend = forecast?.averageSpend || 0;
  const maxValue = Math.max(
    ...budgetSeries.map((item) => item.value || 0),
    ...spendSeries.map((item) => item.value || 0),
    1
  );

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Forecast Alignment</h1>
          <p className="dashboard-subtitle">Budget allocations versus historic spend</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Budget vs Spend Series</h2>
          <span className="forecast-period">Average Spend {formatMoney(averageSpend)}</span>
        </div>
        <div className="trend-chart">
          {budgetSeries.map((item) => (
            <div className="trend-bar" key={`budget-${item.label}`}>
              <span className="trend-label">Budget {item.label}</span>
              <div className="trend-track">
                <div
                  className="trend-fill info"
                  style={{ width: `${Math.round(((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span className="trend-value">{formatMoney(item.value)}</span>
            </div>
          ))}
          {spendSeries.map((item) => (
            <div className="trend-bar" key={`spend-${item.label}`}>
              <span className="trend-label">Spend {item.label}</span>
              <div className="trend-track">
                <div
                  className="trend-fill warning"
                  style={{ width: `${Math.round(((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span className="trend-value">{formatMoney(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
