import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinancialBudgetExpenditureV2() {
  const [overview, setOverview] = useState(null);
  const [envelopes, setEnvelopes] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const [overviewRes, envelopeRes, expenditureRes, fundRes] = await Promise.all([
          API.get("/finance-v2/overview"),
          API.get("/finance-v2/envelopes"),
          API.get("/finance-v2/expenditures"),
          API.get("/finance-v2/incident-funds"),
        ]);
        setOverview(overviewRes.data);
        setEnvelopes(envelopeRes.data?.envelopes || []);
        setExpenditures(expenditureRes.data?.expenditures || []);
        setFunds(fundRes.data?.funds || []);
      } catch (err) {
        setError("Failed to load budgets and expenditures");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading budgets and expenditures...</p>
      </div>
    );
  }

  const annualBudget = overview?.annualBudget;
  const baselineConfig = [
    { type: "Drought", allocation: 0.4, amount: 30242798 },
    { type: "Heavy Rain / Floods", allocation: 0.3, amount: 22682098 },
    { type: "Strong winds", allocation: 0.2, amount: 15121399 },
    { type: "Emergency Reserve", allocation: 0.1, amount: 7560699 },
  ];

  const fundTotalsByType = funds.reduce((acc, fund) => {
    const key = fund.disasterType || "unknown";
    if (!acc[key]) {
      acc[key] = { deducted: 0, count: 0 };
    }
    acc[key].deducted += fund.adjustedBudget || 0;
    acc[key].count += 1;
    return acc;
  }, {});

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Expenditure & Budgets</h1>
          <p className="dashboard-subtitle">
            Baseline disaster budget configuration and expenditure governance
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-info">
            <p className="stat-label">Annual Budget</p>
            <h3 className="stat-value">{formatMoney(annualBudget?.totalAllocated || 0)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-info">
            <p className="stat-label">Committed</p>
            <h3 className="stat-value">{formatMoney(overview?.totals?.committed || 0)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-info">
            <p className="stat-label">Remaining</p>
            <h3 className="stat-value">{formatMoney(overview?.totals?.remaining || 0)}</h3>
          </div>
        </div>
      </div>

      <div className="table-card">
        <h2 className="section-title">Baseline Disaster Budget Configuration</h2>
        <p className="dashboard-subtitle">
          Create and lock baseline allocations for each disaster pool by fiscal year.
        </p>
        <div className="secondary-stats">
          <div className="mini-stat">Approval required for changes</div>
          <div className="mini-stat">Locked after approval</div>
          <div className="mini-stat">Version control per fiscal year</div>
        </div>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Allocation %</th>
              <th>Baseline Amount (M)</th>
            </tr>
          </thead>
          <tbody>
            {baselineConfig.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>{Math.round(row.allocation * 100)}%</td>
                <td>{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="forecast-insights">
          <div className="forecast-insights-header">
            <h2>Baseline Controls</h2>
            <span className="forecast-period">Governance</span>
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

      <div className="table-card">
        <h2 className="section-title">Budget Pool Monitoring</h2>
        <p className="dashboard-subtitle">
          Automatic deductions from incident allocations and pool balances.
        </p>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Allocated</th>
              <th>Total Deducted</th>
              <th>Remaining</th>
              <th>Incident Count</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((env) => (
              <tr key={env._id}>
                <td>{formatType(env.disasterType)}</td>
                <td>{formatMoney(env.totalAllocated)}</td>
                <td>{formatMoney(fundTotalsByType[env.disasterType]?.deducted || 0)}</td>
                <td>{formatMoney(env.remaining)}</td>
                <td>{fundTotalsByType[env.disasterType]?.count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Controlled Budget Adjustment Mechanism</h2>
          <span className="forecast-period">Approval Workflow</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Reallocation Request</span>
            <span className="value">Required when a pool is depleted</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Multi-level Approval</span>
            <span className="value">Dual authorization enforced</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Audit Trail</span>
            <span className="value">System logs all transfers</span>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>System Integrity Controls</h2>
          <span className="forecast-period">Controls</span>
        </div>
        <ul className="fund-list">
          <li>No direct editing of spent amounts.</li>
          <li>No deletion of financial records.</li>
          <li>All changes are timestamped.</li>
          <li>Dual authorization required for budget changes.</li>
          <li>Digital approval logs maintained.</li>
        </ul>
      </div>

      <div className="table-card">
        <h2 className="section-title">Incident Expenditures</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Incident</th>
              <th>District</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {expenditures.map((item) => (
              <tr key={item._id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{formatType(item.incidentFundId?.disasterType)}</td>
                <td>{item.incidentFundId?.disasterId?.district || "-"}</td>
                <td>{item.category}</td>
                <td>{item.description}</td>
                <td>{formatMoney(item.amount)}</td>
                <td>{item.recordedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
