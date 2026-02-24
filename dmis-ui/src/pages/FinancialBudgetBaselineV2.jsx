import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinancialBudgetBaselineV2() {
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fiscalYear, setFiscalYear] = useState("2025/2026");
  const [allocations, setAllocations] = useState([
    { disasterType: "drought", allocationPercent: 40, baselineAmount: 30242798 },
    { disasterType: "heavy_rainfall", allocationPercent: 30, baselineAmount: 22682098 },
    { disasterType: "strong_winds", allocationPercent: 20, baselineAmount: 15121399 },
    { disasterType: "emergency_reserve", allocationPercent: 10, baselineAmount: 7560699 },
  ]);

  useEffect(() => {
    const fetchBaseline = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/baseline");
        setBaseline(res.data?.baseline || null);
      } catch (err) {
        setError("Failed to load baseline budget");
      } finally {
        setLoading(false);
      }
    };
    fetchBaseline();
  }, []);

  const handleCreate = async () => {
    setError("");
    try {
      const payload = {
        fiscalYear,
        allocations: allocations.map((row) => ({
          disasterType: row.disasterType,
          allocationPercent: Number(row.allocationPercent),
          baselineAmount: Number(row.baselineAmount),
        })),
      };
      const res = await API.post("/finance-v2/baseline", payload);
      setBaseline(res.data?.baseline || null);
    } catch (err) {
      setError("Failed to create baseline budget");
    }
  };

  const handleApprove = async () => {
    if (!baseline?._id) return;
    setError("");
    try {
      const res = await API.put(`/finance-v2/baseline/${baseline._id}/approve`);
      setBaseline(res.data?.baseline || null);
    } catch (err) {
      setError("Failed to approve baseline budget");
    }
  };

  const handleLock = async () => {
    if (!baseline?._id) return;
    setError("");
    try {
      const res = await API.put(`/finance-v2/baseline/${baseline._id}/lock`);
      setBaseline(res.data?.baseline || null);
    } catch (err) {
      setError("Failed to lock baseline budget");
    }
  };

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading baseline budget...</p>
      </div>
    );
  }

  const effectiveAllocations = baseline?.allocations?.length
    ? baseline.allocations
    : allocations.map((row) => ({
        disasterType: row.disasterType,
        allocationPercent: row.allocationPercent,
        baselineAmount: row.baselineAmount,
      }));

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Baseline Disaster Budget Configuration</h1>
          <p className="dashboard-subtitle">
            Define allocations, approvals, and locking for the fiscal year.
          </p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="btn-export" onClick={handleCreate}>
            Create Baseline
          </button>
          <button type="button" className="btn-export" onClick={handleApprove}>
            Approve
          </button>
          <button type="button" className="btn-export" onClick={handleLock}>
            Lock
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="secondary-stats">
        <div className="mini-stat">Status: {baseline?.status || "draft"}</div>
        <div className="mini-stat">Version: {baseline?.version || 1}</div>
        <div className="mini-stat">Fiscal Year: {baseline?.fiscalYear || fiscalYear}</div>
      </div>

      <div className="finance-filters">
        <div className="filter-group">
          <label>Fiscal Year</label>
          <input
            type="text"
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Allocation %</th>
              <th>Baseline Amount (M)</th>
            </tr>
          </thead>
          <tbody>
            {effectiveAllocations.map((row) => (
              <tr key={row.disasterType}>
                <td>{row.disasterType.replace(/_/g, " ")}</td>
                <td>{Math.round(row.allocationPercent)}%</td>
                <td>{formatMoney(row.baselineAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Governance Controls</h2>
          <span className="forecast-period">Required</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Create / Modify Baseline</span>
            <span className="value">Changes require approval workflow</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Approval</span>
            <span className="value">Dual authorization required</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Locking</span>
            <span className="value">Baselines locked after approval</span>
          </div>
        </div>
      </div>
    </div>
  );
}
