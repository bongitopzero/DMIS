import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinanceIncidentFundDetailV2() {
  const { id } = useParams();
  const [fund, setFund] = useState(null);
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "Direct Relief",
    description: "",
    receiptUrl: "",
    overrideApproved: false,
  });

  useEffect(() => {
    const fetchDetail = async () => {
      setError("");
      try {
        const res = await API.get(`/finance-v2/incident-funds/${id}`);
        setFund(res.data?.fund || null);
        setExpenditures(res.data?.expenditures || []);
      } catch (err) {
        setError("Failed to load incident fund details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleExpenseChange = (event) => {
    const { name, value, type, checked } = event.target;
    setNewExpense((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmitExpense = async (event) => {
    event.preventDefault();
    setSubmitError("");
    const amountValue = Number(newExpense.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setSubmitError("Enter a valid amount.");
      return;
    }
    if (!newExpense.description.trim()) {
      setSubmitError("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: amountValue,
        category: newExpense.category,
        description: newExpense.description.trim(),
        receiptUrl: newExpense.receiptUrl.trim() || undefined,
        overrideApproved: newExpense.overrideApproved,
      };
      await API.post(`/finance-v2/incident-funds/${id}/expenditures`, payload);
      const res = await API.get(`/finance-v2/incident-funds/${id}`);
      setFund(res.data?.fund || null);
      setExpenditures(res.data?.expenditures || []);
      setNewExpense({
        amount: "",
        category: "Direct Relief",
        description: "",
        receiptUrl: "",
        overrideApproved: false,
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to record expenditure.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading fund details...</p>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="finance-dashboard">
        <div className="alert alert-error">Incident fund not found.</div>
        <Link to="/finance-v2/incident-funds">Back to funds</Link>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Incident Fund Detail</h1>
          <p className="dashboard-subtitle">
            {formatType(fund.disasterType)} — {fund.disasterId?.district || "-"}
          </p>
        </div>
        <Link className="btn-export" to="/finance-v2/incident-funds">
          Back to funds
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-info">
            <p className="stat-label">Base Budget</p>
            <h3 className="stat-value">{formatMoney(fund.baseBudget)}</h3>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-info">
            <p className="stat-label">Adjusted Budget</p>
            <h3 className="stat-value">{formatMoney(fund.adjustedBudget)}</h3>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-info">
            <p className="stat-label">Committed</p>
            <h3 className="stat-value">{formatMoney(fund.committed)}</h3>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-info">
            <p className="stat-label">Remaining</p>
            <h3 className="stat-value">{formatMoney(fund.remaining)}</h3>
          </div>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Adjustments</h2>
          <span className="forecast-period">Tier {fund.adjustments?.houseTier || "TierA"}</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Needs Cost</span>
            <span className="value">{formatMoney(fund.needsCost)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Adjustment Cost</span>
            <span className="value">{formatMoney(fund.adjustmentCost)}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Damaged Land (ha)</span>
            <span className="value">{fund.adjustments?.damagedLandHectares || 0}</span>
          </div>
        </div>
      </div>

      <div className="table-card">
        <h2 className="section-title">Record Expenditure</h2>
        {submitError && <div className="alert alert-error">{submitError}</div>}
        <form className="form-grid" onSubmit={handleSubmitExpense}>
          <div className="form-group">
            <label>Amount (Maloti)</label>
            <input
              type="number"
              name="amount"
              value={newExpense.amount}
              onChange={handleExpenseChange}
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={newExpense.category} onChange={handleExpenseChange}>
              <option value="Direct Relief">Direct Relief</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Description</label>
            <textarea
              name="description"
              value={newExpense.description}
              onChange={handleExpenseChange}
              rows="3"
              required
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Receipt URL (optional)</label>
            <input
              type="text"
              name="receiptUrl"
              value={newExpense.receiptUrl}
              onChange={handleExpenseChange}
              placeholder="https://..."
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                name="overrideApproved"
                checked={newExpense.overrideApproved}
                onChange={handleExpenseChange}
              />
              Override category cap (requires approval)
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Record Expenditure"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <h2 className="section-title">Recorded Expenditures</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Date</th>
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
