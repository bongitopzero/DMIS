import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinancialBudgetAdjustmentsV2() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fromType: "drought",
    toType: "heavy_rainfall",
    amount: 0,
    reason: "",
  });

  const fetchRequests = async () => {
    setError("");
    try {
      const res = await API.get("/finance-v2/adjustments");
      setRequests(res.data?.requests || []);
    } catch (err) {
      setError("Failed to load adjustment requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async () => {
    setError("");
    try {
      await API.post("/finance-v2/adjustments", {
        fromType: form.fromType,
        toType: form.toType,
        amount: Number(form.amount),
        reason: form.reason,
      });
      setForm({ ...form, amount: 0, reason: "" });
      await fetchRequests();
    } catch (err) {
      setError("Failed to submit adjustment request");
    }
  };

  const handleApprove = async (id) => {
    setError("");
    try {
      await API.put(`/finance-v2/adjustments/${id}/approve`);
      await fetchRequests();
    } catch (err) {
      setError("Failed to approve request");
    }
  };

  const handleReject = async (id) => {
    setError("");
    try {
      await API.put(`/finance-v2/adjustments/${id}/reject`);
      await fetchRequests();
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading adjustment requests...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Controlled Budget Adjustment Mechanism</h1>
          <p className="dashboard-subtitle">
            Reallocation requests, approvals, and audit trails for depleted pools.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <h2 className="section-title">New Adjustment Request</h2>
        <div className="finance-filters">
          <div className="filter-group">
            <label>From Disaster Pool</label>
            <select
              value={form.fromType}
              onChange={(event) => setForm({ ...form, fromType: event.target.value })}
            >
              <option value="drought">Drought</option>
              <option value="heavy_rainfall">Heavy Rain</option>
              <option value="strong_winds">Strong Winds</option>
            </select>
          </div>
          <div className="filter-group">
            <label>To Disaster Pool</label>
            <select
              value={form.toType}
              onChange={(event) => setForm({ ...form, toType: event.target.value })}
            >
              <option value="drought">Drought</option>
              <option value="heavy_rainfall">Heavy Rain</option>
              <option value="strong_winds">Strong Winds</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Reason</label>
            <input
              type="text"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </div>
        </div>
        <button type="button" className="btn-export" onClick={handleSubmit}>
          Submit Request
        </button>
      </div>

      <div className="table-card">
        <h2 className="section-title">Adjustment Requests</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id}>
                <td>{request.fromType}</td>
                <td>{request.toType}</td>
                <td>{formatMoney(request.amount)}</td>
                <td>{request.status}</td>
                <td>{request.requestedBy}</td>
                <td className="action-row">
                  <button type="button" className="btn-export" onClick={() => handleApprove(request._id)}>
                    Approve
                  </button>
                  <button type="button" className="btn-export" onClick={() => handleReject(request._id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>System Integrity Controls</h2>
          <span className="forecast-period">Controls</span>
        </div>
        <ul className="fund-list">
          <li>No direct editing of spent amounts.</li>
          <li>No deletion of financial records.</li>
          <li>All changes are timestamped.</li>
          <li>Dual authorization required for budget changes.</li>
          <li>Digital approval logs maintained.</li>
        </ul>
      </div>
    </div>
  );
}
