import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { TrendingDown, DollarSign } from "lucide-react";
import "./FundManagement.css";

export default function Expenditures({ embedded = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      setError("");
      try {
        const res = await API.get("/finance/summary");
        setSummary(res.data);
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

      <div className="alert alert-warning">
        Detailed expenditure records are not exposed yet. Use the summary until list endpoints are added.
      </div>
    </div>
  );
}
