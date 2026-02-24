import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinancialBudgetPoolsV2() {
  const [envelopes, setEnvelopes] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPools = async () => {
      setError("");
      try {
        const [envelopeRes, fundRes] = await Promise.all([
          API.get("/finance-v2/envelopes"),
          API.get("/finance-v2/incident-funds"),
        ]);
        setEnvelopes(envelopeRes.data?.envelopes || []);
        setFunds(fundRes.data?.funds || []);
      } catch (err) {
        setError("Failed to load budget pools");
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading budget pool monitoring...</p>
      </div>
    );
  }

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
          <h1 className="dashboard-title">Budget Pool Monitoring</h1>
          <p className="dashboard-subtitle">
            Track allocations, deductions, remaining balances, and incident counts.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Total Allocated</th>
              <th>Total Deducted</th>
              <th>Remaining Balance</th>
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
    </div>
  );
}
