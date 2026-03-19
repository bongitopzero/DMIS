import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinanceIncidentFundsV2() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("current");

  useEffect(() => {
    const fetchFunds = async () => {
      setError("");
      try {
        const query = yearFilter === "all" ? "?year=all" : "";
        const res = await API.get(`/finance-v2/incident-funds${query}`);
        setFunds(res.data?.funds || []);
      } catch (err) {
        setError("Failed to load incident funds");
      } finally {
        setLoading(false);
      }
    };
    fetchFunds();
  }, [yearFilter]);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading incident funds...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Incident Funds</h1>
          <p className="dashboard-subtitle">Budgets created when incidents are verified</p>
        </div>
        <div className="filter-group">
          <label>Year</label>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="current">Current Year</option>
            <option value="all">All Years</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <table className="fund-table separated">
          <thead>
            <tr>
              <th>Incident</th>
              <th>District</th>
              <th>Status</th>
              <th>Base</th>
              <th>Adjusted</th>
              <th>Committed</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((fund) => (
              <tr key={fund._id}>
                <td>{formatType(fund.disasterType)}</td>
                <td>{fund.disasterId?.district || "-"}</td>
                <td>{fund.disasterId?.status || "-"}</td>
                <td>{formatMoney(fund.baseBudget)}</td>
                <td>{formatMoney(fund.adjustedBudget)}</td>
                <td>{formatMoney(fund.committed)}</td>
                <td>{formatMoney(fund.spent)}</td>
                <td>{formatMoney(fund.remaining)}</td>
                <td>
                  <Link className="details-link" to={`/finance-v2/incident-funds/${fund._id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
