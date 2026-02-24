import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

export default function CostProfiles({ embedded = false }) {
  const [profiles, setProfiles] = useState([]);
  const [housing, setHousing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfiles = async () => {
      setError("");
      try {
        const [disasterRes, housingRes] = await Promise.all([
          API.get("/finance/profiles/disaster"),
          API.get("/finance/profiles/housing"),
        ]);
        setProfiles(disasterRes.data?.profiles || []);
        setHousing(housingRes.data?.profile || null);
      } catch (err) {
        setError("Failed to load cost profiles");
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading cost profiles...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Cost Profiles</h1>
            <p className="dashboard-subtitle">Unit cost baselines used for automated budgeting.</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="funds-table-container">
        <table className="funds-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Cost / Household</th>
              <th>Cost / Person</th>
              <th>Cost / Livestock</th>
              <th>Cost / Farming HH</th>
              <th>Operational Rate</th>
              <th>Contingency Rate</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No cost profiles available.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => (
                <tr key={profile._id}>
                  <td>{profile.disasterType.replace(/_/g, " ")}</td>
                  <td>M {profile.costPerHousehold.toLocaleString()}</td>
                  <td>M {profile.costPerPerson.toLocaleString()}</td>
                  <td>M {profile.costPerLivestockUnit.toLocaleString()}</td>
                  <td>M {profile.costPerFarmingHousehold.toLocaleString()}</td>
                  <td>{(profile.operationalRate * 100).toFixed(1)}%</td>
                  <td>{(profile.contingencyRate * 100).toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="trend-panel">
        <div className="trend-panel-header">
          <div>
            <h2>Housing Cost Profile</h2>
            <p>Baseline costs per housing tier and damage multipliers.</p>
          </div>
        </div>
        {housing ? (
          <div className="trend-compare">
            <div className="trend-card">
              <span className="trend-title">Tier A</span>
              <span className="trend-metric">M {housing.tierA.toLocaleString()}</span>
            </div>
            <div className="trend-card">
              <span className="trend-title">Tier B</span>
              <span className="trend-metric">M {housing.tierB.toLocaleString()}</span>
            </div>
            <div className="trend-card">
              <span className="trend-title">Tier C</span>
              <span className="trend-metric">M {housing.tierC.toLocaleString()}</span>
            </div>
            <div className="trend-card">
              <span className="trend-title">Damage Multipliers</span>
              <span className="trend-metric">Partial {housing.damageMultipliers.partial}</span>
              <span className="trend-metric">Severe {housing.damageMultipliers.severe}</span>
              <span className="trend-metric">Destroyed {housing.damageMultipliers.destroyed}</span>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">No housing profile configured.</div>
        )}
      </div>
    </div>
  );
}
