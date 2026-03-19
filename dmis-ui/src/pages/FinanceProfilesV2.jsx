import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinanceProfilesV2() {
  const [profiles, setProfiles] = useState([]);
  const [housing, setHousing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfiles = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/cost-profiles");
        setProfiles(res.data?.disasterProfiles || []);
        setHousing(res.data?.housingProfile || null);
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
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Cost Profiles</h1>
          <p className="dashboard-subtitle">
            Disaster-specific base costs and housing reconstruction tiers
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Household</th>
              <th>Person</th>
              <th>Livestock</th>
              <th>Farming</th>
              <th>Operational</th>
              <th>Contingency</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile._id}>
                <td>{formatType(profile.disasterType)}</td>
                <td>{formatMoney(profile.costPerHousehold)}</td>
                <td>{formatMoney(profile.costPerPerson)}</td>
                <td>{formatMoney(profile.costPerLivestockUnit)}</td>
                <td>{formatMoney(profile.costPerFarmingHousehold)}</td>
                <td>{Math.round((profile.operationalRate || 0) * 100)}%</td>
                <td>{Math.round((profile.contingencyRate || 0) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {housing && (
        <div className="forecast-insights">
          <div className="forecast-insights-header">
            <h2>Housing Reconstruction Tiers</h2>
            <span className="forecast-period">Housing Profile</span>
          </div>
          <div className="forecast-insights-grid">
            <div className="forecast-insight-card">
              <span className="label">Tier A</span>
              <span className="value">{formatMoney(housing.tierA)}</span>
            </div>
            <div className="forecast-insight-card">
              <span className="label">Tier B</span>
              <span className="value">{formatMoney(housing.tierB)}</span>
            </div>
            <div className="forecast-insight-card">
              <span className="label">Tier C</span>
              <span className="value">{formatMoney(housing.tierC)}</span>
            </div>
            <div className="forecast-insight-card">
              <span className="label">Damage Multipliers</span>
              <span className="value">
                Partial {housing.damageMultipliers?.partial || 0} | Severe {housing.damageMultipliers?.severe || 0} | Destroyed {housing.damageMultipliers?.destroyed || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
