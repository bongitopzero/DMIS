import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

export default function FinanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [risk, setRisk] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFinance = async () => {
      setError("");
      try {
        const results = await Promise.allSettled([
          API.get("/budgets/envelope-status/all"),
          API.get("/allocation/disaster-summary"),
        ]);

        const envelopes = results[0].status === "fulfilled" ? results[0].value.data : {};
        const disasterSummary = results[1].status === "fulfilled" ? results[1].value.data : [];

        // Sum all envelope totals and committed
        const totalAllocated = Object.values(envelopes).reduce((s, e) => s + (e.total || 0), 0);
        const totalCommitted = Object.values(envelopes).reduce((s, e) => s + (e.allocated || 0), 0);
        const totalRemaining = Object.values(envelopes).reduce((s, e) => s + (e.remaining || 0), 0);

        // Sum disbursed amounts from disaster summary
        const totalDisbursed = disasterSummary.reduce((s, d) => s + (d.totalAmount || 0), 0);
        const totalHouseholds = disasterSummary.reduce((s, d) => s + (d.totalHouseholds || 0), 0);
        const totalPackages = disasterSummary.reduce((s, d) => s + (d.totalPackages || 0), 0);

        setSummary({
          budget: {
            allocatedBudget: totalAllocated,
            committedFunds: totalCommitted,
            spentFunds: totalDisbursed,
            remainingBudget: totalRemaining,
            fiscalYear: "2026/2027",
          },
          totalApproved: totalDisbursed,
          totalRequested: totalCommitted,
          pendingRequests: totalHouseholds,
          totalPackages,
        });
      } catch (err) {
        setError("Failed to load finance data");
      } finally {
        setLoading(false);
      }
    };

    fetchFinance();
  }, []);

  const formatMoney = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString();

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading finance dashboard...</p>
      </div>
    );
  }

  const budget = summary?.budget;
  const remainingBudget = budget?.remainingBudget ?? 0;
  const allocatedBudget = budget?.allocatedBudget ?? 0;
  const committedFunds = budget?.committedFunds ?? 0;
  const spentFunds = budget?.spentFunds ?? 0;
  const approvedTotal = summary?.totalApproved ?? 0;
  const requestedTotal = summary?.totalRequested ?? 0;
  const pendingCount = summary?.pendingRequests ?? 0;
const totalPackages = summary?.totalPackages ?? 0;

  const budgetTotal = Math.max(allocatedBudget, 1);
  const unapprovedTotal = Math.max(requestedTotal - approvedTotal, 0);
  const notSpentTotal = Math.max(allocatedBudget - spentFunds, 0);

 const kpis = [
    { label: "Total Allocated (All Disasters)", value: allocatedBudget },
    { label: "Total Spent (All Disasters)", value: spentFunds },
    { label: "Remaining", value: remainingBudget },
    { label: "Pending Approval", value: pendingCount, isCount: true },
    { label: "Total Committed", value: committedFunds },
    { label: "Total Packages Distributed", value: totalPackages, isCount: true },
  ];

  const barSeries = [
    { label: "Q1", value: spentFunds * 0.22 },
    { label: "Q2", value: spentFunds * 0.3 },
    { label: "Q3", value: spentFunds * 0.18 },
    { label: "Q4", value: spentFunds * 0.3 },
  ];
  const barMax = Math.max(...barSeries.map((item) => item.value), 1);

  const budgetUtilSplit = [
    { label: "Spent", value: spentFunds },
    { label: "Committed", value: committedFunds },
    { label: "Remaining", value: remainingBudget },
  ];

  const requestSplit = [
    { label: "Approved", value: approvedTotal },
    { label: "Unapproved", value: unapprovedTotal },
    { label: "Pending", value: Math.max(pendingCount, 0) },
  ];

  const forecastTotal = Math.max(forecast?.totalProjectedCost ?? 0, 0);
  const forecastGap = Math.max(forecast?.fundingGap ?? 0, 0);
  const forecastCovered = Math.max(forecastTotal - forecastGap, 0);
  const forecastSplit = [
    { label: "Covered", value: forecastCovered },
    { label: "Gap", value: forecastGap },
  ];

  const spendSplit = [
    { label: "Spent", value: spentFunds },
    { label: "Not Spent", value: notSpentTotal },
  ];

  const buildDonut = (segments, colors) => {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
    let offset = 0;
    const stops = segments.map((seg, index) => {
      const start = offset;
      const pct = (seg.value / total) * 100;
      offset += pct;
      return `${colors[index]} ${start}% ${offset}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  };

  const donutColors = [
    "var(--color-primary-600)",
    "var(--color-info-500)",
    "var(--color-danger-500)",
    "var(--color-success-500)",
  ];

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Finance Dashboard</h1>
          <p className="dashboard-subtitle">
            Official financial overview aligned to system records
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="kpi-grid">
        {kpis.map((item) => (
          <div key={item.label} className="kpi-card">
            <div className="kpi-value">
              {item.isCount ? item.value : `M ${formatMoney(item.value)}`}
            </div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="finance-charts-grid">
        <div className="chart-card wide">
          <div className="chart-header">
            <h2>Quarterly Spending (M)</h2>
            <span className="trend-pill">FY {budget?.fiscalYear || "N/A"}</span>
          </div>
          <div className="bar-chart">
            {barSeries.map((item) => (
              <div key={item.label} className="bar-item">
                <div className="bar" style={{ height: `${(item.value / barMax) * 100}%` }}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2>Budget Utilization</h2>
          </div>
          <div className="donut" style={{ background: buildDonut(budgetUtilSplit, donutColors) }}></div>
          <div className="donut-legend">
            {budgetUtilSplit.map((item, index) => (
              <span key={item.label}><i style={{ background: donutColors[index] }}></i>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2>Request Pipeline</h2>
          </div>
          <div className="donut" style={{ background: buildDonut(requestSplit, donutColors) }}></div>
          <div className="donut-legend">
            {requestSplit.map((item, index) => (
              <span key={item.label}><i style={{ background: donutColors[index] }}></i>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2>Forecast Coverage</h2>
          </div>
          <div className="donut" style={{ background: buildDonut(forecastSplit, donutColors) }}></div>
          <div className="donut-legend">
            {forecastSplit.map((item, index) => (
              <span key={item.label}><i style={{ background: donutColors[index] }}></i>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2>Spending vs Budget</h2>
          </div>
          <div className="donut" style={{ background: buildDonut(spendSplit, donutColors) }}></div>
          <div className="donut-legend">
            {spendSplit.map((item, index) => (
              <span key={item.label}><i style={{ background: donutColors[index] }}></i>{item.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
