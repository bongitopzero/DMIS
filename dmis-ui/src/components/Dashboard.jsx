import React, { useState, useEffect } from "react";
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
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDisasters();
    const interval = setInterval(fetchDisasters, 30000);
    return () => clearInterval(interval);
  }, []);

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
      bySeverity: { low: 0, medium: 0, high: 0 },
      byStatus: { reported: 0, verified: 0, responding: 0, closed: 0 }
    };

    disasters.forEach(d => {
      // Count by type
      stats.byType[d.type] = (stats.byType[d.type] || 0) + 1;
      
      // Count by district
      stats.byDistrict[d.district] = (stats.byDistrict[d.district] || 0) + 1;
      
      // Count by severity
      if (d.severity) {
        stats.bySeverity[d.severity] = (stats.bySeverity[d.severity] || 0) + 1;
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
    .map(([district, count]) => ({
      district,
      active: count,
      severity: count > 50 ? 'High' : count > 20 ? 'Moderate' : 'Low',
      riskColor: count > 50 ? 'critical' : count > 20 ? 'moderate' : 'low'
    }));

  const totalBudget = 9.8; // Example: M 9.8M
  const budgetUtilization = 48; // Example: 48%

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
          value={`M ${totalBudget}M`}
          subtitle="M 2.7M spent"
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
            <a href="#" className="text-xs text-blue-600 font-medium hover:underline">
              View All →
            </a>
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
          <div className="h-64 flex items-end justify-around gap-2 px-4">
            <div className="text-center">
              <div className="w-8 bg-moderate rounded" style={{ height: "120px" }}></div>
              <p className="text-xs text-muted mt-2">Jul</p>
            </div>
            <div className="text-center">
              <div className="w-8 bg-moderate rounded" style={{ height: "90px" }}></div>
              <p className="text-xs text-muted mt-2">Aug</p>
            </div>
            <div className="text-center">
              <div className="w-8 bg-low rounded" style={{ height: "110px" }}></div>
              <p className="text-xs text-muted mt-2">Sep</p>
            </div>
            <div className="text-center">
              <div className="w-8 bg-moderate rounded" style={{ height: "180px" }}></div>
              <p className="text-xs text-muted mt-2">Oct</p>
            </div>
            <div className="text-center">
              <div className="w-8 bg-moderate rounded" style={{ height: "200px" }}></div>
              <p className="text-xs text-muted mt-2">Nov</p>
            </div>
            <div className="text-center">
              <div className="w-8 bg-moderate rounded" style={{ height: "150px" }}></div>
              <p className="text-xs text-muted mt-2">Dec</p>
            </div>
          </div>
          <div className="flex gap-4 justify-center mt-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-moderate rounded"></div> Drought
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-moderate rounded"></div> Heavy Rainfall
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-low rounded"></div> Strong Winds
            </span>
          </div>
        </div>

        {/* Chart: Financial Overview */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-text mb-4">
            Financial Overview (6 Months)
          </h3>
          <div className="h-64 flex items-end justify-around gap-2 px-4">
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "80px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Jul</p>
            </div>
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "110px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Aug</p>
            </div>
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "140px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Sep</p>
            </div>
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "160px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Oct</p>
            </div>
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "190px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Nov</p>
            </div>
            <div className="text-center">
              <div
                className="w-8 bg-gradient-to-t from-blue-400 to-blue-300 rounded"
                style={{ height: "220px" }}
              ></div>
              <p className="text-xs text-muted mt-2">Dec</p>
            </div>
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
              {topDistricts.map((row, idx) => (
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
