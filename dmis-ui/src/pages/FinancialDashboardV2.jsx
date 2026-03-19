import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinancialDashboardV2() {
  const [overview, setOverview] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("current");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    disasterType: "all",
    district: "all",
    fundingSource: "all",
  });

  useEffect(() => {
    const fetchOverview = async () => {
      setError("");
      try {
        const query = yearFilter === "all" ? "?year=all" : "";
        const [overviewRes, activityRes, expenditureRes] = await Promise.all([
          API.get(`/finance-v2/overview${query}`),
          API.get(`/finance-v2/activities${query}`),
          API.get(`/finance-v2/expenditures${query}`),
        ]);
        setOverview(overviewRes.data);
        setActivities(activityRes.data?.requests || []);
        setActivitySummary(activityRes.data?.summary || null);
        setExpenditures(expenditureRes.data?.expenditures || []);
      } catch (err) {
        setError("Failed to load financial dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [yearFilter]);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading financial dashboard...</p>
      </div>
    );
  }

  const totals = overview?.totals || {};
  const annualBudget = overview?.annualBudget;
  const riskIndex = overview?.riskIndex || 0;
  const riskLabel = riskIndex > 0.9 ? "High" : riskIndex > 0.7 ? "Medium" : "Low";
  const reserveFunds = annualBudget?.reservedForForecast || 0;

  const districtOptions = Array.from(
    new Set(
      activities
        .map((item) => item.incidentId?.district)
        .filter(Boolean)
    )
  ).sort();

  const filteredActivities = activities.filter((item) => {
    const createdAt = new Date(item.createdAt || item.updatedAt || Date.now());
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;
    const withinFrom = fromDate ? createdAt >= fromDate : true;
    const withinTo = toDate ? createdAt <= toDate : true;
    const typeMatch = filters.disasterType === "all"
      ? true
      : item.incidentId?.type === filters.disasterType;
    const districtMatch = filters.district === "all"
      ? true
      : item.incidentId?.district === filters.district;
    return withinFrom && withinTo && typeMatch && districtMatch;
  });

  const filteredExpenditures = expenditures.filter((item) => {
    const date = new Date(item.date || item.createdAt || Date.now());
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;
    const withinFrom = fromDate ? date >= fromDate : true;
    const withinTo = toDate ? date <= toDate : true;
    const typeMatch = filters.disasterType === "all"
      ? true
      : item.incidentFundId?.disasterType === filters.disasterType;
    const districtMatch = filters.district === "all"
      ? true
      : item.incidentFundId?.disasterId?.district === filters.district;
    return withinFrom && withinTo && typeMatch && districtMatch;
  });

  const budgetVsSpend = [
    { label: "Allocated Budget", value: annualBudget?.totalAllocated || 0 },
    { label: "Total Spent", value: totals.spent || 0 },
  ];

  const monthGroups = filteredExpenditures.reduce((acc, item) => {
    const date = new Date(item.date || item.createdAt || Date.now());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + (item.amount || 0);
    return acc;
  }, {});
  const monthlySeries = Object.entries(monthGroups)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .slice(-6)
    .map(([label, value]) => ({ label, value }));

  const typeTotals = filteredExpenditures.reduce((acc, item) => {
    const type = item.incidentFundId?.disasterType || "unknown";
    acc[type] = (acc[type] || 0) + (item.amount || 0);
    return acc;
  }, {});
  const typeSeries = [
    { label: "strong_winds", value: typeTotals.strong_winds || 0, color: "#38bdf8" },
    { label: "drought", value: typeTotals.drought || 0, color: "#f97316" },
    { label: "heavy_rainfall", value: typeTotals.heavy_rainfall || 0, color: "#22c55e" },
  ];
  const totalTypeSpend = typeSeries.reduce((sum, item) => sum + item.value, 0) || 1;
  const pieStops = typeSeries
    .reduce((acc, item) => {
      const last = acc.length ? acc[acc.length - 1].offset : 0;
      const next = last + (item.value / totalTypeSpend) * 100;
      acc.push({ ...item, offset: next });
      return acc;
    }, [])
    .map((item, index, arr) => {
      const start = index === 0 ? 0 : arr[index - 1].offset;
      return `${item.color} ${start}% ${item.offset}%`;
    })
    .join(", ");

  const alerts = [];
  const budgetUtilization = annualBudget?.totalAllocated
    ? (totals.spent || 0) / annualBudget.totalAllocated
    : 0;
  if (budgetUtilization >= 0.8) {
    alerts.push("Budget utilization has crossed 80%.");
  }
  if ((totals.spent || 0) > (totals.adjusted || 0)) {
    alerts.push("Over-expenditure detected on adjusted incident budgets.");
  }
  if ((activitySummary?.pendingCount || 0) > 0) {
    alerts.push("Funding approvals are pending.");
  }
  if (riskIndex > 0.9) {
    alerts.push("Forecasted shortfall risk is high.");
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Dashboard</h1>
          <p className="dashboard-subtitle">
            National budget health, incident commitments, and remaining capacity
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="finance-filters">
        <div className="filter-group">
          <label>Year</label>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="current">Current Year</option>
            <option value="all">All Years</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Date from</label>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Date to</label>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Disaster type</label>
          <select
            value={filters.disasterType}
            onChange={(event) => setFilters((prev) => ({ ...prev, disasterType: event.target.value }))}
          >
            <option value="all">All</option>
            <option value="strong_winds">Heavy winds</option>
            <option value="drought">Droughts</option>
            <option value="heavy_rainfall">Heavy rains</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Region/District</label>
          <select
            value={filters.district}
            onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}
          >
            <option value="all">All</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Funding source</label>
          <select
            value={filters.fundingSource}
            onChange={(event) => setFilters((prev) => ({ ...prev, fundingSource: event.target.value }))}
          >
            <option value="all">All</option>
            <option value="government">Government</option>
            <option value="donor">Donor</option>
            <option value="ngo">NGO</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-info">
            <p className="stat-label">Annual Budget</p>
            <h3 className="stat-value">{formatMoney(annualBudget?.totalAllocated || 0)}</h3>
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
            <p className="stat-label">Total Funds Disbursed</p>
            <h3 className="stat-value">{formatMoney(totals.spent || 0)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-info">
            <p className="stat-label">Remaining Budget</p>
            <h3 className="stat-value">{formatMoney(totals.remaining || 0)}</h3>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-info">
            <p className="stat-label">Emergency Reserve Funds</p>
            <h3 className="stat-value">{formatMoney(reserveFunds)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-info">
            <p className="stat-label">Pending Financial Approvals</p>
            <h3 className="stat-value">{activitySummary?.pendingCount || 0}</h3>
          </div>
        </div>
      </div>

      <div className="secondary-stats">
        <div className="mini-stat">Risk Index: {riskLabel}</div>
        <div className="mini-stat">Base Budgets: {formatMoney(totals.base || 0)}</div>
        <div className="mini-stat">Spent: {formatMoney(totals.spent || 0)}</div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h2>Budget vs Expenditure</h2>
          <div className="bar-chart">
            {budgetVsSpend.map((item) => {
              const maxValue = Math.max(...budgetVsSpend.map((row) => row.value || 0), 1);
              return (
                <div className="bar-row" key={item.label}>
                  <span className="bar-label">{item.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.round(((item.value || 0) / maxValue) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatMoney(item.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart-card">
          <h2>Monthly Spending Trend</h2>
          <div className="trend-chart">
            {monthlySeries.map((item) => (
              <div className="trend-bar" key={item.label}>
                <span className="trend-label">{item.label}</span>
                <div className="trend-track">
                  <div
                    className="trend-fill info"
                    style={{ width: `${Math.round(((item.value || 0) / Math.max(...monthlySeries.map((row) => row.value || 0), 1)) * 100)}%` }}
                  />
                </div>
                <span className="trend-value">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <h2>Expenditure by Disaster Type</h2>
          <div className="pie-chart" style={{ background: `conic-gradient(${pieStops})` }} />
          <div className="pie-legend">
            {typeSeries.map((item) => (
              <div className="pie-legend-item" key={item.label}>
                <span className="pie-swatch" style={{ background: item.color }} />
                <span className="pie-label">{item.label.replace(/_/g, " ")}</span>
                <span className="pie-value">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h2 className="section-title">Recent Financial Activities</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Incident ID</th>
              <th>Approved Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Authorized By</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map((item) => (
              <tr key={item._id}>
                <td>{item.incidentId?._id || item.incidentId}</td>
                <td>{formatMoney(item.approvedAmount || 0)}</td>
                <td>{item.status}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td>{item.approvedBy || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Alerts & Notifications</h2>
          <span className="forecast-period">Live</span>
        </div>
        <div className="forecast-insights-grid">
          {alerts.length ? (
            alerts.map((alert, index) => (
              <div className="forecast-insight-card" key={`alert-${index}`}>
                <span className="label">Alert</span>
                <span className="value">{alert}</span>
              </div>
            ))
          ) : (
            <div className="forecast-insight-card">
              <span className="label">All Clear</span>
              <span className="value">No active financial alerts.</span>
            </div>
          )}
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Operating Model</h2>
          <span className="forecast-period">Finance v2</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Budget Envelopes</span>
            <span className="value">Disaster allocations per type</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Incident Funds</span>
            <span className="value">Linked to verified incidents</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Expenditure Controls</span>
            <span className="value">Category caps and overrides</span>
          </div>
        </div>
      </div>
    </div>
  );
}
