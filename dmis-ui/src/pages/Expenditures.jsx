import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { TrendingDown, DollarSign } from "lucide-react";
import "./FundManagement.css";

export default function Expenditures({ embedded = false }) {
  const [summary, setSummary] = useState(null);
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      setError("");
      try {
        const [summaryRes, listRes] = await Promise.all([
          API.get("/finance/summary"),
          API.get("/finance/expenditures?limit=200"),
        ]);
        setSummary(summaryRes.data);
        setExpenditures(listRes.data?.expenditures || []);
      } catch (err) {
        setError("Failed to load expenditures");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const formatMoney = (value) =>
    (Number.isFinite(value) ? value : 0).toLocaleString();

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading expenditures...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Expenditures</h1>
            <p className="dashboard-subtitle">Recorded spending and transaction volume</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Spent</p>
            <h3 className="stat-value">M {formatMoney(summary?.totalSpent)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">
            <TrendingDown size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Transactions</p>
            <h3 className="stat-value">{summary?.expenditureTransactions || 0}</h3>
          </div>
        </div>
      </div>

      <div className="funds-table-container">
        <table className="funds-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Incident Type</th>
              <th>District</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {expenditures.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No expenditure records available.
                </td>
              </tr>
            ) : (
              expenditures.map((item) => {
                const incident = item.incident || {};
                const incidentType = incident.disasterType || incident.type || "N/A";
                const district = incident.district || "N/A";
                return (
                  <tr key={item._id}>
                    <td>{item.date ? new Date(item.date).toLocaleDateString() : "N/A"}</td>
                    <td>{incidentType.replace(/_/g, " ")}</td>
                    <td>{district}</td>
                    <td>{item.description}</td>
                    <td className="amount expenses">M {formatMoney(item.amountSpent)}</td>
                    <td>{item.recordedBy}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
