import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

export default function FinanceNeedsV2() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNeeds = async () => {
      setError("");
      try {
        const res = await API.get("/finance-v2/needs");
        setProfiles(res.data?.profiles || []);
      } catch (err) {
        setError("Failed to load needs profiles");
      } finally {
        setLoading(false);
      }
    };
    fetchNeeds();
  }, []);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading needs profiles...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Needs Cost Profiles</h1>
          <p className="dashboard-subtitle">
            Cost-per-unit estimates for response essentials
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="forecast-insights-grid">
        {profiles.map((profile) => (
          <div className="forecast-insight-card" key={profile._id}>
            <span className="label">{formatType(profile.disasterType)}</span>
            <span className="value">Cost per hectare: {formatMoney(profile.costPerHectare)}</span>
            <ul>
              {(profile.needs || []).map((need, idx) => (
                <li key={`${profile._id}-need-${idx}`}>
                  <strong>{need.name}</strong> — Households {formatMoney(need.costPerHousehold)} | People {formatMoney(need.costPerPerson)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
