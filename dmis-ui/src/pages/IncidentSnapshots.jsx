import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

export default function IncidentSnapshots({ embedded = false }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSnapshots = async () => {
      setError("");
      try {
        const res = await API.get("/finance/incident-snapshots");
        setSnapshots(res.data?.snapshots || []);
      } catch (err) {
        setError("Failed to load incident snapshots");
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshots();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading incident snapshots...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Incident Financial Snapshots</h1>
            <p className="dashboard-subtitle">Automated totals generated at verification.</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="funds-table-container">
        <table className="funds-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Incident Type</th>
              <th>District</th>
              <th>Base Cost</th>
              <th>Housing Cost</th>
              <th>Operational</th>
              <th>Contingency</th>
              <th>Total Budget</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No financial snapshots available.
                </td>
              </tr>
            ) : (
              snapshots.map((snapshot) => {
                const incident = snapshot.disasterId || {};
                const incidentType = (incident.type || "N/A").replace(/_/g, " ");
                return (
                  <tr key={snapshot._id}>
                    <td>{snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleDateString() : "N/A"}</td>
                    <td>{incidentType}</td>
                    <td>{incident.district || "N/A"}</td>
                    <td>M {snapshot.baseCost.toLocaleString()}</td>
                    <td>M {snapshot.housingCost.toLocaleString()}</td>
                    <td>M {snapshot.operationalCost.toLocaleString()}</td>
                    <td>M {snapshot.contingencyCost.toLocaleString()}</td>
                    <td>M {snapshot.totalBudget.toLocaleString()}</td>
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
