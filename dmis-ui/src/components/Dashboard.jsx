import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import MapView from "./MapView";
import RecentDisasters from "./RecentDisasters";
import API from "../api/axios";
import {
  AlertCircle,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const POPULATION = 2300000;
  const [disasters, setDisasters] = useState([]);
  const [funds, setFunds] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [error, setError] = useState("");
  const [forecastSummary, setForecastSummary] = useState(null);
  const [forecastError, setForecastError] = useState("");

  const fetchDisasters = useCallback(async () => {
    setError("");
    try {
      const res = await API.get("/disasters");

      // Normalized district coordinates (matching GIS Map page)
      const districtCoordinates = {
        "berea": [-29.3, 28.3],
        "buthabuthe": [-28.8, 28.2],
        "leribe": [-28.9, 28.0],
        "mafeteng": [-29.8, 27.5],
        "maseru": [-29.31, 27.48],
        "mohaleshoek": [-30.1, 27.5],
        "mokhotlong": [-29.3, 29.1],
        "qachasnek": [-30.1, 28.7],
        "quthing": [-30.4, 27.7],
        "thabatseka": [-29.5, 28.6],
      };

      // Normalize district name helper
      const normalizeDistrict = (value) => {
        if (!value) return "";
        return value.toLowerCase().replace(/['\s-]/g, "").trim();
      };

      const transformed = res.data.map((d) => {
        const key = normalizeDistrict(d.district);
        const coords = districtCoordinates[key] || [-29.6, 27.5];
        return {
          ...d,
          latitude: d.latitude || coords[0],
          longitude: d.longitude || coords[1],
        };
      });

      setDisasters(transformed);
      if (transformed.length > 0 && !selectedDisaster) {
        setSelectedDisaster(transformed[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load disasters");
    }
  }, [selectedDisaster]);

  useEffect(() => {
    fetchDisasters();
    fetchFunds();
    fetchForecastSummary();
    const interval = setInterval(fetchDisasters, 30000);
    return () => clearInterval(interval);
  }, [fetchDisasters]);

  const fetchFunds = async () => {
    try {
      const res = await API.get("/funds");
      setFunds(res.data || []);
    } catch (err) {
      // Silent fail to avoid blocking dashboard
    }
  };

  const fetchForecastSummary = async () => {
    setForecastError("");
    try {
      const res = await API.get("/forecast/generate");
      setForecastSummary(res.data);
    } catch (err) {
      setForecastError(err.response?.data?.message || "Forecast data unavailable");
    }
  };

  /* ================= Summary Stats ================= */
  const activeIncidents = disasters.length;
  
  // Calculate statistics from actual data
  const calculateStats = () => {
    const normalizeValue = (value) =>
      (value ?? "").toString().toLowerCase().trim();
    const normalizeType = (value) =>
      normalizeValue(value).replace(/[\s-]+/g, "_");
    const normalizeDistrict = (value) =>
      normalizeValue(value).replace(/['\s-]/g, "");

    const stats = {
      byType: {},
      byDistrict: {},
      bySeverity: { low: 0, medium: 0, high: 0 },
      byStatus: { reported: 0, verified: 0, responding: 0, closed: 0 }
    };

    const districtLabels = {};

    disasters.forEach(d => {
      // Count by type
      const typeKey = normalizeType(d.type) || "unknown";
      stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;
      
      // Count by district
      const districtKey = normalizeDistrict(d.district) || "unknown";
      const districtLabel = districtLabels[districtKey] || d.district || "Unknown";
      if (!districtLabels[districtKey]) {
        districtLabels[districtKey] = districtLabel;
      }
      stats.byDistrict[districtLabel] = (stats.byDistrict[districtLabel] || 0) + 1;
      
      // Count by severity
      if (d.severity != null) {
        const severityKey = normalizeValue(d.severity) || "low";
        stats.bySeverity[severityKey] = (stats.bySeverity[severityKey] || 0) + 1;
      }
      
      // Count by status
      if (d.status != null) {
        const statusKey = normalizeValue(d.status) || "reported";
        stats.byStatus[statusKey] = (stats.byStatus[statusKey] || 0) + 1;
      }
    });

    return stats;
  };

  const stats = calculateStats();
  
  // Get top risk districts (most disasters)
  const topDistricts = Object.entries(stats.byDistrict)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([district, count]) => ({
      district,
      active: count,
      severity: count > 50 ? 'High' : count > 20 ? 'Moderate' : 'Low',
      riskColor: count > 50 ? 'critical' : count > 20 ? 'moderate' : 'low'
    }));

  const formatMoney = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return numeric.toLocaleString();
  };

  const totalAllocated = funds.reduce((sum, fund) => sum + (fund.allocatedAmount || 0), 0);
  const totalSpent = funds.reduce((sum, fund) => sum + (fund.expenses || 0), 0);
  const fallbackBudget = forecastSummary
    ? forecastSummary.remainingBudget + Math.max(0, forecastSummary.fundingGap)
    : 0;

  const budgetValue = totalAllocated > 0
    ? `M ${formatMoney(totalAllocated)}`
    : `M ${formatMoney(fallbackBudget)}`;
  const budgetSubtitle = totalAllocated > 0
    ? `M ${formatMoney(totalSpent)} spent`
    : forecastSummary
      ? `Funding gap: M ${formatMoney(Math.abs(forecastSummary.fundingGap))}`
      : forecastError || "Forecast pending";

  const districtRiskRows = forecastSummary?.districtForecasts?.length
    ? forecastSummary.districtForecasts
        .slice()
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((row) => ({
          district: row.district,
          active: row.predictedIncidents,
          severity: row.riskLevel,
          riskColor: row.riskLevel === "High" ? "critical" : row.riskLevel === "Medium" ? "moderate" : "low",
        }))
    : topDistricts;

  const recentMonths = Array.from({ length: 6 }, (_, idx) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - idx));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString("default", { month: "short" }),
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  });

  const types = ["drought", "heavy_rainfall", "strong_winds"];
  const typeColors = {
    drought: "#f59e0b",
    heavy_rainfall: "#3b82f6",
    strong_winds: "#10b981",
  };

  const monthlyTypeCounts = recentMonths.reduce((acc, month) => {
    acc[month.key] = {
      drought: 0,
      heavy_rainfall: 0,
      strong_winds: 0,
      spend: 0,
    };
    return acc;
  }, {});

  disasters.forEach((disaster) => {
    const incidentDate = new Date(disaster.createdAt || disaster.date || Date.now());
    const key = `${incidentDate.getFullYear()}-${incidentDate.getMonth()}`;
    if (!monthlyTypeCounts[key]) return;
    const typeKey = (disaster.type || "").toString().toLowerCase().replace(/[\s-]+/g, "_");
    if (types.includes(typeKey)) {
      monthlyTypeCounts[key][typeKey] += 1;
    }
    monthlyTypeCounts[key].spend += disaster.damageCost || 0;
  });

  const maxIncidentCount = Math.max(
    1,
    ...recentMonths.flatMap((month) =>
      types.map((type) => monthlyTypeCounts[month.key][type])
    )
  );

  const monthlyBudget = totalAllocated > 0
    ? totalAllocated / 12
    : fallbackBudget > 0
      ? fallbackBudget / 12
      : 0;
  const maxSpend = Math.max(
    monthlyBudget,
    ...recentMonths.map((month) => monthlyTypeCounts[month.key].spend)
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text" style={{letterSpacing: '-0.3px'}}>Dashboard</h1>
        <p className="text-sm text-muted">National Disaster Overview</p>
        <p className="text-xs text-slate-500 mt-1">
          Data span: {forecastSummary?.dataSpanYears || 10} years • Population baseline: {POPULATION.toLocaleString()}
        </p>
      </div>

      {/* Summary Cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Disasters"
          value={activeIncidents}
          subtitle={`${stats.byStatus.verified || 0} verified`}
          icon={<AlertCircle className="w-5 h-5 text-critical" />}
          bgColor="bg-red-50"
        />
        <SummaryCard
          title="Districts Affected"
          value={Object.keys(stats.byDistrict).length}
          subtitle={`${stats.bySeverity.high || 0} high severity`}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="Total Budget"
          value={budgetValue}
          subtitle={budgetSubtitle}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Active Response"
          value={stats.byStatus.responding || 0}
          subtitle={`${stats.byStatus.reported || 0} pending review`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Main Content Area - Map on left, Incidents on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map Section - 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h2 className="text-lg font-semibold text-text mb-3">
            Disaster Locations
          </h2>
          {error && (
            <div className="text-sm text-critical mb-3 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <div className="h-96 rounded-lg overflow-hidden bg-slate-100">
            <MapView disasters={disasters} selectedDisaster={selectedDisaster} />
          </div>
        </div>

        {/* Recent Disasters - 1/3 width */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-text">Recent Disasters</h2>
            <Link to="/disaster-events" className="text-xs text-blue-600 font-medium hover:underline">
              View All →
            </Link>
          </div>
          <RecentDisasters
            disasters={disasters}
            selectedDisaster={selectedDisaster}
            onSelectDisaster={setSelectedDisaster}
          />
        </div>
      </div>

      {/* Charts & Table Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart: Disasters by Type */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">
            Disasters by Type (6 Months)
          </h3>
          <div className="h-64 flex items-end justify-around gap-2 px-2">
            {recentMonths.map((month) => (
              <div key={month.key} className="text-center">
                <div className="flex items-end gap-1" style={{ height: "200px" }}>
                  {types.map((type) => {
                    const value = monthlyTypeCounts[month.key][type];
                    const height = 20 + (value / maxIncidentCount) * 160;
                    return (
                      <div
                        key={type}
                        style={{
                          height: `${height}px`,
                          backgroundColor: typeColors[type],
                        }}
                        className="w-2 rounded"
                        title={`${type.replace(/_/g, " ")}: ${value}`}
                      ></div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-2">{month.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 justify-center mt-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeColors.drought }}></div>
              Drought ({stats.byType.drought || 0})
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeColors.heavy_rainfall }}></div>
              Heavy Rainfall ({stats.byType.heavy_rainfall || 0})
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: typeColors.strong_winds }}></div>
              Strong Winds ({stats.byType.strong_winds || 0})
            </span>
          </div>
        </div>

        {/* Chart: Financial Overview */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">
            Financial Overview (6 Months)
          </h3>
          <div className="h-64 flex items-end justify-around gap-2 px-2">
            {recentMonths.map((month) => {
              const spend = monthlyTypeCounts[month.key].spend;
              const spendHeight = maxSpend > 0 ? (spend / maxSpend) * 180 + 20 : 20;
              const budgetHeight = maxSpend > 0 ? (monthlyBudget / maxSpend) * 180 + 20 : 20;
              return (
                <div key={month.key} className="text-center">
                  <div className="flex items-end gap-2" style={{ height: "200px" }}>
                    <div
                      className="w-3 rounded"
                      style={{ height: `${budgetHeight}px`, backgroundColor: "#60a5fa" }}
                      title={`Budget: M ${formatMoney(monthlyBudget)}`}
                    ></div>
                    <div
                      className="w-3 rounded"
                      style={{ height: `${spendHeight}px`, backgroundColor: "#2dd4bf" }}
                      title={`Spend: M ${formatMoney(spend)}`}
                    ></div>
                  </div>
                  <p className="text-xs text-muted mt-2">{month.label}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 justify-center mt-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-400 rounded"></div> Total Budget
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-teal-400 rounded"></div> Amount Spent
            </span>
          </div>
        </div>
      </div>

      {/* District Risk Assessment Table */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 mt-6">
        <h3 className="text-lg font-semibold text-text mb-4">
          District Risk Assessment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-muted font-medium">DISTRICT</th>
                <th className="text-left py-2 px-3 text-muted font-medium">TOTAL DISASTERS</th>
                <th className="text-left py-2 px-3 text-muted font-medium">RISK LEVEL</th>
              </tr>
            </thead>
            <tbody>
              {districtRiskRows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 text-text font-medium">{row.district}</td>
                  <td className="py-3 px-3 text-text">{row.active} incidents</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full text-white`}
                      style={{
                        backgroundColor:
                          row.riskColor === "critical"
                            ? "#B94A48"
                            : row.riskColor === "moderate"
                            ? "#C9A227"
                            : "#4E8A64",
                      }}
                    >
                      {row.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= Summary Card Component ================= */
function SummaryCard({ title, value, subtitle, icon, bgColor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-muted mb-1">{title}</p>
          <p className="text-2xl font-bold text-text">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${bgColor}`}>{icon}</div>
      </div>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );
}
