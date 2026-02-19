import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import "./FundManagement.css";

export default function FundRequests() {
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
        setError("Failed to load request summary");
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
        <p>Loading fund requests...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Fund Requests</h1>
          <p className="dashboard-subtitle">
            Coordinator submissions and approvals overview
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Request Summary</h2>
          <span className="forecast-period">Current pipeline</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Pending Requests</span>
            <span className="value">{summary?.pendingRequests || 0}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Requested</span>
            <span className="value">M {formatMoney(summary?.totalRequested)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Approved</span>
            <span className="value">M {formatMoney(summary?.totalApproved)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Approval Ratio</span>
            <span className="value">
              {summary?.totalRequested
                ? `${((summary.totalApproved / summary.totalRequested) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        </div>
      </div>

      <div className="secondary-stats">
        <div className="mini-stat">
          <Clock size={16} color="var(--color-warning-500)" />
          <span>Pending review</span>
        </div>
        <div className="mini-stat">
          <CheckCircle size={16} color="var(--color-success-500)" />
          <span>Approved pipeline</span>
        </div>
        <div className="mini-stat">
          <AlertCircle size={16} color="var(--color-danger-500)" />
          <span>Rejected requests</span>
        </div>
      </div>

    </div>
  );
}
