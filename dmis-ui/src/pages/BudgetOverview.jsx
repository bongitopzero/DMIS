import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import "./FundManagement.css";

export default function BudgetOverview({ embedded = false }) {
  const [budget, setBudget] = useState(null);
  const [risk, setRisk] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const results = await Promise.allSettled([
          API.get("/finance/budget/current"),
          API.get("/finance/risk"),
          API.get("/finance/summary"),
        ]);

        if (results[0].status === "fulfilled") setBudget(results[0].value.data);
        if (results[1].status === "fulfilled") setRisk(results[1].value.data);
        if (results[2].status === "fulfilled") {
          const summaryData = results[2].value.data;
          setSummary(summaryData);
          if (summaryData?.annualBudget) {
            setBudget(summaryData.annualBudget);
          }
        }
      } catch (err) {
        setError("Failed to load budget data");
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
        <p>Loading budget overview...</p>
      </div>
    );
  }

  const allocatedValue = budget?.totalAllocated ?? budget?.allocatedBudget ?? 0;
  const committedValue = budget?.committed ?? budget?.committedFunds ?? 0;
  const spentValue = budget?.spent ?? budget?.spentFunds ?? 0;
  const remainingValue = budget?.remaining ?? budget?.remainingBudget ?? 0;
  const derivedRisk = allocatedValue > 0
    ? remainingValue / allocatedValue < 0.1
      ? "High"
      : remainingValue / allocatedValue < 0.3
        ? "Medium"
        : "Low"
    : "Low";

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Budget Overview</h1>
            <p className="dashboard-subtitle">
              Annual allocations, commitments, and remaining budget
            </p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Allocated Budget</p>
            <h3 className="stat-value">M {formatMoney(allocatedValue)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Committed Funds</p>
            <h3 className="stat-value">M {formatMoney(committedValue)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Spent Funds</p>
            <h3 className="stat-value">M {formatMoney(spentValue)}</h3>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Remaining Budget</p>
            <h3 className="stat-value">M {formatMoney(remainingValue)}</h3>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Risk & Requests</h2>
          <span className="forecast-period">FY {budget?.fiscalYear || "N/A"}</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Financial Risk</span>
            <span className="value">{risk?.financialRisk || budget?.financialRisk || derivedRisk}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Pending Requests</span>
            <span className="value">{summary?.pendingRequests || 0}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Requested</span>
            <span className="value">M {formatMoney(summary?.totalRequested)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Approved</span>
            <span className="value">M {formatMoney(summary?.totalApproved)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
