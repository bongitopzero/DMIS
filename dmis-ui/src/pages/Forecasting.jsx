import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  TrendingUp,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import "./Forecasting.css";

export default function Forecasting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forecastData, setForecastData] = useState(null);
  const [activeTab, setActiveTab] = useState("occurrence");

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/forecasting");
      setForecastData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load forecast data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="forecasting-container">
        <div className="loading-state">Loading forecasting data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecasting-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (!forecastData) return null;

  const tabs = [
    { id: "occurrence", label: "Occurrence Forecast", icon: <TrendingUp size={18} /> },
    { id: "seasonal", label: "Seasonal Risk", icon: <Calendar size={18} /> },
    { id: "district", label: "District Ranking", icon: <MapPin size={18} /> },
    { id: "impact", label: "Impact Forecast", icon: <Users size={18} /> },
    { id: "budget", label: "Budget Forecast", icon: <DollarSign size={18} /> },
  ];

  return (
    <div className="forecasting-container">
      {/* Header */}
      <div className="forecasting-header">
        <div>
          <h1 className="forecasting-title">Disaster Forecasting</h1>
          <p className="forecasting-subtitle">
            AI-Powered Predictive Analytics for Disaster Risk Management
          </p>
        </div>
        <div className="forecast-meta">
          <span className="data-count">
            Based on {forecastData.totalDisasters} historical disasters
          </span>
          <span className="last-updated">
            Updated: {new Date(forecastData.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="forecast-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "occurrence" && <OccurrenceForecast data={forecastData.occurrenceForecast} />}
        {activeTab === "seasonal" && <SeasonalForecast data={forecastData.seasonalForecast} />}
        {activeTab === "district" && <DistrictRanking data={forecastData.districtRanking} />}
        {activeTab === "impact" && <ImpactForecast data={forecastData.impactForecast} />}
        {activeTab === "budget" && <BudgetForecast data={forecastData.budgetForecast} />}
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

// 1. Occurrence Forecast Component
function OccurrenceForecast({ data }) {
  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <TrendingUp className="section-icon" />
          <h2>Disaster Occurrence Forecast</h2>
        </div>
        <span className="section-badge">Predictive Model</span>
      </div>
      <p className="section-description">
        Predicts frequency of disasters based on historical patterns
      </p>

      <div className="forecast-grid">
        <div className="forecast-card highlight-card">
          <h3>Annual Projection</h3>
          <div className="big-number">{data.projectedAnnual}</div>
          <p className="card-subtitle">Expected disasters per year</p>
        </div>

        <div className="forecast-card">
          <h3>By Disaster Type</h3>
          <div className="type-list">
            {data.byType.map((type) => (
              <div key={type.type} className="type-row">
                <span className="type-name">{formatDisasterType(type.type)}</span>
                <div className="type-stats">
                  <span className="stat-value">{type.annualForecast}/year</span>
                  <span className="stat-label">
                    ({type.monthlyAverage}/month avg)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="forecast-card">
          <h3>Top Risk Districts</h3>
          <div className="district-list">
            {data.byDistrict.slice(0, 5).map((district) => (
              <div key={district.district} className="district-row">
                <MapPin className="district-icon" size={14} />
                <span className="district-name">{district.district}</span>
                <span className={`risk-badge ${district.riskLevel.toLowerCase()}`}>
                  {district.riskLevel}
                </span>
                <span className="district-forecast">{district.annualForecast}/yr</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// 2. Seasonal Forecast Component
function SeasonalForecast({ data }) {
  const maxIncidents = Math.max(...data.monthlyTrends.map((m) => m.totalIncidents));

  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <Calendar className="section-icon" />
          <h2>Seasonal Risk Forecast</h2>
        </div>
        <span className="section-badge peak-badge">Peak: {data.peakMonth}</span>
      </div>
      <p className="section-description">
        Identifies high-risk months based on historical patterns
      </p>

      <div className="seasonal-chart">
        {data.monthlyTrends.map((month) => {
          const barHeight = (month.totalIncidents / maxIncidents) * 100;

          return (
            <div key={month.month} className="month-column">
              <div
                className={`month-bar ${month.riskLevel.toLowerCase()}-risk`}
                style={{ height: `${barHeight}%` }}
                title={`${month.totalIncidents} incidents`}
              >
                <span className="bar-value">{month.totalIncidents}</span>
              </div>
              <span className="month-label">{month.month.slice(0, 3)}</span>
              <span className={`month-risk-badge ${month.riskLevel.toLowerCase()}`}>
                {month.riskLevel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="seasonal-legend">
        <div className="legend-item">
          <div className="legend-color high-risk"></div>
          <span>High Risk (30+ incidents)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color medium-risk"></div>
          <span>Medium Risk (15-30 incidents)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color low-risk"></div>
          <span>Low Risk (&lt;15 incidents)</span>
        </div>
      </div>

      {data.highRiskMonths.length > 0 && (
        <div className="high-risk-alert">
          <AlertTriangle size={20} />
          <div>
            <strong>High Risk Period:</strong> {data.highRiskMonths.join(", ")}
          </div>
        </div>
      )}
    </section>
  );
}

// 3. District Ranking Component
function DistrictRanking({ data }) {
  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <MapPin className="section-icon" />
          <h2>District Risk Ranking</h2>
        </div>
        <span className="section-badge">
          {data.highRiskDistricts.length} High Risk
        </span>
      </div>
      <p className="section-description">
        Districts ranked by frequency, severity, and impact
      </p>

      <div className="ranking-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>District</th>
              <th>Total Incidents</th>
              <th>High Severity</th>
              <th>Dominant Disaster</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {data.rankings.map((district, idx) => (
              <tr key={district.district}>
                <td className="rank-cell">{idx + 1}</td>
                <td className="district-cell">
                  <MapPin size={14} />
                  {district.district}
                </td>
                <td>{district.totalIncidents}</td>
                <td className="severity-cell">
                  <span className="severity-badge high">{district.highSeverity}</span>
                </td>
                <td>{formatDisasterType(district.dominantDisaster)}</td>
                <td>
                  <span className={`risk-level-badge ${district.riskLevel.toLowerCase()}`}>
                    {district.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// 4. Impact Forecast Component
function ImpactForecast({ data }) {
  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <Users className="section-icon" />
          <h2>Impact Forecast</h2>
        </div>
        <span className="section-badge">12-Month Projection</span>
      </div>
      <p className="section-description">
        Estimated future impact on households and population
      </p>

      <div className="impact-grid">
        <div className="impact-card">
          <div className="impact-header">
            <h3>Historical Impact</h3>
            <span className="impact-period">Past Years</span>
          </div>
          <div className="impact-stats">
            <div className="impact-stat">
              <BarChart3 className="stat-icon" />
              <div>
                <div className="stat-value">{data.historical.totalDisasters}</div>
                <div className="stat-label">Total Disasters</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {data.historical.estimatedHouseholdsAffected.toLocaleString()}
                </div>
                <div className="stat-label">Households Affected</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {data.historical.estimatedPopulation.toLocaleString()}
                </div>
                <div className="stat-label">Population Affected</div>
              </div>
            </div>
          </div>
        </div>

        <div className="impact-card highlight-impact">
          <div className="impact-header">
            <h3>12-Month Projection</h3>
            <span className="impact-period">Expected</span>
          </div>
          <div className="impact-stats">
            <div className="impact-stat">
              <ArrowUp className="stat-icon trend-icon" />
              <div>
                <div className="stat-value">
                  {data.projected12Months.expectedDisasters}
                </div>
                <div className="stat-label">Expected Disasters</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {data.projected12Months.expectedHouseholds.toLocaleString()}
                </div>
                <div className="stat-label">Expected Households</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {data.projected12Months.expectedPopulation.toLocaleString()}
                </div>
                <div className="stat-label">Expected Population</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="impact-by-type">
        <h3>Impact Breakdown by Disaster Type</h3>
        <div className="type-impact-grid">
          {data.byType.map((type) => (
            <div key={type.type} className="type-impact-card">
              <h4>{formatDisasterType(type.type)}</h4>
              <div className="type-impact-stats">
                <div>
                  <span className="label">Annual Forecast:</span>
                  <span className="value">{type.projectedAnnual} events</span>
                </div>
                <div>
                  <span className="label">Avg. Households:</span>
                  <span className="value">{type.avgHouseholdsPerIncident}</span>
                </div>
                <div>
                  <span className="label">High Severity:</span>
                  <span className="value">{type.highSeverity} incidents</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 5. Budget Forecast Component
function BudgetForecast({ data }) {
  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <DollarSign className="section-icon" />
          <h2>Budget Forecast</h2>
        </div>
        <span className="section-badge financial-badge">
          M {(data.totalAnnualBudget / 1000000).toFixed(1)}M Annual
        </span>
      </div>
      <p className="section-description">
        Projected financial requirements based on historical costs
      </p>

      <div className="budget-summary">
        <div className="budget-card">
          <h3>Annual Budget</h3>
          <div className="budget-amount">
            M {(data.totalAnnualBudget / 1000000).toFixed(2)}M
          </div>
          <p>Total projected yearly requirement</p>
        </div>
        <div className="budget-card">
          <h3>Quarterly Budget</h3>
          <div className="budget-amount">
            M {(data.quarterlyBudget / 1000000).toFixed(2)}M
          </div>
          <p>Per quarter allocation</p>
        </div>
        <div className="budget-card">
          <h3>Monthly Reserve</h3>
          <div className="budget-amount">
            M {(data.monthlyReserve / 1000000).toFixed(2)}M
          </div>
          <p>Recommended monthly reserve</p>
        </div>
        <div className="budget-card emergency">
          <h3>Emergency Reserve</h3>
          <div className="budget-amount">
            M {(data.emergencyReserve / 1000000).toFixed(2)}M
          </div>
          <p>20% buffer for emergencies</p>
        </div>
      </div>

      <div className="budget-breakdown">
        <h3>Budget Breakdown by Disaster Type</h3>
        <table className="budget-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Projected Incidents</th>
              <th>Avg. Cost/Incident</th>
              <th>Annual Budget</th>
              <th>Quarterly Budget</th>
            </tr>
          </thead>
          <tbody>
            {data.annualForecast.map((item) => (
              <tr key={item.type}>
                <td className="type-cell">{formatDisasterType(item.type)}</td>
                <td>{item.projectedAnnualIncidents}</td>
                <td>M {(item.avgCostPerIncident / 1000).toLocaleString()}k</td>
                <td className="budget-cell">
                  M {(item.projectedAnnualBudget / 1000000).toFixed(2)}M
                </td>
                <td>M {(item.quarterlyBudget / 1000000).toFixed(2)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Helper function to format disaster type names
function formatDisasterType(type) {
  const typeMap = {
    drought: "Drought",
    heavy_rainfall: "Heavy Rainfall",
    strong_winds: "Strong Winds",
  };
  return typeMap[type] || type;
}
