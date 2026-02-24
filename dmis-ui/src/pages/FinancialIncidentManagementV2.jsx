import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const severityFactor = (severity) => {
  if (!severity) return 1;
  if (severity === "severe") return 1.6;
  if (severity === "moderate") return 1.3;
  return 1.0;
};

export default function FinancialIncidentManagementV2() {
  const [funds, setFunds] = useState([]);
  const [needsProfiles, setNeedsProfiles] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const [fundsRes, needsRes, expenditureRes] = await Promise.all([
          API.get("/finance-v2/incident-funds"),
          API.get("/finance-v2/needs"),
          API.get("/finance-v2/expenditures"),
        ]);
        const fetchedFunds = fundsRes.data?.funds || [];
        setFunds(fetchedFunds);
        setNeedsProfiles(needsRes.data?.profiles || []);
        setExpenditures(expenditureRes.data?.expenditures || []);
        if (!selectedFundId && fetchedFunds.length) {
          setSelectedFundId(fetchedFunds[0]._id);
        }
      } catch (err) {
        setError("Failed to load incident finance data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedFundId]);

  const selectedFund = useMemo(
    () => funds.find((fund) => fund._id === selectedFundId) || funds[0],
    [funds, selectedFundId]
  );

  const selectedImpact = selectedFund?.snapshotId?.impactId;
  const selectedNeedsProfile = needsProfiles.find(
    (profile) => profile.disasterType === selectedFund?.disasterType
  );

  const incidentExpenses = expenditures.filter(
    (item) => item.incidentFundId?._id === selectedFund?._id
  );

  const baseEstimate = (selectedFund?.snapshotId?.totalBudget || 0) * 0.7;
  const severityMultiplier = severityFactor(selectedImpact?.severityLevel);
  const estimatedBudget = baseEstimate * severityMultiplier;

  const needsBreakdown = (selectedNeedsProfile?.needs || []).map((need) => {
    const households = selectedImpact?.householdsAffected || 0;
    const people = selectedImpact?.individualsAffected || 0;
    const amount = households * (need.costPerHousehold || 0) + people * (need.costPerPerson || 0);
    return {
      name: need.name,
      calculation: `${households} households × ${need.costPerHousehold || 0} + ${people} people × ${need.costPerPerson || 0}`,
      amount,
    };
  });

  const totalSpent = incidentExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const remainingBalance = Math.max((selectedFund?.adjustedBudget || 0) - totalSpent, 0);
  const averageCostPerHousehold = selectedImpact?.householdsAffected
    ? totalSpent / selectedImpact.householdsAffected
    : 0;
  const incidentCostAccuracy = selectedFund?.adjustedBudget
    ? (totalSpent / selectedFund.adjustedBudget) * 100
    : 0;

  const poolTotal = selectedFund
    ? funds
        .filter((fund) => fund.disasterType === selectedFund.disasterType)
        .reduce((sum, fund) => sum + (fund.adjustedBudget || 0), 0)
    : 0;

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading incident finance...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Incident Management</h1>
          <p className="dashboard-subtitle">
            Link incidents directly to financial allocation and expense tracking
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="finance-filters">
        <div className="filter-group">
          <label>Select incident</label>
          <select
            value={selectedFund?._id || ""}
            onChange={(event) => setSelectedFundId(event.target.value)}
          >
            {funds.map((fund) => (
              <option key={fund._id} value={fund._id}>
                {formatType(fund.disasterType)} — {fund.disasterId?.district || "Unknown"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-card">
        <h2 className="section-title">Incident Financial Profile</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Incident Details</th>
              <th>Estimated Budget</th>
              <th>Approved Budget</th>
              <th>Allocated Amount</th>
              <th>Disaster Pool Source</th>
              <th>Current Spending</th>
              <th>Remaining Balance</th>
              <th>Sub Page</th>
            </tr>
          </thead>
          <tbody>
            {selectedFund && (
              <tr>
                <td>
                  {formatType(selectedFund.disasterType)} — {selectedFund.disasterId?.district || "-"}
                  <div className="muted">Incident ID: {selectedFund.disasterId?._id || selectedFund.disasterId}</div>
                </td>
                <td>{formatMoney(estimatedBudget)}</td>
                <td>{formatMoney(selectedFund.adjustedBudget)}</td>
                <td>{formatMoney(selectedFund.baseBudget)}</td>
                <td>{formatType(selectedFund.disasterType)}</td>
                <td>{formatMoney(totalSpent)}</td>
                <td>{formatMoney(remainingBalance)}</td>
                <td>
                  <Link to={`/finance-v2/incident-funds/${selectedFund._id}`}>View Detail</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <h2 className="section-title">Needs-Based Budget Breakdown</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Calculation Basis</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {needsBreakdown.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.calculation}</td>
                <td>{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <h2 className="section-title">Incident Expense Tracker</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Receipt</th>
              <th>Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {incidentExpenses.map((item) => (
              <tr key={item._id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.category}</td>
                <td>{item.description}</td>
                <td>{formatMoney(item.amount)}</td>
                <td>{item.receiptUrl ? "Attached" : "Not attached"}</td>
                <td>{item.approvalStatus || (item.overrideApproved ? "Override Approved" : "Pending")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-grid">
        <div className="detail-card">
          <h2>Deduction Visibility Panel</h2>
          <div className="detail-row">
            <span>Original Disaster Pool Amount</span>
            <strong>{formatMoney(selectedFund?.snapshotId?.totalBudget || 0)}</strong>
          </div>
          <div className="detail-row">
            <span>Total Deducted (This Incident)</span>
            <strong>{formatMoney(selectedFund?.adjustedBudget || 0)}</strong>
          </div>
          <div className="detail-row">
            <span>Remaining Pool Balance</span>
            <strong>{formatMoney(poolTotal - (selectedFund?.adjustedBudget || 0))}</strong>
          </div>
        </div>
        <div className="detail-card">
          <h2>Approval Workflow</h2>
          <ul className="workflow-steps">
            <li>Finance Officer review</li>
            <li>Coordinator approval</li>
            <li>System logs decision</li>
            <li>Funds released</li>
            <li>No single-user authorization allowed</li>
          </ul>
        </div>
        <div className="detail-card">
          <h2>Incident Closure Financial Report</h2>
          <div className="detail-row">
            <span>Total Allocated</span>
            <strong>{formatMoney(selectedFund?.adjustedBudget || 0)}</strong>
          </div>
          <div className="detail-row">
            <span>Total Spent</span>
            <strong>{formatMoney(totalSpent)}</strong>
          </div>
          <div className="detail-row">
            <span>Surplus Returned</span>
            <strong>{formatMoney(Math.max((selectedFund?.adjustedBudget || 0) - totalSpent, 0))}</strong>
          </div>
          <div className="muted">Financial summary auto-generated on closure.</div>
        </div>
      </div>

      <div className="table-card">
        <h2 className="section-title">KPIs</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="label">Average Cost per Household</span>
            <span className="value">{formatMoney(averageCostPerHousehold)}</span>
          </div>
          <div className="kpi-card">
            <span className="label">Incident Cost Accuracy</span>
            <span className="value">{incidentCostAccuracy.toFixed(1)}%</span>
          </div>
          <div className="kpi-card">
            <span className="label">Cost per Disaster Type</span>
            <span className="value">{formatType(selectedFund?.disasterType)}</span>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Integrity Controls</h2>
          <span className="forecast-period">Controls</span>
        </div>
        <ul className="fund-list">
          <li>Automatic deduction from disaster pool.</li>
          <li>No manual editing of incident allocations.</li>
          <li>All expenses require approval.</li>
          <li>Surplus returned to disaster pool upon closure.</li>
        </ul>
      </div>
    </div>
  );
}
