import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { Download } from "lucide-react";
import "./FundManagement.css";

export default function FinanceReports() {
  const [summary, setSummary] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const results = await Promise.allSettled([
          API.get("/finance/summary"),
          API.get("/finance/risk"),
        ]);
        if (results[0].status === "fulfilled") setSummary(results[0].value.data);
        if (results[1].status === "fulfilled") setRisk(results[1].value.data);
      } catch (err) {
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const downloadReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      risk,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-report-${Date.now()}.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading finance reports...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Finance Reports</h1>
          <p className="dashboard-subtitle">Generate exportable IFMIS summaries</p>
        </div>
        <button className="btn-export" onClick={downloadReport}>
          <Download size={18} />
          Export Report
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Report Snapshot</h2>
          <span className="forecast-period">JSON export</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Pending Requests</span>
            <span className="value">{summary?.pendingRequests || 0}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Requested</span>
            <span className="value">M {(summary?.totalRequested || 0).toLocaleString()}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Total Approved</span>
            <span className="value">M {(summary?.totalApproved || 0).toLocaleString()}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Financial Risk</span>
            <span className="value">{risk?.financialRisk || "Low"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
