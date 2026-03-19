import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinancialBudgetExpendituresV2() {
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [selectedExpenditureId, setSelectedExpenditureId] = useState("");

  useEffect(() => {
    const fetchExpenditures = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/expenditures");
        setExpenditures(res.data?.expenditures || []);
      } catch (err) {
        setError("Failed to load expenditures");
      } finally {
        setLoading(false);
      }
    };
    fetchExpenditures();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading expenditures...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Incident Expenditures</h1>
          <p className="dashboard-subtitle">
            High-level expenditure tracking for incident-funded allocations
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <h2 className="section-title">Approval Actions</h2>
        <div className="finance-filters">
          <div className="filter-group">
            <label>Select expenditure</label>
            <select
              value={selectedExpenditureId}
              onChange={(event) => setSelectedExpenditureId(event.target.value)}
            >
              <option value="">Choose</option>
              {expenditures.map((item) => (
                <option key={item._id} value={item._id}>
                  {formatType(item.incidentFundId?.disasterType)} — {formatMoney(item.amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Receipt URL</label>
            <input
              type="text"
              value={receiptUrl}
              onChange={(event) => setReceiptUrl(event.target.value)}
            />
          </div>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="btn-export"
            onClick={async () => {
              if (!selectedExpenditureId) return;
              await API.put(`/finance-v2/incident-expenditures/${selectedExpenditureId}/approve`, {
                receiptUrl,
              });
              setReceiptUrl("");
              setSelectedExpenditureId("");
              const res = await API.get("/finance-v2/expenditures");
              setExpenditures(res.data?.expenditures || []);
            }}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn-export"
            onClick={async () => {
              if (!selectedExpenditureId) return;
              await API.put(`/finance-v2/incident-expenditures/${selectedExpenditureId}/reject`);
              setSelectedExpenditureId("");
              const res = await API.get("/finance-v2/expenditures");
              setExpenditures(res.data?.expenditures || []);
            }}
          >
            Reject
          </button>
        </div>
      </div>

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
              <th>Status</th>
              <th>Receipt</th>
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
                <td>{item.approvalStatus || "Pending"}</td>
                <td>{item.receiptUrl ? "Attached" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
