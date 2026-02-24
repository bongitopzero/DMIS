import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinanceExpendituresV2() {
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("current");

  useEffect(() => {
    const fetchExpenditures = async () => {
      setError("");
      try {
        const query = yearFilter === "all" ? "?year=all" : "";
        const res = await API.get(`/finance-v2/expenditures${query}`);
        setExpenditures(res.data?.expenditures || []);
      } catch (err) {
        setError("Failed to load incident expenditures");
      } finally {
        setLoading(false);
      }
    };
    fetchExpenditures();
  }, [yearFilter]);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading incident expenditures...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Incident Expenditures</h1>
          <p className="dashboard-subtitle">Spending records with category caps</p>
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
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Recorded By</th>
              <th>Override</th>
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
                <td>{item.overrideApproved ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
