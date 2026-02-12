import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  MapPin,
  Download,
  Plus,
  X,
  Calendar,
  PieChart,
  Activity,
  Layers,
} from "lucide-react";

export default function Analysis() {
  const [disasters, setDisasters] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overall");
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const tabs = [
    { id: "overall", name: "Overall Analysis", icon: Layers },
    { id: "disaster", name: "Disaster Analysis", icon: AlertTriangle },
    { id: "funds", name: "Funds Analysis", icon: DollarSign },
    { id: "custom", name: "Custom Analysis", icon: PieChart },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [disasterRes, fundRes] = await Promise.all([
        API.get("/disasters"),
        API.get("/funds"),
      ]);
      setDisasters(disasterRes.data);
      setFunds(fundRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalDisasters: disasters.length,
    activeDisasters: disasters.filter((d) => d.status === "Active").length,
    totalFunds: funds.reduce((sum, f) => sum + (f.amount || 0), 0),
    allocatedFunds: funds
      .filter((f) => f.status === "Allocated")
      .reduce((sum, f) => sum + (f.amount || 0), 0),
    availableFunds: funds
      .filter((f) => f.status === "Available")
      .reduce((sum, f) => sum + (f.amount || 0), 0),
    pendingFunds: funds
      .filter((f) => f.status === "Pending")
      .reduce((sum, f) => sum + (f.amount || 0), 0),
    avgResponseTime:
      disasters.length > 0
        ? disasters.reduce((sum, d) => {
            const reported = new Date(d.dateReported);
            const resolved = d.dateResolved
              ? new Date(d.dateResolved)
              : new Date();
            return sum + (resolved - reported) / (1000 * 60 * 60 * 24);
          }, 0) / disasters.length
        : 0,
    severityBreakdown: disasters.reduce(
      (acc, d) => {
        acc[d.severity] = (acc[d.severity] || 0) + 1;
        return acc;
      },
      { Low: 0, Medium: 0, High: 0, Critical: 0 }
    ),
    districtBreakdown: disasters.reduce((acc, d) => {
      acc[d.district] = (acc[d.district] || 0) + 1;
      return acc;
    }, {}),
    typeBreakdown: disasters.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {}),
    statusBreakdown: disasters.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {}),
  };

  const exportAnalysis = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      activeTab,
      dateRange,
      statistics: stats,
      disasters,
      funds,
      selectedComponents,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dmis-analysis-${activeTab}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
  };

  const toggleComponent = (componentId) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Analysis</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive analysis of the disaster management system
          </p>
        </div>
        <button
          onClick={exportAnalysis}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overall" && <OverallAnalysis stats={stats} disasters={disasters} funds={funds} />}
      {activeTab === "disaster" && <DisasterAnalysis stats={stats} disasters={disasters} />}
      {activeTab === "funds" && <FundsAnalysis stats={stats} funds={funds} disasters={disasters} />}
      {activeTab === "custom" && (
        <CustomAnalysis
          selectedComponents={selectedComponents}
          toggleComponent={toggleComponent}
          dateRange={dateRange}
          setDateRange={setDateRange}
          exportAnalysis={exportAnalysis}
        />
      )}
    </div>
  );
}

