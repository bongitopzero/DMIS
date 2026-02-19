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
  Download,
} from "lucide-react";
import "./Forecasting.css";

export default function Forecasting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forecastData, setForecastData] = useState(null);
  const [financialForecast, setFinancialForecast] = useState(null);
  const [financialError, setFinancialError] = useState("");
  const [activeTab, setActiveTab] = useState("occurrence");
  const [customForecast, setCustomForecast] = useState({
    metrics: [],
    districts: [],
    disasterTypes: [],
    timeframe: "annual",
    startMonth: "",
    endMonth: ""
  });
  const [customResults, setCustomResults] = useState(null);
  const [generatingCustom, setGeneratingCustom] = useState(false);

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    setLoading(true);
    setError("");
    setFinancialError("");
    try {
      const [forecastRes, financialRes] = await Promise.allSettled([
        API.get("/forecasting"),
        API.get("/forecast/generate"),
      ]);

      if (forecastRes.status === "fulfilled") {
        setForecastData(forecastRes.value.data);
      } else {
        setError(
          forecastRes.reason?.response?.data?.message ||
            "Failed to load forecast data"
        );
      }

      if (financialRes.status === "fulfilled") {
        setFinancialForecast(financialRes.value.data);
      } else {
        setFinancialError(
          financialRes.reason?.response?.data?.message ||
            "Financial forecast unavailable"
        );
      }
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

  const formatMoney = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return numeric.toLocaleString();
  };

  const topRiskDistrict = financialForecast?.districtForecasts
    ? [...financialForecast.districtForecasts].sort((a, b) => b.riskScore - a.riskScore)[0]
    : null;

  const tabs = [
    { id: "occurrence", label: "Occurrence Forecast", icon: <TrendingUp size={18} /> },
    { id: "seasonal", label: "Seasonal Risk", icon: <Calendar size={18} /> },
    { id: "district", label: "District Ranking", icon: <MapPin size={18} /> },
    { id: "impact", label: "Impact Forecast", icon: <Users size={18} /> },
    { id: "budget", label: "Budget Forecast", icon: <DollarSign size={18} /> },
    { id: "custom", label: "Custom Forecast", icon: <BarChart3 size={18} /> },
  ];

  const spanYears = forecastData.dataSpanYears || 10;

  return (
    <div className="forecasting-container">
      {/* Header */}
      <div className="forecasting-header">
        <div>
          <h1 className="forecasting-title">Disaster Forecasting</h1>
          <p className="forecasting-subtitle">
            AI-Powered Predictive Analytics for Disaster Risk Management
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Population baseline: 2.3M • 10-year historical dataset
          </p>
        </div>
        <div className="forecast-meta">
          <span className="data-count">
            Based on {forecastData.totalDisasters} historical disasters over {spanYears} years
          </span>
          <span className="last-updated">
            Updated: {new Date(forecastData.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="ai-summary">
        <div className="ai-summary-header">
          <div>
            <h2>AI Forecast Summary</h2>
            <p>Next-quarter outlook with trend analysis, seasonal signals, and financial stress checks.</p>
          </div>
          {financialForecast && (
            <div className="ai-badges">
              <span className={`badge-pill ${financialForecast.budgetRisk?.toLowerCase() || "low"}`}>
                Budget Risk: {financialForecast.budgetRisk}
              </span>
              <span className="badge-pill neutral">
                Confidence: {financialForecast.confidenceScore ?? 0}%
              </span>
            </div>
          )}
        </div>

        {financialError && (
          <div className="ai-summary-error">
            {financialError}
          </div>
        )}

        {financialForecast ? (
          <div className="ai-summary-grid">
            <div className="ai-summary-card">
              <span className="label">Projected Cost</span>
              <span className="value">M {formatMoney(financialForecast.totalProjectedCost)}</span>
              <span className="hint">Estimated spend for next quarter</span>
            </div>
            <div className="ai-summary-card">
              <span className="label">Remaining Budget</span>
              <span className="value">M {formatMoney(financialForecast.remainingBudget)}</span>
              <span className="hint">Available funds after commitments</span>
            </div>
            <div className={`ai-summary-card ${financialForecast.fundingGap > 0 ? "risk" : "safe"}`}>
              <span className="label">Funding Gap</span>
              <span className="value">M {formatMoney(Math.abs(financialForecast.fundingGap))}</span>
              <span className="hint">
                {financialForecast.fundingGap > 0 ? "Shortfall expected" : "Projected surplus"}
              </span>
            </div>
            <div className="ai-summary-card">
              <span className="label">Top Risk District</span>
              <span className="value">
                {topRiskDistrict ? topRiskDistrict.district : "N/A"}
              </span>
              <span className="hint">
                {topRiskDistrict ? `${topRiskDistrict.riskScore} risk score` : "No district ranking"}
              </span>
            </div>
          </div>
        ) : (
          <div className="ai-summary-empty">
            Financial forecast data is not available yet. Refresh or try again later.
          </div>
        )}
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
        {activeTab === "impact" && (
          <ImpactForecast data={forecastData.impactForecast} spanYears={spanYears} />
        )}
        {activeTab === "budget" && (
          <BudgetForecast
            data={forecastData.budgetForecast}
            financialForecast={financialForecast}
            financialError={financialError}
          />
        )}
        {activeTab === "custom" && (
          <CustomForecast 
            customForecast={customForecast}
            setCustomForecast={setCustomForecast}
            customResults={customResults}
            setCustomResults={setCustomResults}
            generatingCustom={generatingCustom}
            setGeneratingCustom={setGeneratingCustom}
            allData={forecastData}
          />
        )}
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
                <span className={`risk-badge ${(district.riskLevel || "low").toLowerCase()}`}>
                  {district.riskLevel || "Low"}
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
  const maxIncidents = Math.max(
    1,
    ...data.monthlyTrends.map((m) => m.totalIncidents)
  );

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
          {(data.highRiskDistricts || []).length} High Risk
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
            {(data.rankings || []).map((district, idx) => (
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
                  <span className={`risk-level-badge ${(district.riskLevel || "low").toLowerCase()}`}>
                    {district.riskLevel || "Low"}
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
function ImpactForecast({ data, spanYears }) {
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
            <span className="impact-period">Past {spanYears} Years</span>
          </div>
          <div className="impact-stats">
            <div className="impact-stat">
              <BarChart3 className="stat-icon" />
              <div>
                  <div className="stat-value">{data.historical?.totalDisasters ?? 0}</div>
                <div className="stat-label">Total Disasters</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {(data.historical?.estimatedHouseholdsAffected ?? 0).toLocaleString()}
                </div>
                <div className="stat-label">Households Affected</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {(data.historical?.estimatedPopulation ?? 0).toLocaleString()}
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
                    {data.projected12Months?.expectedDisasters ?? 0}
                </div>
                <div className="stat-label">Expected Disasters</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {(data.projected12Months?.expectedHouseholds ?? 0).toLocaleString()}
                </div>
                <div className="stat-label">Expected Households</div>
              </div>
            </div>
            <div className="impact-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">
                  {(data.projected12Months?.expectedPopulation ?? 0).toLocaleString()}
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
          {(data.byType || []).map((type) => (
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
function BudgetForecast({ data, financialForecast, financialError }) {
  const fundingGap = financialForecast?.fundingGap ?? 0;
  const fundingGapLabel = fundingGap > 0 ? "Funding Gap" : "Projected Surplus";
  const fundingGapValue = Math.abs(fundingGap);
  const formatMoney = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return numeric.toLocaleString();
  };

  return (
    <section className="forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <DollarSign className="section-icon" />
          <h2>Budget Forecast</h2>
        </div>
        <span className="section-badge financial-badge">
          M {((data.totalAnnualBudget || 0) / 1000000).toFixed(1)}M Annual
        </span>
      </div>
      <p className="section-description">
        Projected financial requirements based on historical costs
      </p>

      <div className="financial-forecast-panel">
        <div className="panel-header">
          <h3>Next Quarter Financial Forecast</h3>
          {financialForecast && (
            <span className="panel-period">{financialForecast.period}</span>
          )}
        </div>
        {financialForecast && (
          <div className="panel-badges">
            <span className={`badge-pill ${financialForecast.budgetRisk?.toLowerCase() || "low"}`}>
              Budget Risk: {financialForecast.budgetRisk}
            </span>
            <span className="badge-pill neutral">
              Confidence: {financialForecast.confidenceScore ?? 0}%
            </span>
          </div>
        )}
        {financialError && (
          <div className="panel-error">{financialError}</div>
        )}
        {financialForecast && (
          <>
            <div className="financial-forecast-grid">
              <div className="financial-forecast-card">
                <span className="label">Total Projected Cost</span>
                <span className="value">
                  M {formatMoney(financialForecast.totalProjectedCost)}
                </span>
              </div>
              <div className="financial-forecast-card">
                <span className="label">Remaining Budget</span>
                <span className="value">
                  M {formatMoney(financialForecast.remainingBudget)}
                </span>
              </div>
              <div
                className={`financial-forecast-card gap-card ${
                  fundingGap > 0 ? "gap" : "surplus"
                }`}
              >
                <span className="label">{fundingGapLabel}</span>
                <span className="value">M {formatMoney(fundingGapValue)}</span>
              </div>
            </div>

            <div className="forecast-breakdown">
              <h4>Projected Incidents & Costs</h4>
              <table className="forecast-breakdown-table">
                <thead>
                  <tr>
                    <th>Disaster Type</th>
                    <th>Expected Incidents</th>
                    <th>Projected Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {financialForecast.forecastBreakdown.map((item) => (
                    <tr key={item.disasterType}>
                      <td>{formatDisasterType(item.disasterType)}</td>
                      <td>{item.expectedIncidents}</td>
                      <td>M {formatMoney(item.projectedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {financialForecast.districtForecasts?.length > 0 && (
              <div className="district-forecast-panel">
                <h4>District Risk Forecast</h4>
                <p className="section-description">
                  District-level risk scores combine incident frequency, severity, and cost impact.
                </p>
                <div className="district-forecast-grid">
                  {financialForecast.districtForecasts
                    .slice()
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .slice(0, 6)
                    .map((district) => (
                      <div key={district.district} className="district-forecast-card">
                        <div className="district-forecast-header">
                          <span className="district-name">{district.district}</span>
                          <span className={`risk-pill ${district.riskLevel.toLowerCase()}`}>
                            {district.riskLevel}
                          </span>
                        </div>
                        <div className="district-metrics">
                          <span>Incidents: {district.predictedIncidents}</span>
                          <span>Cost: M {formatMoney(district.projectedCost)}</span>
                          <span>Risk Score: {district.riskScore}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
        {!financialError && !financialForecast && (
          <div className="panel-empty">No financial forecast available.</div>
        )}
      </div>

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

// 6. Custom Forecast Component
function CustomForecast({ 
  customForecast, 
  setCustomForecast, 
  customResults, 
  setCustomResults,
  generatingCustom,
  setGeneratingCustom,
  allData 
}) {
  const availableMetrics = [
    { id: "occurrence", name: "Occurrence Projection", description: "Predict frequency of disasters" },
    { id: "severity", name: "Severity Analysis", description: "Forecast severity levels" },
    { id: "impact", name: "Impact Assessment", description: "Estimate affected population" },
    { id: "budget", name: "Budget Requirements", description: "Calculate financial needs" },
    { id: "response", name: "Response Time", description: "Estimate response duration" },
    { id: "risk", name: "Risk Score", description: "Calculate risk levels by area" }
  ];

  const availableDistricts = [
    "Maseru", "Mafeteng", "Mohale's Hoek", "Quthing",
    "Berea", "Leribe", "Butha-Buthe",
    "Mokhotlong", "Qacha's Nek", "Thaba-Tseka"
  ];

  const availableTypes = [
    { id: "drought", name: "Drought" },
    { id: "heavy_rainfall", name: "Heavy Rainfall" },
    { id: "strong_winds", name: "Strong Winds" }
  ];

  const toggleMetric = (metricId) => {
    setCustomForecast(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  const toggleDistrict = (district) => {
    setCustomForecast(prev => ({
      ...prev,
      districts: prev.districts.includes(district)
        ? prev.districts.filter(d => d !== district)
        : [...prev.districts, district]
    }));
  };

  const toggleType = (typeId) => {
    setCustomForecast(prev => ({
      ...prev,
      disasterTypes: prev.disasterTypes.includes(typeId)
        ? prev.disasterTypes.filter(t => t !== typeId)
        : [...prev.disasterTypes, typeId]
    }));
  };

  const selectAllDistricts = () => {
    setCustomForecast(prev => ({
      ...prev,
      districts: availableDistricts
    }));
  };

  const clearAllDistricts = () => {
    setCustomForecast(prev => ({ ...prev, districts: [] }));
  };

  const generateCustomForecast = () => {
    if (customForecast.metrics.length === 0) {
      alert("Please select at least one metric");
      return;
    }

    setGeneratingCustom(true);
    
    // Simulate forecast generation (in real app, this would call API)
    setTimeout(() => {
      const results = {
        metrics: customForecast.metrics,
        districts: customForecast.districts.length > 0 ? customForecast.districts : availableDistricts,
        types: customForecast.disasterTypes.length > 0 ? customForecast.disasterTypes : ["drought", "heavy_rainfall", "strong_winds"],
        timeframe: customForecast.timeframe,
        data: generateMockResults(customForecast, allData)
      };
      setCustomResults(results);
      setGeneratingCustom(false);
    }, 1500);
  };

  const generateMockResults = (config, allData) => {
    const results = {};
    
    // Generate results based on selected metrics
    if (config.metrics.includes("occurrence")) {
      const baseRate = allData.occurrenceForecast.projectedAnnual;
      results.occurrence = {
        total: Math.round(baseRate * (config.timeframe === "annual" ? 1 : 0.25)),
        byType: config.disasterTypes.length > 0 
          ? config.disasterTypes.map(type => ({
              type,
              count: Math.round(Math.random() * 8 + 2)
            }))
          : allData.occurrenceForecast.byType
      };
    }

    if (config.metrics.includes("severity")) {
      results.severity = {
        high: Math.round(Math.random() * 30 + 20),
        medium: Math.round(Math.random() * 40 + 30),
        low: Math.round(Math.random() * 30 + 20)
      };
    }

    if (config.metrics.includes("impact")) {
      results.impact = {
        affectedPopulation: Math.round(Math.random() * 50000 + 20000),
        affectedHouseholds: Math.round(Math.random() * 8000 + 3000),
        estimatedDisplaced: Math.round(Math.random() * 10000 + 2000)
      };
    }

    if (config.metrics.includes("budget")) {
      const baseBudget = allData.budgetForecast.totalAnnualBudget;
      results.budget = {
        total: Math.round(baseBudget * (config.timeframe === "annual" ? 1 : 0.25)),
        emergency: Math.round(baseBudget * 0.2),
        operations: Math.round(baseBudget * 0.6),
        recovery: Math.round(baseBudget * 0.2)
      };
    }

    if (config.metrics.includes("response")) {
      results.response = {
        avgDays: Math.round(Math.random() * 5 + 3),
        fastestDistrict: config.districts[0] || "Maseru",
        slowestDistrict: config.districts[config.districts.length - 1] || "Thaba-Tseka"
      };
    }

    if (config.metrics.includes("risk")) {
      results.risk = (config.districts.length > 0 ? config.districts : availableDistricts)
        .map(district => ({
          district,
          score: Math.round(Math.random() * 40 + 60),
          level: Math.random() > 0.5 ? "High" : "Medium"
        }))
        .sort((a, b) => b.score - a.score);
    }

    return results;
  };

  const exportCustomForecast = () => {
    const dataStr = JSON.stringify(customResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `custom-forecast-${Date.now()}.json`;
    link.click();
  };

  return (
    <section className="forecast-section custom-forecast-section">
      <div className="section-header">
        <div className="section-icon-title">
          <BarChart3 className="section-icon" />
          <h2>Custom Forecast Builder</h2>
        </div>
        <span className="section-badge custom-badge">Build Your Own</span>
      </div>
      <p className="section-description">
        Create personalized forecasts by selecting metrics, regions, and disaster types
      </p>

      <div className="custom-builder">
        {/* Metrics Selection */}
        <div className="builder-section">
          <h3 className="builder-title">1. Select Metrics to Forecast</h3>
          <div className="metric-grid">
            {availableMetrics.map(metric => (
              <div 
                key={metric.id}
                className={`metric-card ${customForecast.metrics.includes(metric.id) ? 'selected' : ''}`}
                onClick={() => toggleMetric(metric.id)}
              >
                <div className="metric-checkbox">
                  {customForecast.metrics.includes(metric.id) && '✓'}
                </div>
                <div className="metric-info">
                  <h4>{metric.name}</h4>
                  <p>{metric.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Districts Selection */}
        <div className="builder-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="builder-title">2. Select Districts (Optional)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="mini-btn" onClick={selectAllDistricts}>Select All</button>
              <button className="mini-btn" onClick={clearAllDistricts}>Clear All</button>
            </div>
          </div>
          <p className="builder-hint">Leave empty to include all districts</p>
          <div className="district-chips">
            {availableDistricts.map(district => (
              <div
                key={district}
                className={`chip ${customForecast.districts.includes(district) ? 'selected' : ''}`}
                onClick={() => toggleDistrict(district)}
              >
                {district}
              </div>
            ))}
          </div>
        </div>

        {/* Disaster Types Selection */}
        <div className="builder-section">
          <h3 className="builder-title">3. Select Disaster Types (Optional)</h3>
          <p className="builder-hint">Leave empty to include all types</p>
          <div className="type-chips">
            {availableTypes.map(type => (
              <div
                key={type.id}
                className={`chip type-chip ${customForecast.disasterTypes.includes(type.id) ? 'selected' : ''}`}
                onClick={() => toggleType(type.id)}
              >
                {type.name}
              </div>
            ))}
          </div>
        </div>

        {/* Timeframe Selection */}
        <div className="builder-section">
          <h3 className="builder-title">4. Select Timeframe</h3>
          <div className="timeframe-selector">
            <button
              className={`timeframe-btn ${customForecast.timeframe === 'quarterly' ? 'active' : ''}`}
              onClick={() => setCustomForecast(prev => ({ ...prev, timeframe: 'quarterly' }))}
            >
              Quarterly
            </button>
            <button
              className={`timeframe-btn ${customForecast.timeframe === 'annual' ? 'active' : ''}`}
              onClick={() => setCustomForecast(prev => ({ ...prev, timeframe: 'annual' }))}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <div className="builder-actions">
          <button 
            className="generate-btn"
            onClick={generateCustomForecast}
            disabled={generatingCustom || customForecast.metrics.length === 0}
          >
            {generatingCustom ? 'Generating...' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {customResults && (
        <div className="custom-results">
          <div className="results-header">
            <h3>Forecast Results</h3>
            <button className="export-btn" onClick={exportCustomForecast}>
              <Download size={16} />
              Export Results
            </button>
          </div>

          <div className="results-grid">
            {customResults.data.occurrence && (
              <div className="result-card">
                <h4>Occurrence Projection</h4>
                <div className="result-big-number">{customResults.data.occurrence.total}</div>
                <p>Expected incidents ({customResults.timeframe})</p>
                {customResults.data.occurrence.byType && (
                  <div className="result-breakdown">
                    {customResults.data.occurrence.byType.map(t => (
                      <div key={t.type} className="breakdown-row">
                        <span>{formatDisasterType(t.type)}</span>
                        <span>{t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {customResults.data.severity && (
              <div className="result-card">
                <h4>Severity Distribution</h4>
                <div className="severity-bars">
                  <div className="severity-bar-item">
                    <span className="severity-label">High</span>
                    <div className="severity-bar">
                      <div className="severity-fill high" style={{ width: `${customResults.data.severity.high}%` }}></div>
                    </div>
                    <span className="severity-percent">{customResults.data.severity.high}%</span>
                  </div>
                  <div className="severity-bar-item">
                    <span className="severity-label">Medium</span>
                    <div className="severity-bar">
                      <div className="severity-fill medium" style={{ width: `${customResults.data.severity.medium}%` }}></div>
                    </div>
                    <span className="severity-percent">{customResults.data.severity.medium}%</span>
                  </div>
                  <div className="severity-bar-item">
                    <span className="severity-label">Low</span>
                    <div className="severity-bar">
                      <div className="severity-fill low" style={{ width: `${customResults.data.severity.low}%` }}></div>
                    </div>
                    <span className="severity-percent">{customResults.data.severity.low}%</span>
                  </div>
                </div>
              </div>
            )}

            {customResults.data.impact && (
              <div className="result-card">
                <h4>Impact Assessment</h4>
                <div className="impact-stats">
                  <div className="impact-stat">
                    <Users size={20} />
                    <div>
                      <div className="stat-value">{customResults.data.impact.affectedPopulation.toLocaleString()}</div>
                      <div className="stat-label">Affected Population</div>
                    </div>
                  </div>
                  <div className="impact-stat">
                    <MapPin size={20} />
                    <div>
                      <div className="stat-value">{customResults.data.impact.affectedHouseholds.toLocaleString()}</div>
                      <div className="stat-label">Affected Households</div>
                    </div>
                  </div>
                  <div className="impact-stat">
                    <AlertTriangle size={20} />
                    <div>
                      <div className="stat-value">{customResults.data.impact.estimatedDisplaced.toLocaleString()}</div>
                      <div className="stat-label">Estimated Displaced</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {customResults.data.budget && (
              <div className="result-card">
                <h4>Budget Requirements</h4>
                <div className="budget-total">M {(customResults.data.budget.total / 1000000).toFixed(2)}M</div>
                <p>Total {customResults.timeframe} budget</p>
                <div className="budget-breakdown-mini">
                  <div className="budget-item">
                    <span>Emergency</span>
                    <span>M {(customResults.data.budget.emergency / 1000000).toFixed(2)}M</span>
                  </div>
                  <div className="budget-item">
                    <span>Operations</span>
                    <span>M {(customResults.data.budget.operations / 1000000).toFixed(2)}M</span>
                  </div>
                  <div className="budget-item">
                    <span>Recovery</span>
                    <span>M {(customResults.data.budget.recovery / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
              </div>
            )}

            {customResults.data.response && (
              <div className="result-card">
                <h4>Response Time Forecast</h4>
                <div className="result-big-number">{customResults.data.response.avgDays} days</div>
                <p>Average response time</p>
                <div className="response-details">
                  <div><ArrowUp size={14} color="green" /> Fastest: {customResults.data.response.fastestDistrict}</div>
                  <div><ArrowDown size={14} color="red" /> Slowest: {customResults.data.response.slowestDistrict}</div>
                </div>
              </div>
            )}

            {customResults.data.risk && (
              <div className="result-card risk-card">
                <h4>Risk Scores by District</h4>
                <div className="risk-list">
                  {customResults.data.risk.slice(0, 5).map(item => (
                    <div key={item.district} className="risk-item">
                      <span className="risk-district">{item.district}</span>
                      <span className={`risk-badge ${item.level.toLowerCase()}`}>{item.level}</span>
                      <span className="risk-score">{item.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
