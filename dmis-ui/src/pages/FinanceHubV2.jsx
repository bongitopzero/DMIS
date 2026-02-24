import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinanceHubV2() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOverview = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/overview");
        setOverview(res.data);
      } catch (err) {
        setError("Failed to load finance overview");
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading finance hub...</p>
      </div>
    );
  }

  const totals = overview?.totals || {};
  const annualBudget = overview?.annualBudget;
  const riskIndex = overview?.riskIndex || 0;
  const riskLabel = riskIndex > 0.9 ? "High" : riskIndex > 0.7 ? "Medium" : "Low";

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Finance Command Center</h1>
          <p className="dashboard-subtitle">
            New budget engine with envelopes, needs, and incident-linked funds
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-info">
            <p className="stat-label">Annual Budget</p>
            <h3 className="stat-value">
              {formatMoney(annualBudget?.totalAllocated || 0)}
            </h3>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-info">
            <p className="stat-label">Adjusted Incident Budgets</p>
            <h3 className="stat-value">{formatMoney(totals.adjusted || 0)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-info">
            <p className="stat-label">Committed Funds</p>
            <h3 className="stat-value">{formatMoney(totals.committed || 0)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-info">
            <p className="stat-label">Remaining Balance</p>
            <h3 className="stat-value">{formatMoney(totals.remaining || 0)}</h3>
          </div>
        </div>
      </div>

      <div className="secondary-stats">
        <div className="mini-stat">Risk Index: {riskLabel}</div>
        <div className="mini-stat">Base Budgets: {formatMoney(totals.base || 0)}</div>
        <div className="mini-stat">Spent: {formatMoney(totals.spent || 0)}</div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Finance System Modules</h2>
          <span className="forecast-period">Finance v2</span>
        </div>
        <div className="forecast-insights-grid">
          <Link className="forecast-insight-card" to="/finance-v2/envelopes">
            <span className="label">Budget Envelopes</span>
            <span className="value">Disaster allocations</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/needs">
            <span className="label">Needs Profiles</span>
            <span className="value">Unit costs by type</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/cost-profiles">
            <span className="label">Cost Profiles</span>
            <span className="value">Disaster + housing tiers</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/incident-funds">
            <span className="label">Incident Funds</span>
            <span className="value">Linked to verified incidents</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/expenditures">
            <span className="label">Incident Expenditures</span>
            <span className="value">Caps and approvals</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/forecast">
            <span className="label">Forecast</span>
            <span className="value">Budget vs spend</span>
          </Link>
          <Link className="forecast-insight-card" to="/finance-v2/snapshots">
            <span className="label">Snapshots</span>
            <span className="value">Immutable impact records</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
