import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FinanceEnvelopesV2() {
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEnvelopes = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/envelopes");
        setEnvelopes(res.data?.envelopes || []);
      } catch (err) {
        setError("Failed to load budget envelopes");
      } finally {
        setLoading(false);
      }
    };
    fetchEnvelopes();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading budget envelopes...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Budget Envelopes</h1>
          <p className="dashboard-subtitle">
            Disaster-type allocations and remaining capacity
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Allocated</th>
              <th>Committed</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((env) => {
              const total = env.totalAllocated || 0;
              const used = (env.committed || 0) + (env.spent || 0);
              const ratio = total ? Math.min(used / total, 1) : 0;
              return (
                <tr key={env._id}>
                  <td>{formatType(env.disasterType)}</td>
                  <td>{formatMoney(env.totalAllocated)}</td>
                  <td>{formatMoney(env.committed)}</td>
                  <td>{formatMoney(env.spent)}</td>
                  <td>{formatMoney(env.remaining)}</td>
                  <td>
                    <div className="utilization-bar">
                      <div className="utilization-track">
                        <div
                          className="utilization-fill"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <div className="utilization-label">{Math.round(ratio * 100)}%</div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
