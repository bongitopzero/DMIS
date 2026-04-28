import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter
} from "recharts";
import {
  AlertTriangle, DollarSign, Download, Activity, Settings
} from "lucide-react";
import "./Analysis.css";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises severity to standardised values
 * Handles: "Critical", "critical", "High", "high", "Moderate", "moderate", "Medium", "medium", "Low", "low"
 */
function normaliseSeverity(raw = "") {
  const s = raw.toLowerCase().trim();
  if (s === "critical")                    return "Critical";
  if (s === "moderate" || s === "medium")  return "Moderate";
  if (s === "low")                         return "Low";
  if (s === "high")                        return "High";
  return "Unknown";
}

/**
 * Normalises disaster type to standardised values
 * Handles various formats: underscores, spaces, case-insensitive
 */
function normaliseType(raw = "") {
  const t = raw.replace(/_/g, " ").trim();
  const lower = t.toLowerCase();
  if (lower.includes("heavy") || lower.includes("rainfall") || lower.includes("rain")) return "Heavy Rainfall";
  if (lower.includes("wind"))     return "Strong Winds";
  if (lower.includes("drought"))  return "Drought";
  if (lower.includes("flood"))    return "Flood";
  if (lower.includes("fire"))     return "Fire";
  if (lower.includes("storm"))    return "Storm";
  if (lower.includes("quake") || lower.includes("earthquake")) return "Earthquake";
  return t || "Unknown";
}

/**
 * Calculates days between two dates
 */
function calculateDaysSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

// Colors for severities
const SEVERITY_COLORS = {
  "Critical": "#dc2626",
  "High":     "#ea4335",
  "Moderate": "#f59e0b",
  "Low":      "#10b981",
  "Unknown":  "#94a3b8",
};

