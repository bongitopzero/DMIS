import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  MapPin,
  Users,
  Download,
  Plus,
  X,
  Calendar,
  PieChart,
  Activity,
  Layers,
} from "lucide-react";

export default function Analysis() {
  const POPULATION = 2300000;
  const [disasters, setDisasters] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overall");
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showPreview, setShowPreview] = useState(false);

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

  const parseRangeValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (trimmed.includes("+")) {
      const numeric = Number.parseInt(trimmed.replace("+", ""), 10);
      return Number.isFinite(numeric) ? numeric : 0;
    }
    const parts = trimmed.split("-").map((part) => Number.parseInt(part, 10));
    if (parts.length === 2 && parts.every((num) => Number.isFinite(num))) {
      return Math.round((parts[0] + parts[1]) / 2);
    }
    const numeric = Number.parseInt(trimmed, 10);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const getIncidentAffectedCount = (incident) => {
    const exact = Number(incident?.totalAffectedPopulation);
    if (Number.isFinite(exact) && exact > 0) return exact;
    const affectedRange = parseRangeValue(incident?.affectedPopulation);
    if (affectedRange > 0) return affectedRange;
    const households = parseRangeValue(incident?.households);
    return households > 0 ? households * 5 : 0;
  };

  const normalizeValue = (value) =>
    (value ?? "").toString().toLowerCase().trim();

  // Calculate statistics
  const stats = {
    totalDisasters: disasters.length,
    activeDisasters: disasters.filter(
      (d) => normalizeValue(d.status) !== "closed"
    ).length,
    totalFunds: funds.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0),
    allocatedFunds: funds.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0),
    availableFunds: funds.reduce(
      (sum, f) => sum + ((f.allocatedAmount || 0) - (f.expenses || 0)),
      0
    ),
    pendingFunds: funds
      .filter((f) => normalizeValue(f.status) === "pending")
      .reduce((sum, f) => sum + (f.allocatedAmount || 0), 0),
    avgResponseTime:
      disasters.filter((d) => normalizeValue(d.status) === "closed").length > 0
        ? disasters
            .filter((d) => normalizeValue(d.status) === "closed")
            .reduce((sum, d) => {
              const reported = new Date(d.createdAt || d.date || Date.now());
              const resolved = new Date(d.updatedAt || d.createdAt || Date.now());
              return sum + (resolved - reported) / (1000 * 60 * 60 * 24);
            }, 0) /
          disasters.filter((d) => normalizeValue(d.status) === "closed").length
        : 0,
    estimatedAffectedPopulation: disasters.reduce((sum, d) => sum + getIncidentAffectedCount(d), 0),
    affectedPer100k: 0,
    severityBreakdown: disasters.reduce(
      (acc, d) => {
        const severity = normalizeValue(d.severity) || "unknown";
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, unknown: 0 }
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
      const status = normalizeValue(d.status) || "reported";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}),
  };

  stats.affectedPer100k = POPULATION > 0
    ? Math.round((stats.estimatedAffectedPopulation / POPULATION) * 100000)
    : 0;

  const buildMonthlySeries = (items) => {
    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - idx));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString("default", { month: "short" }),
      };
    });

    const counts = months.reduce((acc, month) => {
      acc[month.key] = 0;
      return acc;
    }, {});

    items.forEach((item) => {
      const date = new Date(item.createdAt || item.date || Date.now());
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (key in counts) {
        counts[key] += 1;
      }
    });

    return months.map((month) => ({ label: month.label, value: counts[month.key] || 0 }));
  };

  const monthlyIncidentSeries = buildMonthlySeries(disasters);
  const topDistrictSeries = Object.entries(stats.districtBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

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
      {activeTab === "overall" && (
        <OverallAnalysis
          stats={stats}
          disasters={disasters}
          funds={funds}
          monthlyIncidentSeries={monthlyIncidentSeries}
          topDistrictSeries={topDistrictSeries}
        />
      )}
      {activeTab === "disaster" && (
        <DisasterAnalysis
          stats={stats}
          disasters={disasters}
          monthlyIncidentSeries={monthlyIncidentSeries}
          topDistrictSeries={topDistrictSeries}
        />
      )}
      {activeTab === "funds" && <FundsAnalysis stats={stats} funds={funds} disasters={disasters} />}
      {activeTab === "custom" && (
        <CustomAnalysis
          selectedComponents={selectedComponents}
          toggleComponent={toggleComponent}
          dateRange={dateRange}
          setDateRange={setDateRange}
          exportAnalysis={exportAnalysis}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          stats={stats}
          disasters={disasters}
          funds={funds}
        />
      )}
    </div>
  );
}

