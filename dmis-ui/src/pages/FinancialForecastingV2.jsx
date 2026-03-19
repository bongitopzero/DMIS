import React, { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import "./FundManagement.css";

const formatMoney = (value) =>
  `M ${Number.isFinite(value) ? value.toLocaleString() : "0"}`;

const formatType = (value) =>
  String(value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const severityFactor = (severity) => {
  if (severity === "severe") return 1.6;
  if (severity === "moderate") return 1.3;
  return 1.0;
};

export default function FinancialForecastingV2({ section = "all" }) {
  const [forecast, setForecast] = useState(null);
  const [overview, setOverview] = useState(null);
  const [envelopes, setEnvelopes] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [funds, setFunds] = useState([]);
  const [needsProfiles, setNeedsProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState({
    disasterType: "heavy_rainfall",
    districts: 5,
    householdsPerDistrict: 400,
    peoplePerDistrict: 1200,
    severity: "moderate",
  });

  useEffect(() => {
    const fetchForecast = async () => {
      setError("");
      try {
        const [forecastRes, overviewRes, envelopeRes, expenditureRes, fundsRes, needsRes] =
          await Promise.all([
            API.get("/finance-v2/forecast"),
            API.get("/finance-v2/overview"),
            API.get("/finance-v2/envelopes"),
            API.get("/finance-v2/expenditures"),
            API.get("/finance-v2/incident-funds"),
            API.get("/finance-v2/needs"),
          ]);
        setForecast(forecastRes.data);
        setOverview(overviewRes.data);
        setEnvelopes(envelopeRes.data?.envelopes || []);
        setExpenditures(expenditureRes.data?.expenditures || []);
        setFunds(fundsRes.data?.funds || []);
        setNeedsProfiles(needsRes.data?.profiles || []);
      } catch (err) {
        setError("Failed to load financial forecast");
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  const budgetSeries = forecast?.budgetSeries || [];
  const spendSeries = forecast?.spendSeries || [];
  const averageSpend = forecast?.averageSpend || 0;
  const maxValue = Math.max(
    ...budgetSeries.map((item) => item.value || 0),
    ...spendSeries.map((item) => item.value || 0),
    1
  );

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const spendingByType = expenditures.reduce((acc, item) => {
    const type = item.incidentFundId?.disasterType || "unknown";
    const date = new Date(item.date || item.createdAt || Date.now());
    if (date < oneYearAgo) return acc;
    acc[type] = (acc[type] || 0) + (item.amount || 0);
    return acc;
  }, {});

  const depletionForecast = envelopes.map((env) => {
    const spentLastYear = spendingByType[env.disasterType] || 0;
    const quarterlyRate = spentLastYear / 4;
    const quartersRemaining = quarterlyRate > 0 ? env.remaining / quarterlyRate : null;
    return {
      ...env,
      quarterlyRate,
      quartersRemaining,
    };
  });

  const historicalByType = funds.reduce((acc, fund) => {
    const type = fund.disasterType || "unknown";
    const households = fund.snapshotId?.impactId?.householdsAffected || 0;
    const total = fund.adjustedBudget || 0;
    if (!acc[type]) acc[type] = { total: 0, households: 0, count: 0 };
    acc[type].total += total;
    acc[type].households += households;
    acc[type].count += 1;
    return acc;
  }, {});

  const predictionBase = historicalByType[scenario.disasterType];
  const avgCostPerHousehold = predictionBase?.households
    ? predictionBase.total / predictionBase.households
    : 0;
  const avgCostPerType = predictionBase?.count ? predictionBase.total / predictionBase.count : 0;
  const basePrediction = Math.max(
    scenario.householdsPerDistrict * scenario.districts * avgCostPerHousehold,
    avgCostPerType
  );
  const severityMultiplier = severityFactor(scenario.severity);
  const predictedIncidentCost = basePrediction * severityMultiplier;

  const projectedBudget = overview?.annualBudget?.totalAllocated || 0;
  const expectedNextYearCost = averageSpend * 4;
  const shortfall = Math.max(expectedNextYearCost - projectedBudget, 0);

  const scenarioNeedsProfile = needsProfiles.find(
    (profile) => profile.disasterType === scenario.disasterType
  );
  const totalHouseholds = scenario.districts * scenario.householdsPerDistrict;
  const totalPeople = scenario.districts * scenario.peoplePerDistrict;
  const needsEstimate = (scenarioNeedsProfile?.needs || []).reduce((sum, need) => {
    const householdCost = totalHouseholds * (need.costPerHousehold || 0);
    const personCost = totalPeople * (need.costPerPerson || 0);
    return sum + householdCost + personCost;
  }, 0);
  const logisticsEstimate = Math.ceil(totalHouseholds / 100) * 1000;
  const scenarioEstimate = (needsEstimate + logisticsEstimate) * severityMultiplier;
  const scenarioEnvelope = envelopes.find((env) => env.disasterType === scenario.disasterType);
  const scenarioRemaining = (scenarioEnvelope?.remaining || 0) - scenarioEstimate;

  const accuracyRows = funds.slice(0, 6).map((fund) => {
    const predicted = fund.snapshotId?.totalBudget || fund.adjustedBudget || 0;
    const actual = expenditures
      .filter((item) => item.incidentFundId?._id === fund._id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const errorPercent = predicted ? (Math.abs(actual - predicted) / predicted) * 100 : 0;
    return {
      id: fund._id,
      type: fund.disasterType,
      predicted,
      actual,
      errorPercent,
    };
  });

  const averageError = useMemo(() => {
    if (!accuracyRows.length) return 0;
    return (
      accuracyRows.reduce((sum, row) => sum + (row.errorPercent || 0), 0) /
      accuracyRows.length
    );
  }, [accuracyRows]);

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading financial forecast...</p>
      </div>
    );
  }

  const showOverview = section === "all" || section === "overview";
  const showDepletion = section === "all" || section === "depletion";
  const showPrediction = section === "all" || section === "prediction";
  const showScenario = section === "all" || section === "scenario";
  const showAccuracy = section === "all" || section === "accuracy";

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Forecasting</h1>
          <p className="dashboard-subtitle">
            Predict funding requirements using historical spend, frequency, and depletion rates
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showOverview && (
        <div className="forecast-insights" id="overview">
        <div className="forecast-insights-header">
          <h2>Budget vs Spend Series</h2>
          <span className="forecast-period">Average Spend {formatMoney(averageSpend)}</span>
        </div>
        <div className="trend-chart">
          {budgetSeries.map((item) => (
            <div className="trend-bar" key={`budget-${item.label}`}>
              <span className="trend-label">Budget {item.label}</span>
              <div className="trend-track">
                <div
                  className="trend-fill info"
                  style={{ width: `${Math.round(((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span className="trend-value">{formatMoney(item.value)}</span>
            </div>
          ))}
          {spendSeries.map((item) => (
            <div className="trend-bar" key={`spend-${item.label}`}>
              <span className="trend-label">Spend {item.label}</span>
              <div className="trend-track">
                <div
                  className="trend-fill warning"
                  style={{ width: `${Math.round(((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span className="trend-value">{formatMoney(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {showDepletion && (
        <div className="table-card" id="depletion">
        <h2 className="section-title">Disaster Pool Depletion Forecast</h2>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Pool</th>
              <th>Remaining Pool</th>
              <th>Spending Rate / Quarter</th>
              <th>Predicted Depletion</th>
            </tr>
          </thead>
          <tbody>
            {depletionForecast.map((row) => (
              <tr key={row._id}>
                <td>{formatType(row.disasterType)}</td>
                <td>{formatMoney(row.remaining)}</td>
                <td>{formatMoney(row.quarterlyRate)}</td>
                <td>
                  {row.quartersRemaining === null
                    ? "Insufficient data"
                    : `${row.quartersRemaining.toFixed(1)} quarters`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {showPrediction && (
        <div className="panel-grid" id="prediction">
        <div className="detail-card">
          <h2>Incident Cost Prediction Model</h2>
          <div className="detail-row">
            <span>Average cost per household</span>
            <strong>{formatMoney(avgCostPerHousehold)}</strong>
          </div>
          <div className="detail-row">
            <span>Average cost per {formatType(scenario.disasterType)}</span>
            <strong>{formatMoney(avgCostPerType)}</strong>
          </div>
          <div className="detail-row">
            <span>Severity multiplier</span>
            <strong>{severityMultiplier.toFixed(1)}x</strong>
          </div>
          <div className="detail-row">
            <span>Estimated next incident cost</span>
            <strong>{formatMoney(predictedIncidentCost)}</strong>
          </div>
        </div>
        <div className="detail-card">
          <h2>Funding Gap Analysis</h2>
          <div className="detail-row">
            <span>Expected disaster costs next year</span>
            <strong>{formatMoney(expectedNextYearCost)}</strong>
          </div>
          <div className="detail-row">
            <span>Projected budget</span>
            <strong>{formatMoney(projectedBudget)}</strong>
          </div>
          <div className="detail-row">
            <span>Shortfall estimate</span>
            <strong>{formatMoney(shortfall)}</strong>
          </div>
        </div>
      </div>
      )}

      {showScenario && (
        <div className="table-card" id="scenario">
        <h2 className="section-title">Scenario Simulation Tool</h2>
        <div className="finance-filters">
          <div className="filter-group">
            <label>Disaster type</label>
            <select
              value={scenario.disasterType}
              onChange={(event) =>
                setScenario((prev) => ({ ...prev, disasterType: event.target.value }))
              }
            >
              <option value="drought">Drought</option>
              <option value="heavy_rainfall">Heavy Rain</option>
              <option value="strong_winds">Strong Winds</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Districts affected</label>
            <input
              type="number"
              min="1"
              value={scenario.districts}
              onChange={(event) =>
                setScenario((prev) => ({ ...prev, districts: Number(event.target.value) }))
              }
            />
          </div>
          <div className="filter-group">
            <label>Households per district</label>
            <input
              type="number"
              min="0"
              value={scenario.householdsPerDistrict}
              onChange={(event) =>
                setScenario((prev) => ({ ...prev, householdsPerDistrict: Number(event.target.value) }))
              }
            />
          </div>
          <div className="filter-group">
            <label>People per district</label>
            <input
              type="number"
              min="0"
              value={scenario.peoplePerDistrict}
              onChange={(event) =>
                setScenario((prev) => ({ ...prev, peoplePerDistrict: Number(event.target.value) }))
              }
            />
          </div>
          <div className="filter-group">
            <label>Severity</label>
            <select
              value={scenario.severity}
              onChange={(event) =>
                setScenario((prev) => ({ ...prev, severity: event.target.value }))
              }
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
        </div>
        <div className="panel-grid">
          <div className="detail-card">
            <h2>Scenario Estimate</h2>
            <div className="detail-row">
              <span>Required funding</span>
              <strong>{formatMoney(scenarioEstimate)}</strong>
            </div>
            <div className="detail-row">
              <span>Logistics estimate</span>
              <strong>{formatMoney(logisticsEstimate)}</strong>
            </div>
            <div className="detail-row">
              <span>Severity multiplier</span>
              <strong>{severityMultiplier.toFixed(1)}x</strong>
            </div>
          </div>
          <div className="detail-card">
            <h2>Pool Impact</h2>
            <div className="detail-row">
              <span>Pool remaining (before)</span>
              <strong>{formatMoney(scenarioEnvelope?.remaining || 0)}</strong>
            </div>
            <div className="detail-row">
              <span>Pool remaining (after)</span>
              <strong>{formatMoney(scenarioRemaining)}</strong>
            </div>
            <div className="detail-row">
              <span>Reserve required?</span>
              <strong>{scenarioRemaining < 0 ? "Yes" : "No"}</strong>
            </div>
          </div>
        </div>
      </div>
      )}

      {showAccuracy && (
        <div className="table-card" id="accuracy">
        <h2 className="section-title">Forecast Accuracy Report</h2>
        <div className="secondary-stats">
          <div className="mini-stat">Average error: {averageError.toFixed(1)}%</div>
          <div className="mini-stat">Model: Severity multiplier + historical average</div>
        </div>
        <table className="fund-table">
          <thead>
            <tr>
              <th>Disaster Type</th>
              <th>Predicted Cost</th>
              <th>Actual Cost</th>
              <th>% Error</th>
            </tr>
          </thead>
          <tbody>
            {accuracyRows.map((row) => (
              <tr key={row.id}>
                <td>{formatType(row.type)}</td>
                <td>{formatMoney(row.predicted)}</td>
                <td>{formatMoney(row.actual)}</td>
                <td>{row.errorPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