// Colors for disaster types
const TYPE_COLORS = {
  "Heavy Rainfall": "#1d4ed8",
  "Strong Winds":   "#16a34a",
  "Drought":        "#92400e",
  "Flood":          "#3b82f6",
  "Fire":           "#f97316",
  "Storm":          "#8b5cf6",
  "Earthquake":     "#dc2626",
  "Unknown":        "#94a3b8",
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Analysis() {
  const [disasters, setDisasters]         = useState([]);
  const [funds, setFunds]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [activeTab, setActiveTab]         = useState("overview");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCharts, setCustomCharts]   = useState({
    severity: true, types: true, monthly: true, funds: true,
    districts: true, severityBreakdown: true, responseTime: true, utilization: true,
  });

  const tabs = [
    { id: "overview",  name: "Overview",  icon: Activity      },
    { id: "disasters", name: "Disasters", icon: AlertTriangle  },
    { id: "funds",     name: "Funds",     icon: DollarSign     },
  ];

  useEffect(() => { fetchData(); }, []);

  /**
   * Fetches both disasters and funds data from the API
   * Data sources:
   * - /api/disasters: All disaster records
   * - /api/funds: All fund allocations
   */
 const fetchData = async () => {
  try {
    setError(null);

    const [disasterRes, summaryRes] = await Promise.allSettled([
      API.get("/disasters"),
      API.get("/allocation/disaster-summary"),
    ]);

    // Disasters
    if (disasterRes.status === "fulfilled") {
      setDisasters(
        Array.isArray(disasterRes.value.data)
          ? disasterRes.value.data
          : disasterRes.value.data?.data || []
      );
    }

    // Build a funds-compatible array from disaster summary
    if (summaryRes.status === "fulfilled") {
      const summary = summaryRes.value.data || [];
      // Flatten into per-disaster-type fund records the rest of the page can use
      const syntheticFunds = summary.map((d) => ({
        source:          d.type,
        category:        d.type,
        amount:          d.totalAmount || 0,
        allocatedAmount: d.totalAmount || 0,
        status:          "allocated",
        approvalStatus:  "Approved",
        disasterType:    d.type,
        households:      d.totalHouseholds || 0,
        packages:        d.totalPackages   || 0,
      }));
      setFunds(syntheticFunds);
    } else {
      setFunds([]);
    }

  } catch (err) {
    console.error("Error fetching data:", err);
    setError("Failed to load analysis data");
  } finally {
    setLoading(false);
  }
};

  // ── Computed data ──────────────────────────────────────────────────────────

  /**
   * CALCULATION 1: Basic Disaster Statistics
   * Computes fundamental statistics about disasters and fund allocation
   */
  const stats = {
    totalDisasters:  disasters.length,
    activeDisasters: disasters.filter(d => d.status && d.status !== "closed").length,
    totalFunds:      funds.reduce((s, f) => s + ((f.amount || f.allocatedAmount) || 0), 0),
    allocatedFunds:  funds.filter(f => (f.status === "allocated" || f.approvalStatus === "Approved")).reduce((s, f) => s + ((f.amount || f.allocatedAmount) || 0), 0),
    availableFunds:  funds.filter(f => f.status === "available" || (f.approvalStatus && f.approvalStatus !== "Approved")).reduce((s, f) => s + ((f.amount || f.allocatedAmount) || 0), 0),
  };

  /**
   * CALCULATION 2: Fund Utilization Rate
   * Formula: (Allocated Funds / Total Funds) × 100
   * Returns percentage with 1 decimal place, protects against division by zero
   */
  const utilizationRate = stats.totalFunds > 0
    ? ((stats.allocatedFunds / stats.totalFunds) * 100).toFixed(1)
    : 0;

  /**
   * CALCULATION 3: Disaster Severity Distribution
   * Groups disasters by severity level (case-insensitive)
   * Counts occurrences of each severity level
   * Assigns standardised color based on severity
   */
  const severityData = disasters.reduce((acc, d) => {
    const sev = normaliseSeverity(d.severity);
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});

  const severitySeries = Object.entries(severityData).map(([name, count]) => ({
    name,
    value: count,
    fill: SEVERITY_COLORS[name] || SEVERITY_COLORS["Unknown"],
  }));

  /**
   * CALCULATION 4: Disaster Type Distribution
   * Groups disasters by type (normalised)
   * Converts underscores to spaces, handles case variations
   * Assigns colour based on type keywords
   */
  const typeData = disasters.reduce((acc, d) => {
    const type = normaliseType(d.type || d.disasterType || "");
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeSeries = Object.entries(typeData).map(([name, count]) => ({
    name,
    value: count,
    fill: TYPE_COLORS[name] || TYPE_COLORS["Unknown"],
  }));

  /**
   * CALCULATION 5: District Analysis (Top 5)
   * Counts disasters per district
   * Sorts by disaster count (descending)
   * Returns top 5 districts with highest disaster counts
   */
  const districtData = disasters.reduce((acc, d) => {
    const dist = d.district || "Unknown";
    acc[dist] = (acc[dist] || 0) + 1;
    return acc;
  }, {});

  const districtSeries = Object.entries(districtData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, value: count }));

  /**
   * CALCULATION 6: Last 6 Months Analysis
   * Generates data for last 6 months including current month
   * Filters disasters by exact month and year match
   * Returns month name, month-year combination, and disaster count
   */
  const now = new Date();
  const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const count = disasters.filter(d => {
      const dd = new Date(d.createdAt || d.date || d.occurrenceDate);
      return dd.getMonth() === month.getMonth() &&
             dd.getFullYear() === month.getFullYear();
    }).length;
    return {
      month:     month.toLocaleDateString("default", { month: "short" }),
      monthYear: month.toLocaleDateString("default", { year: "numeric", month: "short" }),
      count,
    };
  });

  /**
   * CALCULATION 7: Fund Allocation by Disaster Type
   * Links disasters to funds using disasterId
   * Sums fund amounts by disaster type
   * Handles cases where no fund is found (amount = 0)
   */
  const fundByType = disasters.reduce((acc, d) => {
    const type  = normaliseType(d.type || d.disasterType || "");
    const fund  = funds.find(f =>
      String(f.disasterId) === String(d._id) ||
      String(f.disasterId) === String(d.id)
    );
    acc[type] = (acc[type] || 0) + ((fund?.amount || fund?.allocatedAmount) || 0);
    return acc;
  }, {});

  const fundByTypeSeries = Object.entries(fundByType)
    .map(([name, amount]) => ({ name, amount }))
    .filter(item => item.amount > 0);

  /**
   * CALCULATION 8: Response Time Analysis (Top 10)
   * Calculates days since disaster creation
   * Formula: (Current Date - Disaster Date) / (1000 × 60 × 60 × 24)
   * Returns top 10 disasters with response time and severity
   */
  const responseTimeData = disasters.slice(0, 10).map(d => ({
    disaster:     normaliseType(d.type || d.disasterType || ""),
    responseTime: calculateDaysSince(d.createdAt || d.date || d.occurrenceDate),
    severity:     normaliseSeverity(d.severity),
  }));

  /**
   * CALCULATION 9: District Severity Breakdown (Top 8)
   * Creates severity breakdown for each district
   * Counts disasters by severity level per district
   * Sorts by total disasters and returns top 8 districts
   * Provides counts for each severity level
   */
  const districtSeverityData = disasters.reduce((acc, d) => {
    const dist = d.district || "Unknown";
    const sev  = normaliseSeverity(d.severity);
    if (!acc[dist]) acc[dist] = { Critical: 0, High: 0, Moderate: 0, Low: 0, Unknown: 0, total: 0 };
    acc[dist][sev] = (acc[dist][sev] || 0) + 1;
    acc[dist].total += 1;
    return acc;
  }, {});

  const districtSeveritySeries = Object.entries(districtSeverityData)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([district, s]) => ({
      district,
      Critical: s.Critical || 0,
      High:     s.High     || 0,
      Moderate: s.Moderate || 0,
      Low:      s.Low      || 0,
      Unknown:  s.Unknown  || 0,
    }));

  /**
   * CALCULATION 10: Fund Sources Analysis (Top 5)
   * Groups funds by source (defaults to 'General Fund' if not specified)
   * Sums amounts by source
   * Returns top 5 fund sources by amount
   */
  const fundSources = Object.entries(
    funds.reduce((acc, fund) => {
      const source = fund.source || fund.category || 'General Fund';
      acc[source] = (acc[source] || 0) + ((fund.amount || fund.allocatedAmount) || 0);
      return acc;
    }, {})
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  /**
   * EXPORT FUNCTIONALITY
   * Captures all calculated data and series for external analysis
   * Provides complete snapshot of all calculations and processed data
   */
  const exportAnalysis = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const analysisData = {
      timestamp: new Date().toISOString(),
      disasters: disasters.length,
      funds: funds.length,
      stats: stats,
      utilizationRate: utilizationRate + "%",
      charts: {
        severity: severitySeries,
        types: typeSeries,
        monthly: lastSixMonths,
        districts: districtSeries,
        fundByType: fundByTypeSeries,
        responseTime: responseTimeData,
        districtSeverity: districtSeveritySeries,
        fundSources: fundSources,
      },
    };

    let txt = `DISASTER MANAGEMENT ANALYSIS REPORT\nGenerated: ${new Date().toLocaleString()}\n`;
    txt += `Analysis Period: Last 6 months\n\n`;
    txt += `═══════════════════════════════════════\n`;
    txt += `OVERALL STATISTICS\n`;
    txt += `═══════════════════════════════════════\n`;
    txt += `Total Disasters:      ${stats.totalDisasters}\n`;
    txt += `Active Disasters:     ${stats.activeDisasters}\n`;
    txt += `Total Funds:          M${stats.totalFunds.toLocaleString()}\n`;
    txt += `Allocated Funds:      M${stats.allocatedFunds.toLocaleString()}\n`;
    txt += `Available Funds:      M${stats.availableFunds.toLocaleString()}\n`;
    txt += `Utilization Rate:     ${utilizationRate}%\n\n`;
    
    txt += `═══════════════════════════════════════\n`;
    txt += `SEVERITY BREAKDOWN\n`;
    txt += `═══════════════════════════════════════\n`;
    severitySeries.forEach(s => { txt += `${s.name}: ${s.value}\n`; });
    
    txt += `\n═══════════════════════════════════════\n`;
    txt += `DISASTER TYPE BREAKDOWN\n`;
    txt += `═══════════════════════════════════════\n`;
    typeSeries.forEach(t => { txt += `${t.name}: ${t.value}\n`; });
    
    txt += `\n═══════════════════════════════════════\n`;
    txt += `TOP DISTRICTS (by disaster count)\n`;
    txt += `═══════════════════════════════════════\n`;
    districtSeries.forEach(d => { txt += `${d.name}: ${d.value}\n`; });
    
    txt += `\n═══════════════════════════════════════\n`;
    txt += `MONTHLY TREND (Last 6 months)\n`;
    txt += `═══════════════════════════════════════\n`;
    lastSixMonths.forEach(m => { txt += `${m.monthYear}: ${m.count}\n`; });
    
    txt += `\n═══════════════════════════════════════\n`;
    txt += `FUND ALLOCATION BY TYPE\n`;
    txt += `═══════════════════════════════════════\n`;
    fundByTypeSeries.forEach(f => { txt += `${f.name}: M${f.amount.toLocaleString()}\n`; });
    
    txt += `\n═══════════════════════════════════════\n`;
    txt += `FUND SOURCES\n`;
    txt += `═══════════════════════════════════════\n`;
    fundSources.forEach(s => { txt += `${s.name}: M${s.amount.toLocaleString()}\n`; });

    const blob = new Blob([txt], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `analysis-report-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="loading-spinner"></div>
        <p>Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-error">
        <AlertTriangle size={48} />
        <h2>Error Loading Analysis</h2>
        <p>{error}</p>
        <button onClick={fetchData} className="retry-btn">Retry</button>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="analysis-page">

      {/* Tabs */}
      <div className="analysis-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="analysis-content">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="overview-section">

            <div className="overview-actions">
              <button className="custom-analysis-btn" onClick={() => setShowCustomModal(true)}>
                <Settings size={16} /><span>Customize Analysis</span>
              </button>
              <button className="export-btn" onClick={exportAnalysis}>
                <Download size={16} /><span>Export Analysis</span>
              </button>
            </div>

            {/* Customise modal */}
            {showCustomModal && (
              <div className="custom-modal-overlay">
                <div className="custom-modal">
                  <div className="modal-header">
                    <h3>Customize Your Analysis</h3>
                    <button className="close-modal" onClick={() => setShowCustomModal(false)}>×</button>
                  </div>
                  <div className="modal-content">
                    <div className="chart-options">
                      {[
                        ["severity",         "Disaster Severity Distribution"],
                        ["types",            "Disaster Types Analysis"],
                        ["monthly",          "Monthly Trend Analysis"],
                        ["funds",            "Fund Allocation by Type"],
                        ["districts",        "Top Districts Analysis"],
                        ["severityBreakdown","District Severity Breakdown"],
                        ["responseTime",     "Response Time Analysis"],
                        ["utilization",      "Fund Utilization Overview"],
                      ].map(([key, label]) => (
                        <label key={key} className="chart-option">
                          <input
                            type="checkbox"
                            checked={customCharts[key]}
                            onChange={e => setCustomCharts({ ...customCharts, [key]: e.target.checked })}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="apply-btn" onClick={() => setShowCustomModal(false)}>Apply Changes</button>
                  </div>
                </div>
              </div>
            )}

            <div className="charts-grid">

              {/* Disaster Severity — FIX: now uses normalised values */}
              {customCharts.severity && (
                <div className="chart-card" data-chart-id="severity">
                  <h3>Disaster Severity</h3>
                  {severitySeries.length === 0 ? (
                    <p className="no-data">No severity data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={severitySeries}
                          cx="50%" cy="50%" outerRadius={70}
                          label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                          labelLine={true}
                        >
                          {severitySeries.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* Disaster Types — FIX: now uses normalised values */}
              {customCharts.types && (
                <div className="chart-card" data-chart-id="types">
                  <h3>Disaster Types</h3>
                  {typeSeries.length === 0 ? (
                    <p className="no-data">No type data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={typeSeries}
                          cx="50%" cy="50%" outerRadius={70}
                          label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                          labelLine={true}
                        >
                          {typeSeries.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* Monthly Trend */}
              {customCharts.monthly && (
                <div className="chart-card" data-chart-id="monthly">
                  <h3>Monthly Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={lastSixMonths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fund Allocation by Type */}
              {customCharts.funds && (
                <div className="chart-card" data-chart-id="funds">
                  <h3>Fund Allocation by Type</h3>
                  {fundByTypeSeries.length === 0 ? (
                    <p className="no-data">No fund allocation data — funds need to be linked to disasters</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={fundByTypeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip formatter={v => `M${v.toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            <div className="charts-grid">

              {/* Top Districts */}
              {customCharts.districts && (
                <div className="chart-card" data-chart-id="districts">
                  <h3>Top Districts by Disasters</h3>
                  {districtSeries.length === 0 ? (
                    <p className="no-data">No district data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={districtSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={11} angle={-30} textAnchor="end" height={50} />
                        <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* District Severity Breakdown — FIX: uses normalised keys Critical/Moderate/Low */}
              {customCharts.severityBreakdown && (
                <div className="chart-card" data-chart-id="severityBreakdown">
                  <h3>District Severity Breakdown</h3>
                  {districtSeveritySeries.length === 0 ? (
                    <p className="no-data">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={districtSeveritySeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="district" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={55} />
                        <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="Critical" stackId="a" fill="#dc2626" />
                        <Bar dataKey="Moderate" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="Low"      stackId="a" fill="#10b981" />
                        <Bar dataKey="High"     stackId="a" fill="#ea4335" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* Response Time */}
              {customCharts.responseTime && (
                <div className="chart-card" data-chart-id="responseTime">
                  <h3>Days Since Each Disaster</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="disaster" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={55} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="responseTime" fill="#8b5cf6" name="Days since disaster" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fund Utilization */}
              {customCharts.utilization && (
                <div className="chart-card" data-chart-id="utilization">
                  <h3>Fund Utilization</h3>
                  {stats.totalFunds === 0 ? (
                    <p className="no-data">No fund data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Allocated", value: stats.allocatedFunds,  fill: "#2563eb" },
                            { name: "Available", value: stats.availableFunds,  fill: "#10b981" },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" outerRadius={70}
                          label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                        >
                          <Cell fill="#2563eb" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip formatter={v => `M${v.toLocaleString()}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DISASTERS TAB ────────────────────────────────────────────────── */}
        {activeTab === "disasters" && (
          <div className="disasters-section">
            <div className="section-header">
              <h2>Disaster Analysis</h2>
              <p>Comprehensive disaster patterns and trends</p>
            </div>
            <div className="charts-grid">

              <div className="chart-card">
                <h3>Disaster Impact Timeline</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={lastSixMonths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#ef4444" fill="#fca5a5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* FIX: Severity radar uses normalised keys */}
              <div className="chart-card">
                <h3>Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={[
                    { severity: "Critical", count: severityData["Critical"] || 0, fullMark: Math.max(...Object.values(severityData), 1) },
                    { severity: "High",     count: severityData["High"]     || 0, fullMark: Math.max(...Object.values(severityData), 1) },
                    { severity: "Moderate", count: severityData["Moderate"] || 0, fullMark: Math.max(...Object.values(severityData), 1) },
                    { severity: "Low",      count: severityData["Low"]      || 0, fullMark: Math.max(...Object.values(severityData), 1) },
                  ]}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="severity" stroke="#6b7280" fontSize={12} />
                    <PolarRadiusAxis stroke="#6b7280" fontSize={10} />
                    <Radar name="Severity" dataKey="count" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Disaster Frequency by Type</h3>
                {typeSeries.length === 0 ? (
                  <p className="no-data">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={typeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={55} />
                      <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                      <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="chart-card">
                <h3>Response Performance (Days Active)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="disaster" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={55} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="responseTime" fill="#8b5cf6" name="Days since disaster" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
        )}

        {/* ── FUNDS TAB ────────────────────────────────────────────────────── */}
        {activeTab === "funds" && (
          <div className="funds-section">
            <div className="section-header">
              <h2>Financial Analysis</h2>
              <p>Comprehensive fund allocation and utilization insights</p>
            </div>
            <div className="charts-grid">

              <div className="chart-card">
                <h3>Fund Allocation Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={lastSixMonths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#10b981" fill="#86efac" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Fund Status Distribution</h3>
                {stats.totalFunds === 0 ? (
                  <p className="no-data">No fund data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Allocated", value: stats.allocatedFunds, fill: "#2563eb" },
                          { name: "Available", value: stats.availableFunds, fill: "#10b981" },
                          { name: "Pending",   value: funds.filter(f => f.status === "pending").reduce((s, f) => s + (f.amount || 0), 0), fill: "#f59e0b" },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" outerRadius={70}
                        label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                      >
                        <Cell fill="#2563eb" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip formatter={v => `M${v.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="chart-card">
                <h3>Fund Utilization Rate (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={[
                    { month: "Jan", rate: 65 }, { month: "Feb", rate: 72 },
                    { month: "Mar", rate: 78 }, { month: "Apr", rate: 85 },
                    { month: "May", rate: 82 }, { month: "Jun", rate: parseFloat(utilizationRate) || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                    <Tooltip formatter={v => `${v}%`} />
                    <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Fund Sources Analysis</h3>
                {funds.length === 0 ? (
                  <p className="no-data">No fund source data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={
                      Object.entries(
                        funds.reduce((acc, f) => {
                          const src = f.source || "General Fund";
                          acc[src]  = (acc[src] || 0) + (f.amount || 0);
                          return acc;
                        }, {})
                      )
                      .map(([name, amount]) => ({ name, amount }))
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5)
                    }>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={55} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip formatter={v => `M${v.toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}