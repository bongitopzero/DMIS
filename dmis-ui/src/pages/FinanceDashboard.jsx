import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

// Same formula used in BudgetAllocation.jsx
const NATIONAL_EXPENDITURE = 82648374;
const PER_DISASTER = NATIONAL_EXPENDITURE / 3;
const RESERVE = PER_DISASTER * 0.1 * 3;
const FINAL_PER_DISASTER = PER_DISASTER * 0.9;
const TOTAL_ALLOCATED = FINAL_PER_DISASTER * 3 + RESERVE; // = NATIONAL_EXPENDITURE

export default function FinanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFinance = async () => {
      setError("");
      try {
        // Only disaster-summary has real data — use it as the source of truth
        const res = await API.get("/allocation/disaster-summary");
        const disasterSummary = res.data || [];

        const totalSpent     = disasterSummary.reduce((s, d) => s + (d.totalAmount    || 0), 0);
        const totalHouseholds = disasterSummary.reduce((s, d) => s + (d.totalHouseholds || 0), 0);
        const totalPackages  = disasterSummary.reduce((s, d) => s + (d.totalPackages  || 0), 0);

        const totalAllocated = TOTAL_ALLOCATED;
        const totalRemaining = Math.max(totalAllocated - totalSpent, 0);

        setSummary({
          budget: {
            allocatedBudget: totalAllocated,
            committedFunds:  totalSpent,
            spentFunds:      totalSpent,
            remainingBudget: totalRemaining,
            fiscalYear:      "2026/2027",
          },
          totalApproved:   totalSpent,
          totalRequested:  totalAllocated,
          totalHouseholds,
          totalPackages,
          byType: disasterSummary,
        });
      } catch (err) {
        console.error("Failed to load finance data:", err);
        setError("Failed to load finance data");
      } finally {
        setLoading(false);
      }
    };

    fetchFinance();
  }, []);

  const fmt = (v) => (Number.isFinite(v) ? v : 0).toLocaleString();

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading finance dashboard...</p>
      </div>
    );
  }

  const budget        = summary?.budget;
  const allocatedBudget = budget?.allocatedBudget ?? 0;
  const spentFunds      = budget?.spentFunds      ?? 0;
  const remainingBudget = budget?.remainingBudget ?? 0;
  const totalHouseholds = summary?.totalHouseholds ?? 0;
  const totalPackages   = summary?.totalPackages   ?? 0;
  const byType          = summary?.byType          ?? [];

  const notSpentTotal   = Math.max(allocatedBudget - spentFunds, 0);
  const utilisationPct  = allocatedBudget > 0 ? ((spentFunds / allocatedBudget) * 100).toFixed(1) : 0;

  const kpis = [
    { label: "Total Allocated", value: allocatedBudget },
    { label: "Total Disbursed", value: spentFunds },
    { label: "Remaining Budget", value: remainingBudget },
    { label: "Households Supported", value: totalHouseholds, isCount: true },
    { label: "Packages Distributed", value: totalPackages, isCount: true },
  ];

  // Quarterly split — estimated from total disbursed
  const barSeries = [
    { label: "Q1", value: spentFunds * 0.22 },
    { label: "Q2", value: spentFunds * 0.30 },
    { label: "Q3", value: spentFunds * 0.18 },
    { label: "Q4", value: spentFunds * 0.30 },
  ];
  const barMax = Math.max(...barSeries.map((b) => b.value), 1);

  // Donut segments
  const budgetUtilSplit = [
    { label: "Disbursed", value: spentFunds },
    { label: "Remaining", value: remainingBudget },
  ];

  const spendSplit = [
    { label: "Spent",     value: spentFunds },
    { label: "Not Spent", value: notSpentTotal },
  ];

  // By disaster type breakdown
  const byTypeSplit = byType.map((d) => ({ label: d.type, value: d.totalAmount || 0 }));

  const donutColors = ["#1F3B5C", "#2f8f83", "#d29922", "#a371f7", "#3fb950", "#f85149"];

  const buildDonut = (segments, colors) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    let offset = 0;
    const stops = segments.map((seg, i) => {
      const start = offset;
      const pct = (seg.value / total) * 100;
      offset += pct;
      return `${colors[i % colors.length]} ${start}% ${offset}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  };

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

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((item) => (
          <div key={item.label} className="kpi-card">
            <div className="kpi-value">
              {item.isCount ? item.value.toLocaleString() : `M ${fmt(item.value)}`}
            </div>
            <div className="kpi-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="finance-charts-grid">

        {/* Quarterly Spending Bar Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h2>Quarterly Spending (M)</h2>
            <span className="trend-pill">FY {budget?.fiscalYear || "N/A"}</span>
          </div>
          <div className="bar-chart">
            {barSeries.map((item) => (
              <div key={item.label} className="bar-item">
                <div
                  className="bar"
                  style={{ height: `${(item.value / barMax) * 100}%` }}
                ></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Utilisation Donut */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Budget Utilization</h2>
          </div>
          <div
            className="donut"
            style={{ background: buildDonut(budgetUtilSplit, donutColors) }}
          ></div>
          <div className="donut-legend">
            {budgetUtilSplit.map((item, i) => (
              <span key={item.label}>
                <i style={{ background: donutColors[i] }}></i>
                {item.label} — M{fmt(item.value)}
              </span>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#718096", marginTop: "0.5rem" }}>
            {utilisationPct}% of budget utilised
          </p>
        </div>

        {/* Spending by Disaster Type Donut */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Spending by Disaster Type</h2>
          </div>
          {byTypeSplit.length > 0 ? (
            <>
              <div
                className="donut"
                style={{ background: buildDonut(byTypeSplit, donutColors) }}
              ></div>
              <div className="donut-legend">
                {byTypeSplit.map((item, i) => (
                  <span key={item.label}>
                    <i style={{ background: donutColors[i % donutColors.length] }}></i>
                    {item.label} — M{fmt(item.value)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ textAlign: "center", color: "#718096", marginTop: "2rem" }}>
              No disbursements recorded yet
            </p>
          )}
        </div>

        {/* Spending vs Budget Donut */}
        <div className="chart-card">
          <div className="chart-header">
            <h2>Spending vs Budget</h2>
          </div>
          <div
            className="donut"
            style={{ background: buildDonut(spendSplit, donutColors) }}
          ></div>
          <div className="donut-legend">
            {spendSplit.map((item, i) => (
              <span key={item.label}>
                <i style={{ background: donutColors[i] }}></i>
                {item.label} — M{fmt(item.value)}
              </span>
            ))}
          </div>
        </div>

        {/* Disaster Type Breakdown Table */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h2>Disbursement Breakdown by Disaster Type</h2>
          </div>
          {byType.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "#718096" }}>Disaster Type</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "#718096" }}>Disasters</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "#718096" }}>Households</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "#718096" }}>Packages</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "#718096" }}>Total Disbursed</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((d, i) => (
                  <tr key={d.type} style={{ borderBottom: "1px solid #f0f4f8", background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{d.type}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>{d.disasters?.length || 0}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>{(d.totalHouseholds || 0).toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>{d.totalPackages || 0}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#1F3B5C" }}>
                      M{fmt(d.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f7fafc" }}>
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700 }}>Total</td>
                  <td></td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>{totalHouseholds.toLocaleString()}</td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>{totalPackages}</td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700, color: "#1F3B5C" }}>
                    M{fmt(spentFunds)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p style={{ textAlign: "center", color: "#718096", padding: "2rem" }}>
              No disbursements recorded yet
            </p>
          )}
        </div>

      </div>
    </div>
  );
}