// Overall Analysis Component
function OverallAnalysis({ stats, disasters, funds, monthlyIncidentSeries, topDistrictSeries }) {
  const severitySeries = Object.entries(stats.severityBreakdown).map(([label, value]) => ({
    label,
    value,
    color:
      label === "high"
        ? "#ef4444"
        : label === "medium"
        ? "#f59e0b"
        : label === "low"
        ? "#22c55e"
        : "#94a3b8",
  }));

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
          title="Affected per 100k"
          value={stats.affectedPer100k.toLocaleString()}
          subtitle="Estimated population impact"
          icon={Users}
          color="purple"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineTrendChart
          title="Incident Trend (6 Months)"
          series={monthlyIncidentSeries}
          color="#2563eb"
        />
        <VerticalBarChart
          title="Top Districts (Incidents)"
          series={topDistrictSeries}
          color="#9333ea"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaTrendChart
          title="Incident Volume (Area)"
          series={monthlyIncidentSeries}
          color="#0ea5e9"
        />
        <DonutChart
          title="Severity Mix"
          series={severitySeries}
        />
      </div>

      {/* District Analysis */}
      <DistrictMap districtBreakdown={stats.districtBreakdown} total={stats.totalDisasters} />

      {/* Recent Timeline */}
      <RecentTimeline disasters={disasters} />
    </div>
  );
}

