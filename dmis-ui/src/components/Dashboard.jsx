import React, { useState, useEffect } from "react";
import MapView from "./MapView";
import RecentDisasters from "./RecentDisasters";
import API from "../api/axios";
import { ToastManager } from "./Toast";
import {
  AlertCircle,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disastersByType, setDisastersByType] = useState({});
  const [financialByMonth, setFinancialByMonth] = useState({});
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchDisasters();
    fetchDashboardStats();
    fetchCoordinatorOverview();
    const interval = setInterval(() => {
      fetchDisasters();
      fetchDashboardStats();
      fetchCoordinatorOverview();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCoordinatorOverview = async () => {
    try {
      const res = await API.get("/coordinator/overview");
      setOverview(res.data || null);
    } catch (err) {
      // quietly ignore if endpoint not available or not authorized
      console.debug("Coordinator overview not available:", err?.message || err);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [typeRes, finRes] = await Promise.all([
        API.get("/disasters/dashboard/by-type"),
        API.get("/disasters/dashboard/financial-summary")
      ]);

      setDisastersByType(typeRes.data.data || {});
      setFinancialByMonth(finRes.data.data || {});
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  const fetchDisasters = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/disasters");

      const districtCoordinates = {
        "berea": [-29.3, 28.3],
        "butha-buthe": [-29.1, 28.7],
        "leribe": [-29.3, 28.0],
        "mafeteng": [-29.7, 27.7],
        "maseru": [-29.6, 27.5],
        "mohale's hoek": [-30.1, 28.1],
        "mokhotlong": [-30.4, 29.3],
        "qacha's nek": [-30.7, 29.1],
        "quthing": [-30.7, 28.9],
        "thaba tseka": [-29.5, 29.2],
      };

      const transformed = res.data.map((d) => {
        const key = d.district?.toLowerCase();
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
    } finally {
      setLoading(false);
    }
  };

  /* ================= Summary Stats ================= */
  const activeIncidents = disasters.length;
  
  // Calculate statistics from actual data
  const calculateStats = () => {
    const stats = {
      byType: {},
      byDistrict: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byStatus: { reported: 0, submitted: 0, verified: 0, responding: 0, closed: 0 }
    };

    disasters.forEach(d => {
      // Count by type
      stats.byType[d.type] = (stats.byType[d.type] || 0) + 1;
      
      // Count by district
      stats.byDistrict[d.district] = (stats.byDistrict[d.district] || 0) + 1;
      
      // Count by severity
      if (d.severity) {
        const severity = d.severity.toLowerCase();
        if (severity.includes('critical') || severity === 'high' && d.status !== 'closed') {
          stats.bySeverity.critical = (stats.bySeverity.critical || 0) + 1;
        } else if (severity.includes('high')) {
          stats.bySeverity.high = (stats.bySeverity.high || 0) + 1;
        } else if (severity.includes('medium')) {
          stats.bySeverity.medium = (stats.bySeverity.medium || 0) + 1;
        } else if (severity.includes('low')) {
          stats.bySeverity.low = (stats.bySeverity.low || 0) + 1;
        }
      }
      
      // Count by status
      if (d.status) {
        stats.byStatus[d.status] = (stats.byStatus[d.status] || 0) + 1;
      }
    });

    return stats;
  };

  const stats = calculateStats();
  
  // Get top risk districts (most disasters)
  const topDistricts = Object.entries(stats.byDistrict)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([district, count]) => {
      // Calculate risk level based on severity of disasters in that district
      const districtDisasters = disasters.filter(d => d.district === district);
      const hasCritical = districtDisasters.some(d => 
        d.severity?.toLowerCase().includes('critical') || 
        (d.severity?.toLowerCase().includes('high') && d.status !== 'closed')
      );
      const hasHigh = districtDisasters.some(d => d.severity?.toLowerCase().includes('high'));
      
      let riskLevel = 'Low';
      let riskColor = 'low';
      
      if (hasCritical) {
        riskLevel = 'Critical';
        riskColor = 'critical';
      } else if (hasHigh) {
        riskLevel = 'High';
        riskColor = 'moderate';
      } else if (count > 3) {
        riskLevel = 'Moderate';
        riskColor = 'moderate';
      }
      
      return {
        district,
        active: count,
        severity: riskLevel,
        riskColor
      };
    });

  // Calculate actual allocated funds from data
  const calculateAllocatedFunds = () => {
    let total = 0;
    disasters.forEach(d => {
      if (d.allocatedBudget) {
        total += parseFloat(d.allocatedBudget) || 0;
      }
    });
    return total / 1000000; // Convert to millions
  };

  // Calculate actual requested funds
  const calculateRequestedFunds = () => {
    let total = 0;
    disasters.forEach(d => {
      if (d.requestedBudget) {
        total += parseFloat(d.requestedBudget) || 0;
      } else if (d.estimatedCost) {
        total += parseFloat(d.estimatedCost) || 0;
      }
    });
    return total / 1000000; // Convert to millions
  };

  const totalAllocated = calculateAllocatedFunds();
  const totalRequested = calculateRequestedFunds();
  const totalSpent = totalAllocated * 0.65; // Estimate 65% of allocated is spent

  // Count critical disasters
  const criticalDisasters = disasters.filter(d => 
    d.severity?.toLowerCase().includes('critical') || 
    (d.severity?.toLowerCase().includes('high') && d.status !== 'closed')
  ).length;

  const handleApproveDisaster = async (disasterId) => {
    try {
      const response = await API.put(`/disasters/${disasterId}`, {
        status: "verified"
      });
      console.log("✅ Disaster approved:", response.data);
      await fetchDisasters();
      ToastManager.success("✅ Disaster approved successfully!");
    } catch (err) {
      setError("Failed to approve disaster");
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to approve disaster";
      ToastManager.error(`Error: ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text" style={{letterSpacing: '-0.3px'}}>Dashboard</h1>
        <p className="text-sm text-muted">National Disaster Overview</p>
      </div>

      {/* Summary Cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Current Year Incidents"
          value={overview?.currentYear?.incidentsCount ?? activeIncidents}
          subtitle={`${stats.byStatus.verified || 0} verified · ${stats.byStatus.submitted || 0} pending`}
          icon={<AlertCircle className="w-5 h-5 text-critical" />}
          bgColor="bg-red-50"
        />
        <SummaryCard
          title="Districts Affected"
          value={Object.keys(stats.byDistrict).length}
          subtitle={`${stats.bySeverity.high || 0} high · ${stats.bySeverity.critical || 0} critical`}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="Allocated Funds"
          value={totalAllocated > 0 ? `M ${totalAllocated.toFixed(1)}` : "M 0"}
          subtitle={totalRequested > 0 ? `Requested: M ${totalRequested.toFixed(1)}` : "No requests"}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Critical Disasters"
          value={criticalDisasters}
          subtitle={`${stats.byStatus.responding || 0} active responses`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Pending Approval Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-text mb-4">Pending Coordinator Approval</h2>
        {disasters.filter(d => d.status === "submitted").length === 0 ? (
          <p className="text-sm text-muted">No disasters pending approval</p>
        ) : (
          <div className="space-y-3">
            {disasters.filter(d => d.status === "submitted").map((disaster) => (
              <div key={disaster._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-text">{disaster.type?.toUpperCase()} in {disaster.district}</p>
                  <p className="text-sm text-muted">
                    {disaster.numberOfHouseholdsAffected || 0} household(s) | 
                    Severity: <span style={{ 
                      textTransform: 'capitalize', 
                      fontWeight: '600',
                      color: disaster.severity?.toLowerCase().includes('critical') ? '#B94A48' : 
                             disaster.severity?.toLowerCase().includes('high') ? '#C9A227' : 
                             disaster.severity?.toLowerCase().includes('medium') ? '#4E8A64' : '#3b82f6'
                    }}>
                      {disaster.severity}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleApproveDisaster(disaster._id)}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.35rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  {loading ? "Approving..." : "Approve"}
                </button>
              </div>
            ))}
          </div>
        )}
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
  <h2 className="text-lg font-semibold text-text mb-4">Recent Disasters</h2>
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
          <DisastersByTypeChart disastersByType={disastersByType} />
        </div>

        {/* Chart: Financial Overview */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">
            Financial Overview (6 Months)
          </h3>
          <FinancialOverviewChart financialByMonth={financialByMonth} />
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
              {topDistricts.length > 0 ? (
                topDistricts.map((row, idx) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-muted">
                    No district data available
                  </td>
                </tr>
              )}
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

/* ================= Disasters by Type Chart Component ================= */
function DisastersByTypeChart({ disastersByType }) {
  const types = Object.entries(disastersByType).sort((a, b) => b[1] - a[1]);
  
  if (types.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted">
        <p>No disaster data available for the past 6 months</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(...types.map(t => t[1]), 1);
  const maxHeight = 220; // max height in pixels

  // Color palette for different disaster types
  const colorMap = {
    "drought": "#60a5fa", // blue
    "flooding": "#3b82f6", // darker blue
    "landslide": "#8b5cf6", // purple
    "storm": "#f59e0b", // amber
    "earthquake": "#ef4444", // red
    "disease": "#06b6d4", // cyan
    "wildfire": "#d84315", // deep orange
  };

  return (
    <div>
      <div className="h-64 flex items-end justify-around gap-2 px-4">
        {types.map(([type, count]) => {
          const height = (count / maxValue) * maxHeight;
          const color = colorMap[type.toLowerCase()] || "#3b82f6";
          
          return (
            <div key={type} className="text-center">
              <div
                className="w-8 rounded transition-all hover:opacity-75"
                style={{
                  height: `${Math.max(height, 20)}px`,
                  backgroundColor: color,
                }}
                title={`${type}: ${count} disasters`}
              ></div>
              <p className="text-xs text-muted mt-2 truncate max-w-16">{type}</p>
              <p className="text-xs font-semibold text-text">{count}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 justify-center mt-4 text-xs flex-wrap">
        {types.slice(0, 3).map(([type]) => {
          const color = colorMap[type.toLowerCase()] || "#3b82f6";
          return (
            <span key={type} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
              {type}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Financial Overview Chart Component ================= */
function FinancialOverviewChart({ financialByMonth }) {
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Parse month data and sort chronologically
  const months = Object.entries(financialByMonth)
    .map(([monthStr, amount]) => {
      const parts = monthStr.split('-');
      const monthName = parts[0];
      const monthIndex = monthOrder.indexOf(monthName);
      return { monthStr, monthName, amount, monthIndex };
    })
    .sort((a, b) => a.monthIndex - b.monthIndex);

  if (months.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted">
        <p>No financial data available for the past 6 months</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(...months.map(m => m.amount), 1);
  const maxHeight = 220; // max height in pixels
  
  // Format currency values
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `M ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `M ${(value / 1000).toFixed(1)}K`;
    }
    return `M ${value.toFixed(0)}`;
  };

  return (
    <div>
      <div className="h-64 flex items-end justify-around gap-2 px-4">
        {months.map(({ monthStr, monthName, amount }) => {
          const height = (amount / maxValue) * maxHeight;
          
          return (
            <div key={monthStr} className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded transition-all hover:opacity-75"
                style={{
                  height: `${Math.max(height, 20)}px`
                }}
                title={`${monthName}: ${formatCurrency(amount)}`}
              ></div>
              <p className="text-xs text-muted mt-2">{monthName}</p>
              <p className="text-xs font-semibold text-text">
                {amount >= 1000000 
                  ? `${(amount / 1000000).toFixed(1)}M` 
                  : `${(amount / 1000).toFixed(0)}K`}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 justify-center mt-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-400 rounded"></div> Total Expenses
        </span>
      </div>
    </div>
  );
}