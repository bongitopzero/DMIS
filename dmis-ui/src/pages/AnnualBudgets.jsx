import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

export default function AnnualBudgets({ embedded = false }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBudgets = async () => {
      setError("");
      try {
        const res = await API.get("/finance/annual-budgets");
        setBudgets(res.data?.budgets || []);
      } catch (err) {
        setError("Failed to load annual budgets");
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading annual budgets...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Annual Budget</h1>
            <p className="dashboard-subtitle">National allocations and reserve envelopes.</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="funds-table-container">
        <table className="funds-table">
          <thead>
            <tr>
              <th>Fiscal Year</th>
              <th>Total Allocated</th>
              <th>Reserved Forecast</th>
              <th>Committed</th>
              <th>Spent</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  No annual budgets available.
                </td>
              </tr>
            ) : (
              budgets.map((budget) => (
                <tr key={budget._id}>
                  <td>{budget.fiscalYear}</td>
                  <td>M {budget.totalAllocated.toLocaleString()}</td>
                  <td>M {budget.reservedForForecast.toLocaleString()}</td>
                  <td>M {budget.committed.toLocaleString()}</td>
                  <td>M {budget.spent.toLocaleString()}</td>
                  <td>M {budget.remaining.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