// Disaster Analysis Component
function DisasterAnalysis({ stats, disasters, monthlyIncidentSeries, topDistrictSeries }) {
  const severitySeries = Object.entries(stats.severityBreakdown).map(([label, value]) => ({
    label,
    value,
    color:
      label === "high"
        ? "#ef4444"
        : label === "medium"
        ? "#f59e0b"
        : label === "low"
        ? "#22c55e"
        : "#94a3b8",
  }));

  const resolvedCount = stats.statusBreakdown.closed || 0;
  const activeRate = stats.totalDisasters > 0
    ? ((stats.activeDisasters / stats.totalDisasters) * 100).toFixed(1)
    : "0.0";

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
          subtitle={`${activeRate}%`}
          icon={Activity}
          color="orange"
        />
        <MetricCard
          title="Resolved"
          value={resolvedCount}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineTrendChart
          title="Incident Trend (6 Months)"
          series={monthlyIncidentSeries}
          color="#0ea5e9"
        />
        <VerticalBarChart
          title="Top Districts (Incidents)"
          series={topDistrictSeries}
          color="#f97316"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaTrendChart
          title="Incident Volume (Area)"
          series={monthlyIncidentSeries}
          color="#38bdf8"
        />
        <DonutChart
          title="Severity Mix"
          series={severitySeries}
        />
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
    acc[f.location] = (acc[f.location] || 0) + (f.allocatedAmount || 0);
    return acc;
  }, {});

  const fundsByPurpose = funds.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + (f.allocatedAmount || 0);
    return acc;
  }, {});

  const sourceSeries = Object.entries(fundsBySource)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, color: "#10b981" }));

  const purposeSeries = Object.entries(fundsByPurpose).map(([label, value]) => ({
    label,
    value,
    color:
      String(label).toLowerCase() === "approved"
        ? "#22c55e"
        : String(label).toLowerCase() === "pending"
        ? "#f59e0b"
        : "#94a3b8",
  }));

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
          subtitle={`${stats.totalFunds > 0 ? ((stats.allocatedFunds / stats.totalFunds) * 100).toFixed(1) : "0.0"}%`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChart
          title="Top Funding Sources"
          series={sourceSeries}
        />
        <DonutChart
          title="Funds by Status"
          series={purposeSeries}
        />
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
  showPreview,
  setShowPreview,
  stats,
  disasters,
  funds,
}) {
  const availableComponents = [
    { id: "disaster-trends", name: "Disaster Trends", icon: TrendingUp, description: "View disaster occurrence patterns over time" },
    { id: "financial-overview", name: "Financial Overview", icon: DollarSign, description: "Comprehensive fund allocation and spending analysis" },
    { id: "severity-distribution", name: "Severity Distribution", icon: AlertTriangle, description: "Breakdown of disasters by severity levels" },
    { id: "district-analysis", name: "District Analysis", icon: MapPin, description: "Geographic distribution of disasters" },
    { id: "timeline-analysis", name: "Timeline Analysis", icon: Calendar, description: "Recent disaster timeline and trends" },
    { id: "status-breakdown", name: "Status Breakdown", icon: Activity, description: "Current status of all disasters" },
    { id: "incident-trend", name: "Incident Trend (Line)", icon: TrendingUp, description: "Line chart of recent incident trend" },
    { id: "incident-area", name: "Incident Trend (Area)", icon: TrendingUp, description: "Area chart of recent incident volume" },
    { id: "district-bars", name: "Top Districts (Bars)", icon: BarChart3, description: "Vertical bars for top districts" },
    { id: "severity-donut", name: "Severity Mix (Donut)", icon: PieChart, description: "Donut chart of severity distribution" },
    { id: "funds-sources-bars", name: "Top Funding Sources", icon: BarChart3, description: "Horizontal bar chart of funding sources" },
    { id: "funds-status-donut", name: "Funds by Status (Donut)", icon: PieChart, description: "Donut chart of fund status" },
  ];

  // Filter data by date range if specified
  const getFilteredData = () => {
    let filteredDisasters = disasters;
    let filteredFunds = funds;

    if (dateRange.start) {
      filteredDisasters = filteredDisasters.filter(
        d => new Date(d.createdAt || d.date || Date.now()) >= new Date(dateRange.start)
      );
      filteredFunds = filteredFunds.filter(
        f => new Date(f.createdAt) >= new Date(dateRange.start)
      );
    }

    if (dateRange.end) {
      filteredDisasters = filteredDisasters.filter(
        d => new Date(d.createdAt || d.date || Date.now()) <= new Date(dateRange.end)
      );
      filteredFunds = filteredFunds.filter(
        f => new Date(f.createdAt) <= new Date(dateRange.end)
      );
    }

    return { filteredDisasters, filteredFunds };
  };

  const { filteredDisasters, filteredFunds } = getFilteredData();

  const buildMonthlySeries = (items) => {
    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - idx));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString("default", { month: "short" }),
      };
    });

    const counts = months.reduce((acc, month) => {
      acc[month.key] = 0;
      return acc;
    }, {});

    items.forEach((item) => {
      const date = new Date(item.createdAt || item.date || Date.now());
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (key in counts) {
        counts[key] += 1;
      }
    });

    return months.map((month) => ({ label: month.label, value: counts[month.key] || 0 }));
  };

  const monthlySeries = buildMonthlySeries(filteredDisasters);
  const topDistrictSeries = Object.entries(stats.districtBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const severitySeries = Object.entries(stats.severityBreakdown).map(([label, value]) => ({
    label,
    value,
    color:
      label === "high"
        ? "#ef4444"
        : label === "medium"
        ? "#f59e0b"
        : label === "low"
        ? "#22c55e"
        : "#94a3b8",
  }));

  const fundsBySource = filteredFunds.reduce((acc, f) => {
    acc[f.location] = (acc[f.location] || 0) + (f.allocatedAmount || 0);
    return acc;
  }, {});

  const fundsByPurpose = filteredFunds.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + (f.allocatedAmount || 0);
    return acc;
  }, {});

  const sourceSeries = Object.entries(fundsBySource)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, color: "#10b981" }));

  const purposeSeries = Object.entries(fundsByPurpose).map(([label, value]) => ({
    label,
    value,
    color:
      String(label).toLowerCase() === "approved"
        ? "#22c55e"
        : String(label).toLowerCase() === "pending"
        ? "#f59e0b"
        : "#94a3b8",
  }));

  // Calculate filtered stats
  const filteredStats = {
    ...stats,
    totalDisasters: filteredDisasters.length,
    totalFunds: filteredFunds.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0),
  };

  const renderPreviewComponent = (componentId) => {
    switch (componentId) {
      case "disaster-trends":
        return <DisasterTypesChart typeBreakdown={stats.typeBreakdown} total={filteredDisasters.length} />;
      case "financial-overview":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total Funds"
                value={`M${filteredStats.totalFunds.toLocaleString()}`}
                subtitle="All funds"
                icon={DollarSign}
                color="green"
              />
              <MetricCard
                title="Allocated"
                value={`M${stats.allocatedFunds.toLocaleString()}`}
                subtitle="Currently allocated"
                icon={TrendingUp}
                color="blue"
              />
              <MetricCard
                title="Available"
                value={`M${stats.availableFunds.toLocaleString()}`}
                subtitle="Ready for use"
                icon={DollarSign}
                color="purple"
              />
            </div>
            <FundStatusBreakdown funds={filteredFunds} />
          </div>
        );
      case "severity-distribution":
        return <SeverityChart severityBreakdown={stats.severityBreakdown} total={filteredDisasters.length} />;
      case "district-analysis":
        return <DistrictMap districtBreakdown={stats.districtBreakdown} total={filteredDisasters.length} />;
      case "timeline-analysis":
        return <RecentTimeline disasters={filteredDisasters} />;
      case "status-breakdown":
        return <StatusBreakdown statusBreakdown={stats.statusBreakdown} total={filteredDisasters.length} />;
      case "incident-trend":
        return <LineTrendChart title="Incident Trend (6 Months)" series={monthlySeries} color="#2563eb" />;
      case "incident-area":
        return <AreaTrendChart title="Incident Volume (Area)" series={monthlySeries} color="#0ea5e9" />;
      case "district-bars":
        return <VerticalBarChart title="Top Districts (Incidents)" series={topDistrictSeries} color="#9333ea" />;
      case "severity-donut":
        return <DonutChart title="Severity Mix" series={severitySeries} />;
      case "funds-sources-bars":
        return <HorizontalBarChart title="Top Funding Sources" series={sourceSeries} />;
      case "funds-status-donut":
        return <DonutChart title="Funds by Status" series={purposeSeries} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-indigo-600" />
          Build Your Custom Analysis Report
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Select components and date range to create a personalized analysis report. Preview your selections before exporting.
        </p>

        {/* Component Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Available Components
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableComponents.map((component) => {
              const Icon = component.icon;
              const isSelected = selectedComponents.includes(component.id);
              return (
                <button
                  key={component.id}
                  onClick={() => toggleComponent(component.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
                      <Icon
                        size={20}
                        className={isSelected ? "text-blue-600" : "text-slate-600"}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-blue-900" : "text-slate-700"
                          }`}
                        >
                          {component.name}
                        </span>
                        {isSelected && (
                          <div className="bg-blue-600 rounded-full p-1">
                            <Plus size={12} className="text-white rotate-45" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {component.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Date Range (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
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
        </div>

        {/* Selected Components Summary */}
        {selectedComponents.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Selected Components ({selectedComponents.length})
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedComponents.map((id) => {
                const component = availableComponents.find((c) => c.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-full text-sm"
                  >
                    <span className="text-blue-900 font-medium">{component.name}</span>
                    <button
                      onClick={() => toggleComponent(id)}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition"
                    >
                      <X size={14} className="text-blue-600" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
              >
                <Activity size={18} />
                {showPreview ? "Hide Preview" : "Preview Report"}
              </button>
              <button
                onClick={exportAnalysis}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Download size={18} />
                Export Report
              </button>
            </div>
          </div>
        )}

        {selectedComponents.length === 0 && (
          <div className="p-6 bg-slate-50 rounded-lg text-center border-2 border-dashed border-slate-300">
            <PieChart size={48} className="text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              No Components Selected
            </p>
            <p className="text-sm text-slate-600">
              Select at least one component above to generate your custom analysis report
            </p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {showPreview && selectedComponents.length > 0 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Activity size={24} />
              Custom Analysis Preview
            </h2>
            <p className="text-blue-100">
              Preview of your selected components • {filteredDisasters.length} disasters • M{filteredStats.totalFunds.toLocaleString()} total funds
              {dateRange.start && ` • From ${new Date(dateRange.start).toLocaleDateString()}`}
              {dateRange.end && ` to ${new Date(dateRange.end).toLocaleDateString()}`}
            </p>
          </div>

          {/* Render selected components */}
          {selectedComponents.map((componentId) => (
            <div key={componentId}>
              {renderPreviewComponent(componentId)}
            </div>
          ))}

          {/* Export Button at Bottom */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ready to Export?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Export this report as a JSON file for further analysis or documentation
                </p>
              </div>
              <button
                onClick={exportAnalysis}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
              >
                <Download size={18} />
                Export Now
              </button>
            </div>
          </div>
        </div>
      )}
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
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
    unknown: "bg-slate-400",
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
          const label = severity.charAt(0).toUpperCase() + severity.slice(1);
          return (
            <div key={severity}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{label}</span>
                <span className="font-semibold text-slate-900">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`${colors[severity] || "bg-slate-400"} h-2 rounded-full transition-all`}
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
  const series = Object.entries(typeBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-600" />
        Disaster Types
      </h2>
      <VerticalBarChart
        title=""
        series={series}
        color="#3b82f6"
        embedded
      />
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
          .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
          .slice(0, 5)
          .map((disaster) => (
            <div
              key={disaster._id}
              className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0"
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 ${
                  disaster.status === "responding"
                    ? "bg-red-500"
                    : disaster.status === "closed"
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
                      disaster.severity === "high"
                        ? "bg-red-100 text-red-700"
                        : disaster.severity === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {disaster.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {disaster.district} • {disaster.affectedPopulation || "N/A"} affected •
                  Affected: {disaster.affectedPopulation || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Reported: {new Date(disaster.createdAt || disaster.date).toLocaleDateString()}
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
          const label = status.charAt(0).toUpperCase() + status.slice(1);
          return (
            <div key={status} className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{label}</p>
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
                Affected Population
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
                      disaster.severity === "high"
                        ? "bg-red-100 text-red-700"
                        : disaster.severity === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {disaster.severity}
                  </span>
                </td>
                <td className="px-4 py-3">{disaster.status}</td>
                <td className="px-4 py-3">{disaster.affectedPopulation || "N/A"}</td>
                <td className="px-4 py-3">
                  {new Date(disaster.createdAt || disaster.date).toLocaleDateString()}
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
        Funds by Location
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
        Funds by Status
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

function LineTrendChart({ title, series, color }) {
  const values = series.map((item) => item.value);
  const maxValue = Math.max(...values, 1);
  const width = 320;
  const height = 120;
  const padding = 20;
  const step = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0;
  const points = series
    .map((item, index) => {
      const x = padding + index * step;
      const y = height - padding - (item.value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-blue-600" />
        {title}
      </h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
        />
        {series.map((item, index) => {
          const x = padding + index * step;
          const y = height - padding - (item.value / maxValue) * (height - padding * 2);
          return (
            <g key={item.label}>
              <circle cx={x} cy={y} r="4" fill={color} />
              <text x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="#64748b">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        {series.map((item) => (
          <span key={item.label}>{item.value}</span>
        ))}
      </div>
    </div>
  );
}

function VerticalBarChart({ title, series, color, embedded = false }) {
  const maxValue = Math.max(...series.map((item) => item.value), 1);
  const content = (
    <div className="flex items-end gap-3 h-40">
      {series.map((item) => {
        const height = (item.value / maxValue) * 100;
        return (
          <div key={item.label} className="flex-1 text-center">
            <div
              className="rounded-t-md"
              style={{ height: `${height}%`, backgroundColor: color, minHeight: "6px" }}
            ></div>
            <p className="text-xs text-slate-600 mt-2 truncate" title={item.label}>
              {item.label}
            </p>
            <p className="text-xs text-slate-500">{item.value}</p>
          </div>
        );
      })}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      {title ? (
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-purple-600" />
          {title}
        </h2>
      ) : null}
      {content}
    </div>
  );
}

function AreaTrendChart({ title, series, color }) {
  const values = series.map((item) => item.value);
  const maxValue = Math.max(...values, 1);
  const width = 320;
  const height = 120;
  const padding = 20;
  const step = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0;
  const points = series.map((item, index) => {
    const x = padding + index * step;
    const y = height - padding - (item.value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  const areaPath = `M ${padding},${height - padding} `
    + points.map((p) => `L ${p.x},${p.y}`).join(" ")
    + ` L ${padding + step * (series.length - 1)},${height - padding} Z`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-sky-600" />
        {title}
      </h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <path d={areaPath} fill={color} opacity="0.2" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        />
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        {series.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, series }) {
  const total = series.reduce((sum, item) => sum + item.value, 0) || 1;
  let cumulative = 0;
  const size = 120;
  const radius = 44;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <PieChart size={20} className="text-indigo-600" />
        {title}
      </h2>
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            {series.map((item) => {
              const value = item.value || 0;
              const fraction = value / total;
              const dash = fraction * circumference;
              const gap = circumference - dash;
              const rotation = (cumulative / total) * 360;
              cumulative += value;
              return (
                <circle
                  key={item.label}
                  r={radius}
                  cx="0"
                  cy="0"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(${rotation - 90})`}
                />
              );
            })}
          </g>
        </svg>
        <div className="space-y-2">
          {series.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className="capitalize">{item.label}</span>
              <span className="text-slate-900 font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HorizontalBarChart({ title, series }) {
  const maxValue = Math.max(...series.map((item) => item.value), 1);
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <BarChart3 size={20} className="text-emerald-600" />
        {title}
      </h2>
      <div className="space-y-3">
        {series.map((item) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{item.label}</span>
                <span className="text-slate-900 font-semibold">{item.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${percentage}%`, backgroundColor: item.color || "#10b981" }}
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
    acc[f.status] = (acc[f.status] || 0) + (f.allocatedAmount || 0);
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
                Fund Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Allocated (M)
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Expenses (M)
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
                <td className="px-4 py-3">{fund.name}</td>
                <td className="px-4 py-3">{fund.location}</td>
                <td className="px-4 py-3">M{(fund.allocatedAmount || 0).toLocaleString()}</td>
                <td className="px-4 py-3">M{(fund.expenses || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (fund.status || "pending").toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : (fund.status || "pending").toLowerCase() === "closed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {(fund.status || "Pending").toString().trim() || "Pending"}
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
