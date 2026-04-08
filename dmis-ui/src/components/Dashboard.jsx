import React, { useState, useEffect, useCallback, useRef } from "react";
import MapView from "./MapView";
import RecentDisasters from "./RecentDisasters";
import API from "../api/axios";
import { ToastManager } from "./Toast";
import { AlertCircle, Users, DollarSign, TrendingUp, RefreshCw, Bell } from "lucide-react";

export default function Dashboard() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [fetchingDisasters, setFetchingDisasters] = useState(false);
  const [error, setError] = useState("");
  const [disastersByType, setDisastersByType] = useState({});
  const [financialByMonth, setFinancialByMonth] = useState({});
  const [overview, setOverview] = useState(null);
const [approvingId, setApprovingId] = useState(null); // tracks which disaster is being approved
  const [newSubmissions, setNewSubmissions] = useState([]);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ─── Data fetchers (stable references via useCallback) ────────────────────
  const fetchDisasters = useCallback(async () => {
    setFetchingDisasters(true);
    setError("");
    try {
      const res = await API.get("/disasters");
      const districtCoords = {
        "berea":         [-29.3, 28.3], "butha-buthe": [-29.1, 28.7],
        "leribe":        [-29.3, 28.0], "mafeteng":    [-29.7, 27.7],
        "maseru":        [-29.6, 27.5], "mohale's hoek": [-30.1, 28.1],
        "mokhotlong":    [-30.4, 29.3], "qacha's nek": [-30.7, 29.1],
        "quthing":       [-30.7, 28.9], "thaba tseka": [-29.5, 29.2],
      };
      const transformed = res.data.map((d) => {
        const coords = districtCoords[d.district?.toLowerCase()] || [-29.6, 27.5];
        return { ...d, latitude: d.latitude || coords[0], longitude: d.longitude || coords[1] };
      });
      setDisasters(transformed);
      setLastRefreshed(new Date());
      setSelectedDisaster((prev) => {
        if (!prev && transformed.length > 0) return transformed[0];
        if (prev) return transformed.find((d) => d._id === prev._id) || transformed[0] || null;
        return null;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load disasters");
      console.error("fetchDisasters:", err);
    } finally {
      setFetchingDisasters(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const [typeRes, finRes] = await Promise.all([
        API.get("/disasters/dashboard/by-type"),
        API.get("/disasters/dashboard/financial-summary"),
      ]);
      setDisastersByType(typeRes.data.data || {});
      setFinancialByMonth(finRes.data.data || {});
    } catch (err) {
      console.error("Dashboard stats:", err);
    }
  }, []);

  const fetchCoordinatorOverview = useCallback(async () => {
    try {
      const res = await API.get("/coordinator/overview");
      setOverview(res.data || null);
    } catch (err) {
      console.debug("Coordinator overview not available:", err?.message);
    }
  }, []);

  // ─── Track new submissions for notifications ──────────────────────────────
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    const pendingCount = disasters.filter((d) => d.status === "submitted").length;
    if (pendingCount > prevPendingCountRef.current && pendingCount > 0) {
      const newOnes = disasters.filter(d => d.status === "submitted").slice(0, pendingCount - prevPendingCountRef.current);
      setNewSubmissions(prev => [...newOnes, ...prev].slice(-3)); // keep last 3
      if (newOnes.length > 0) {
        // Play notification sound (if supported)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDq3/YR0jWiG9f8');
        audio.play().catch(() => {}); // silent fail if no audio context
        
      ToastManager.success(`${newOnes.length} new disaster${newOnes.length > 1 ? 's' : ''} submitted for approval!`, 5000);
      }
    }
    prevPendingCountRef.current = pendingCount;
  }, [disasters]);

  // ─── Mount + 30s poll ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchDisasters();
    fetchDashboardStats();
    fetchCoordinatorOverview();
    const id = setInterval(() => {
      fetchDisasters();
      fetchDashboardStats();
      fetchCoordinatorOverview();
    }, 10000); // Faster polling for real-time notifications
    return () => clearInterval(id);
  }, [fetchDisasters, fetchDashboardStats, fetchCoordinatorOverview]);

  const handleRefresh = () => {
    fetchDisasters();
    fetchDashboardStats();
    fetchCoordinatorOverview();
  };

  // ─── Approve disaster ─────────────────────────────────────────────────────
  const handleApproveDisaster = async (disasterId) => {
    setApprovingId(disasterId);
    try {
      await API.put(`/disasters/${disasterId}`, { status: "verified" });
      ToastManager.success("✅ Disaster approved successfully!");
      await fetchDisasters(); // immediately refresh so card disappears
    } catch (err) {
      console.error("Approve:", err);
      ToastManager.error(err.response?.data?.message || "Failed to approve disaster");
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Derived stats ────────────────────────────────────────────────────────
  const stats = disasters.reduce(
    (acc, d) => {
      acc.byType[d.type] = (acc.byType[d.type] || 0) + 1;
      if (d.district) acc.byDistrict[d.district] = (acc.byDistrict[d.district] || 0) + 1;
      const sev = d.severity?.toLowerCase() || "";
      if (sev.includes("critical") || (sev === "high" && d.status !== "closed")) acc.bySeverity.critical++;
      else if (sev.includes("high"))   acc.bySeverity.high++;
      else if (sev.includes("medium")) acc.bySeverity.medium++;
      else if (sev.includes("low"))    acc.bySeverity.low++;
      if (d.status) acc.byStatus[d.status] = (acc.byStatus[d.status] || 0) + 1;
      return acc;
    },
    { byType: {}, byDistrict: {}, bySeverity: { low:0,medium:0,high:0,critical:0 }, byStatus: { reported:0,submitted:0,verified:0,responding:0,closed:0 } }
  );

  const pendingDisasters = disasters.filter((d) => d.status === "submitted");

  const topDistricts = Object.entries(stats.byDistrict)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([district, count]) => {
      const dd = disasters.filter((d) => d.district === district);
      const hasCritical = dd.some((d) => d.severity?.toLowerCase().includes("critical") || (d.severity?.toLowerCase().includes("high") && d.status !== "closed"));
      const hasHigh     = dd.some((d) => d.severity?.toLowerCase().includes("high"));
      const riskLevel   = hasCritical ? "Critical" : hasHigh ? "High" : count > 3 ? "Moderate" : "Low";
      const riskColor   = hasCritical ? "critical" : (hasHigh || count > 3) ? "moderate" : "low";
      return { district, active: count, severity: riskLevel, riskColor };
    });

  const totalAllocated = disasters.reduce((s,d) => s + (parseFloat(d.allocatedBudget)||0), 0) / 1_000_000;
  const totalRequested = disasters.reduce((s,d) => s + (parseFloat(d.requestedBudget)||parseFloat(d.estimatedCost)||0), 0) / 1_000_000;
  const criticalCount  = disasters.filter((d) => d.severity?.toLowerCase().includes("critical") || (d.severity?.toLowerCase().includes("high") && d.status !== "closed")).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text" style={{ letterSpacing: "-0.3px" }}>Dashboard</h1>
          <p className="text-sm text-muted">
            National Disaster Overview
            {lastRefreshed && <span className="ml-2 text-xs text-slate-400">· Refreshed {lastRefreshed.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={fetchingDisasters}
          style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.4rem 0.9rem", backgroundColor:"white", border:"1px solid #e2e8f0", borderRadius:"0.5rem", cursor: fetchingDisasters?"not-allowed":"pointer", fontSize:"0.85rem", color:"#475569", opacity: fetchingDisasters?0.6:1 }}
        >
          <RefreshCw size={15} style={{ animation: fetchingDisasters ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Current Year Incidents" value={overview?.currentYear?.incidentsCount ?? disasters.length}
          subtitle={`${stats.byStatus.verified||0} verified · ${stats.byStatus.submitted||0} pending`}
          icon={<AlertCircle className="w-5 h-5 text-critical" />} bgColor="bg-red-50" />
        <SummaryCard title="Districts Affected" value={Object.keys(stats.byDistrict).length}
          subtitle={`${stats.bySeverity.high||0} high · ${stats.bySeverity.critical||0} critical`}
          icon={<Users className="w-5 h-5 text-blue-500" />} bgColor="bg-blue-50" />
        <SummaryCard title="Allocated Funds" value={totalAllocated > 0 ? `M ${totalAllocated.toFixed(1)}` : "M 0"}
          subtitle={totalRequested > 0 ? `Requested: M ${totalRequested.toFixed(1)}` : "No requests"}
          icon={<DollarSign className="w-5 h-5 text-green-500" />} bgColor="bg-green-50" />
        <SummaryCard title="Critical Disasters" value={criticalCount}
          subtitle={`${stats.byStatus.responding||0} active responses`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} bgColor="bg-emerald-50" />
      </div>

      {/* New Submissions Notification Banner */}
      {newSubmissions.length > 0 && !notificationDismissed && (
        <div style={{
          position: "relative",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          border: "1px solid #f59e0b",
          borderLeft: "4px solid #d97706",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 12px rgba(251, 191, 36, 0.3)",
          animation: "slideDown 0.4s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Bell size={20} style={{ color: "#b45309" }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#92400e", fontSize: "0.95rem" }}>
                {newSubmissions.length} new disaster{newSubmissions.length > 1 ? 's' : ''} awaiting your approval!
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#a16207" }}>
                Submitted by Data Clerk{newSubmissions.length > 1 ? 's' : ''} • Auto-refreshes every 10s
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotificationDismissed(true)}
            style={{
              position: "absolute",
              top: "0.5rem", right: "0.75rem",
              background: "none", border: "none",
              color: "#92400e", fontSize: "1.1rem",
              cursor: "pointer", padding: "0.25rem"
            }}
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Pending Approval ── */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            Pending Coordinator Approval
            {pendingDisasters.length > 0 && (
              <span style={{ backgroundColor:"#ef4444", color:"white", fontSize:"0.72rem", fontWeight:"700", borderRadius:"9999px", padding:"0.1rem 0.55rem" }}>
                {pendingDisasters.length}
              </span>
            )}
          </h2>
          <button onClick={handleRefresh} disabled={fetchingDisasters}
            style={{ fontSize:"0.8rem", color:"#2563eb", background:"none", border:"none", cursor:"pointer", opacity: fetchingDisasters?0.5:1 }}>
            {fetchingDisasters ? "Loading…" : "↺ Refresh list"}
          </button>
        </div>

        {error && (
          <div style={{ padding:"0.75rem", backgroundColor:"#fee2e2", borderRadius:"0.375rem", color:"#991b1b", fontSize:"0.875rem", marginBottom:"1rem" }}>
            {error}
          </div>
        )}

        {pendingDisasters.length === 0 ? (
          <div style={{ padding:"2rem", textAlign:"center", color:"#9ca3af", backgroundColor:"#f9fafb", borderRadius:"0.5rem", border:"1px dashed #e5e7eb" }}>
            <p style={{ margin:0, fontWeight:"500" }}>
              {fetchingDisasters ? "Loading disasters…" : "No disasters pending approval"}
            </p>
            <p style={{ margin:"0.5rem 0 0", fontSize:"0.8rem" }}>
              Disasters submitted by Data Clerks will appear here for approval
            </p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {pendingDisasters.map((disaster) => {
              const isApproving = approvingId === disaster._id;
              const sevColor =
                disaster.severity?.toLowerCase().includes("critical") ? "#B94A48"
                : disaster.severity?.toLowerCase().includes("high")   ? "#C9A227"
                : disaster.severity?.toLowerCase().includes("medium") ? "#4E8A64"
                : "#3b82f6";
              return (
                <div key={disaster._id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1.25rem", backgroundColor:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #f59e0b", borderRadius:"0.5rem", gap:"1rem" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:"600", color:"#1f2937", margin:"0 0 0.25rem", fontSize:"0.95rem" }}>
                      {disaster.type?.replace(/_/g," ").toUpperCase()} — {disaster.district}
                    </p>
                    <p style={{ fontSize:"0.8rem", color:"#6b7280", margin:0 }}>
                      {disaster.numberOfHouseholdsAffected || 0} household(s) &nbsp;·&nbsp;
                      Severity: <span style={{ color:sevColor, fontWeight:"600", textTransform:"capitalize" }}>{disaster.severity}</span>
                      &nbsp;·&nbsp; Submitted {new Date(disaster.updatedAt || disaster.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproveDisaster(disaster._id)}
                    disabled={approvingId !== null}
                    style={{
                      padding:"0.5rem 1.25rem",
                      backgroundColor: isApproving ? "#94a3b8" : "#1e3a5f",
                      color:"white", border:"none", borderRadius:"0.375rem",
                      cursor: approvingId !== null ? "not-allowed" : "pointer",
                      fontSize:"0.875rem", fontWeight:"600", whiteSpace:"nowrap", minWidth:"110px",
                    }}
                  >
                    {isApproving ? "Approving…" : "✓ Approve"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Map + Recent Disasters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h2 className="text-lg font-semibold text-text mb-3">Disaster Locations</h2>
          <div className="h-96 rounded-lg overflow-hidden bg-slate-100">
            <MapView disasters={disasters} selectedDisaster={selectedDisaster} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h2 className="text-lg font-semibold text-text mb-4">Recent Disasters</h2>
          <RecentDisasters disasters={disasters} selectedDisaster={selectedDisaster} onSelectDisaster={setSelectedDisaster} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">Disasters by Type (6 Months)</h3>
          <DisastersByTypeChart disastersByType={disastersByType} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">Financial Overview (6 Months)</h3>
          <FinancialOverviewChart financialByMonth={financialByMonth} />
        </div>
      </div>

      {/* District Risk Table */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 mt-6">
        <h3 className="text-lg font-semibold text-text mb-4">District Risk Assessment</h3>
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
              {topDistricts.length > 0 ? topDistricts.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 text-text font-medium">{row.district}</td>
                  <td className="py-3 px-3 text-text">{row.active} incidents</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                      style={{ backgroundColor: row.riskColor==="critical"?"#B94A48":row.riskColor==="moderate"?"#C9A227":"#4E8A64" }}>
                      {row.severity}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="py-4 text-center text-muted">No district data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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

function DisastersByTypeChart({ disastersByType }) {
  const types = Object.entries(disastersByType).sort((a, b) => b[1] - a[1]);
  if (types.length === 0) return <div className="h-64 flex items-center justify-center text-muted"><p>No disaster data available for the past 6 months</p></div>;
  const maxValue = Math.max(...types.map((t) => t[1]), 1);
  const colorMap = { drought:"#60a5fa", flooding:"#3b82f6", landslide:"#8b5cf6", storm:"#f59e0b", earthquake:"#ef4444", disease:"#06b6d4", wildfire:"#d84315", heavy_rainfall:"#0ea5e9", strong_winds:"#a78bfa" };
  return (
    <div>
      <div className="h-64 flex items-end justify-around gap-2 px-4">
        {types.map(([type, count]) => {
          const height = (count / maxValue) * 220;
          const color  = colorMap[type.toLowerCase()] || "#3b82f6";
          return (
            <div key={type} className="text-center">
              <div className="w-8 rounded transition-all hover:opacity-75" style={{ height:`${Math.max(height,20)}px`, backgroundColor:color }} title={`${type}: ${count}`} />
              <p className="text-xs text-muted mt-2 truncate max-w-16">{type.replace(/_/g," ")}</p>
              <p className="text-xs font-semibold text-text">{count}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 justify-center mt-4 text-xs flex-wrap">
        {types.slice(0,4).map(([type]) => (
          <span key={type} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colorMap[type.toLowerCase()]||"#3b82f6" }} />
            {type.replace(/_/g," ")}
          </span>
        ))}
      </div>
    </div>
  );
}

function FinancialOverviewChart({ financialByMonth }) {
  const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = Object.entries(financialByMonth)
    .map(([monthStr, amount]) => ({ monthStr, monthName: monthStr.split("-")[0], amount, monthIndex: monthOrder.indexOf(monthStr.split("-")[0]) }))
    .sort((a, b) => a.monthIndex - b.monthIndex);
  if (months.length === 0) return <div className="h-64 flex items-center justify-center text-muted"><p>No financial data available</p></div>;
  const maxValue = Math.max(...months.map((m) => m.amount), 1);
  return (
    <div>
      <div className="h-64 flex items-end justify-around gap-2 px-4">
        {months.map(({ monthStr, monthName, amount }) => (
          <div key={monthStr} className="text-center">
            <div className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded transition-all hover:opacity-75" style={{ height:`${Math.max((amount/maxValue)*220, 20)}px` }} title={`${monthName}: ${amount}`} />
            <p className="text-xs text-muted mt-2">{monthName}</p>
            <p className="text-xs font-semibold text-text">{amount>=1_000_000?`${(amount/1_000_000).toFixed(1)}M`:`${(amount/1_000).toFixed(0)}K`}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-4 justify-center mt-4 text-xs">
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded" /> Total Expenses</span>
      </div>
    </div>
  );
}