// Overall Analysis Component
function OverallAnalysis({ stats, disasters, funds }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Disasters"
          value={stats.totalDisasters}
          subtitle={`${stats.activeDisasters} active`}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Total Funds"
          value={`M${stats.totalFunds.toLocaleString()}`}
          subtitle={`M${stats.allocatedFunds.toLocaleString()} allocated`}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${stats.avgResponseTime.toFixed(1)} days`}
          subtitle="Average resolution time"
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Districts Affected"
          value={Object.keys(stats.districtBreakdown).length}
          subtitle="out of 10 districts"
          icon={MapPin}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeverityChart severityBreakdown={stats.severityBreakdown} total={stats.totalDisasters} />
        <DisasterTypesChart typeBreakdown={stats.typeBreakdown} total={stats.totalDisasters} />
      </div>

      {/* District Analysis */}
      <DistrictMap districtBreakdown={stats.districtBreakdown} total={stats.totalDisasters} />

      {/* Recent Timeline */}
      <RecentTimeline disasters={disasters} />
    </div>
  );
}

// Disaster Analysis Component
function DisasterAnalysis({ stats, disasters }) {
  return (
    <div className="space-y-6">
      {/* Disaster-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Disasters"
          value={stats.totalDisasters}
          subtitle="All recorded"
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Active"
          value={stats.activeDisasters}
          subtitle={`${((stats.activeDisasters / stats.totalDisasters) * 100).toFixed(1)}%`}
          icon={Activity}
          color="orange"
        />
        <MetricCard
          title="Resolved"
          value={stats.statusBreakdown.Resolved || 0}
          subtitle="Completed"
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Avg Response"
          value={`${stats.avgResponseTime.toFixed(1)}`}
          subtitle="days"
          icon={Calendar}
          color="blue"
        />
      </div>

      {/* Severity & Type Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeverityChart severityBreakdown={stats.severityBreakdown} total={stats.totalDisasters} />
        <DisasterTypesChart typeBreakdown={stats.typeBreakdown} total={stats.totalDisasters} />
      </div>

      {/* Status Breakdown */}
      <StatusBreakdown statusBreakdown={stats.statusBreakdown} total={stats.totalDisasters} />

      {/* District Breakdown */}
      <DistrictMap districtBreakdown={stats.districtBreakdown} total={stats.totalDisasters} />

      {/* Detailed List */}
      <DisasterDetailsList disasters={disasters} />
    </div>
  );
}

// Funds Analysis Component
function FundsAnalysis({ stats, funds, disasters }) {
  const fundsBySource = funds.reduce((acc, f) => {
    acc[f.source] = (acc[f.source] || 0) + f.amount;
    return acc;
  }, {});

  const fundsByPurpose = funds.reduce((acc, f) => {
    acc[f.purpose] = (acc[f.purpose] || 0) + f.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Funds"
          value={`M${stats.totalFunds.toLocaleString()}`}
          subtitle="All funds"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Allocated"
          value={`M${stats.allocatedFunds.toLocaleString()}`}
          subtitle={`${((stats.allocatedFunds / stats.totalFunds) * 100).toFixed(1)}%`}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Available"
          value={`M${stats.availableFunds.toLocaleString()}`}
          subtitle="Ready to use"
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Pending"
          value={`M${stats.pendingFunds.toLocaleString()}`}
          subtitle="In process"
          icon={Calendar}
          color="orange"
        />
      </div>

      {/* Fund Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FundsBySourceChart fundsBySource={fundsBySource} total={stats.totalFunds} />
        <FundsByPurposeChart fundsByPurpose={fundsByPurpose} total={stats.totalFunds} />
      </div>

      {/* Fund Status */}
      <FundStatusBreakdown funds={funds} />

      {/* Fund Details Table */}
      <FundDetailsList funds={funds} />
    </div>
  );
}

// Custom Analysis Component
function CustomAnalysis({
  selectedComponents,
  toggleComponent,
  dateRange,
  setDateRange,
  exportAnalysis,
}) {
  const availableComponents = [
    { id: "disaster-trends", name: "Disaster Trends", icon: TrendingUp },
    { id: "financial-overview", name: "Financial Overview", icon: DollarSign },
    { id: "severity-distribution", name: "Severity Distribution", icon: AlertTriangle },
    { id: "district-analysis", name: "District Analysis", icon: MapPin },
    { id: "timeline-analysis", name: "Timeline Analysis", icon: Calendar },
    { id: "status-breakdown", name: "Status Breakdown", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-indigo-600" />
          Build Your Custom Analysis
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Select components and date range to create a personalized analysis report
        </p>

        {/* Component Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {availableComponents.map((component) => {
            const Icon = component.icon;
            const isSelected = selectedComponents.includes(component.id);
            return (
              <button
                key={component.id}
                onClick={() => toggleComponent(component.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={isSelected ? "text-blue-600" : "text-slate-600"}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-blue-900" : "text-slate-700"
                    }`}
                  >
                    {component.name}
                  </span>
                  {isSelected && (
                    <div className="ml-auto bg-blue-600 rounded-full p-1">
                      <Plus size={12} className="text-white rotate-45" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Date Range */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Selected Components */}
        {selectedComponents.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Selected Components ({selectedComponents.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedComponents.map((id) => {
                const component = availableComponents.find((c) => c.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <span>{component.name}</span>
                    <button
                      onClick={() => toggleComponent(id)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={exportAnalysis}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Download size={18} />
              Generate Custom Report
            </button>
          </div>
        )}

        {selectedComponents.length === 0 && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-600">
              Select at least one component to generate your custom report
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Components

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function SeverityChart({ severityBreakdown, total }) {
  const colors = {
    Critical: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-orange-600" />
        Severity Distribution
      </h2>
      <div className="space-y-3">
        {Object.entries(severityBreakdown).map(([severity, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={severity}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{severity}</span>
                <span className="font-semibold text-slate-900">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`${colors[severity]} h-2 rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisasterTypesChart({ typeBreakdown, total }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-600" />
        Disaster Types
      </h2>
      <div className="space-y-3">
        {Object.entries(typeBreakdown)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{type}</span>
                  <span className="font-semibold text-slate-900">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function DistrictMap({ districtBreakdown, total }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <MapPin size={20} className="text-purple-600" />
        District Analysis
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(districtBreakdown)
          .sort(([, a], [, b]) => b - a)
          .map(([district, count]) => (
            <div
              key={district}
              className="p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              <p className="text-sm text-slate-600">{district}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
              <p className="text-xs text-slate-500">
                {total > 0 ? ((count / total) * 100).toFixed(1) : 0}%
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function RecentTimeline({ disasters }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-teal-600" />
        Recent Disaster Timeline
      </h2>
      <div className="space-y-4">
        {disasters
          .sort((a, b) => new Date(b.dateReported) - new Date(a.dateReported))
          .slice(0, 5)
          .map((disaster) => (
            <div
              key={disaster._id}
              className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0"
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 ${
                  disaster.status === "Active"
                    ? "bg-red-500"
                    : disaster.status === "Resolved"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
              ></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {disaster.type}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      disaster.severity === "Critical"
                        ? "bg-red-100 text-red-700"
                        : disaster.severity === "High"
                        ? "bg-orange-100 text-orange-700"
                        : disaster.severity === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {disaster.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {disaster.district} • {disaster.casualties || 0} casualties •
                  Affected: {disaster.affectedPopulation || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Reported: {new Date(disaster.dateReported).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function StatusBreakdown({ statusBreakdown, total }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Activity size={20} className="text-indigo-600" />
        Status Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusBreakdown).map(([status, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={status} className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{status}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
              <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisasterDetailsList({ disasters }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Detailed Disaster Records
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                District
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Severity
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Casualties
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Date Reported
              </th>
            </tr>
          </thead>
          <tbody>
            {disasters.slice(0, 10).map((disaster) => (
              <tr key={disaster._id} className="border-b border-slate-100">
                <td className="px-4 py-3">{disaster.type}</td>
                <td className="px-4 py-3">{disaster.district}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      disaster.severity === "Critical"
                        ? "bg-red-100 text-red-700"
                        : disaster.severity === "High"
                        ? "bg-orange-100 text-orange-700"
                        : disaster.severity === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {disaster.severity}
                  </span>
                </td>
                <td className="px-4 py-3">{disaster.status}</td>
                <td className="px-4 py-3">{disaster.casualties || 0}</td>
                <td className="px-4 py-3">
                  {new Date(disaster.dateReported).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundsBySourceChart({ fundsBySource, total }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-green-600" />
        Funds by Source
      </h2>
      <div className="space-y-3">
        {Object.entries(fundsBySource)
          .sort(([, a], [, b]) => b - a)
          .map(([source, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{source}</span>
                  <span className="font-semibold text-slate-900">
                    M{amount.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function FundsByPurposeChart({ fundsByPurpose, total }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-purple-600" />
        Funds by Purpose
      </h2>
      <div className="space-y-3">
        {Object.entries(fundsByPurpose)
          .sort(([, a], [, b]) => b - a)
          .map(([purpose, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={purpose}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{purpose}</span>
                  <span className="font-semibold text-slate-900">
                    M{amount.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function FundStatusBreakdown({ funds }) {
  const statusCounts = funds.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + f.amount;
    return acc;
  }, {});

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Activity size={20} className="text-blue-600" />
        Fund Status Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusCounts).map(([status, amount]) => (
          <div key={status} className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">{status}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              M{amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundDetailsList({ funds }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Fund Details
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Source
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Amount (M)
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Purpose
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {funds.slice(0, 10).map((fund) => (
              <tr key={fund._id} className="border-b border-slate-100">
                <td className="px-4 py-3">{fund.source}</td>
                <td className="px-4 py-3">M{fund.amount.toLocaleString()}</td>
                <td className="px-4 py-3">{fund.purpose}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      fund.status === "Available"
                        ? "bg-green-100 text-green-700"
                        : fund.status === "Allocated"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {fund.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {new Date(fund.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
