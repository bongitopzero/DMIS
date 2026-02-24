import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinanceSnapshotsV2() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("current");

  useEffect(() => {
    const fetchSnapshots = async () => {
      setError("");
      try {
        const query = yearFilter === "all" ? "?year=all" : "";
        const res = await API.get(`/finance-v2/snapshots${query}`);
        setSnapshots(res.data?.snapshots || []);
      } catch (err) {
        setError("Failed to load incident snapshots");
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshots();
  }, [yearFilter]);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading snapshots...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Incident Snapshots</h1>
          <p className="dashboard-subtitle">Immutable impact and cost records</p>
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
        <table className="fund-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Incident</th>
              <th>District</th>
              <th>Base Cost</th>
              <th>Housing Cost</th>
              <th>Operational</th>
              <th>Contingency</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((item) => (
              <tr key={item._id}>
                <td>{new Date(item.generatedAt || item.createdAt).toLocaleDateString()}</td>
                <td>{formatType(item.disasterId?.type)}</td>
                <td>{item.disasterId?.district || "-"}</td>
                <td>{formatMoney(item.baseCost)}</td>
                <td>{formatMoney(item.housingCost)}</td>
                <td>{formatMoney(item.operationalCost)}</td>
                <td>{formatMoney(item.contingencyCost)}</td>
                <td>{formatMoney(item.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
