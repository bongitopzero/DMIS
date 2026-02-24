import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
} from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "./Toast";
import HouseholdAssessmentForm from "./HouseholdAssessmentForm";
import AllocationRequestForm from "./AllocationRequestForm";

/**
 * AllocationDashboard Component
 * QuickBooks-style allocation dashboard with scoring and aid assignment
 */
export default function AllocationDashboard({ disasterId }) {
  const [stats, setStats] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    if (disasterId) {
      fetchAllData();
    }
  }, [disasterId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, assessRes, allocRes, plansRes] = await Promise.all([
        API.get(`/allocation/dashboard-stats/${disasterId}`),
        API.get(`/allocation/assessments/${disasterId}`),
        API.get(`/allocation/assessments/${disasterId}?status=Allocated`),
        API.get(`/allocation/plans/${disasterId}`),
      ]);

      setStats(statsRes.data);
      setAssessments(assessRes.data.assessments || []);
      setAllocations(allocRes.data.assessments || []);
      setPlans(plansRes.data.plans || []);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (error && !stats) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">❌ Error: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading allocation data...</p>
        </div>
      </div>
    );
  }

  // Chart data
  const vulnerabilityData = [
    {
      name: "Basic (0-3)",
      value: Math.floor((stats?.pendingAssessments || 0) * 0.4),
      fill: "#10b981",
    },
    {
      name: "Moderate (4-6)",
      value: Math.floor((stats?.approvedAllocations || 0) * 0.5),
      fill: "#f59e0b",
    },
    {
      name: "Severe (7-9)",
      value: Math.floor((stats?.disbursedAllocations || 0) * 0.3),
      fill: "#ef4444",
    },
    {
      name: "Critical (10+)",
      value: Math.floor((stats?.pendingAllocations || 0) * 0.2),
      fill: "#8b5cf6",
    },
  ];

  const budgetData = [
    {
      category: "Pending",
      value: Math.floor((stats?.estimatedNeed || 0) * 0.3),
    },
    {
      category: "Approved",
      value: (stats?.approvedTotal || 0),
    },
    {
      category: "Disbursed",
      value: (stats?.disbursedTotal || 0),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">💰 Financial Allocation</h1>
          <p className="text-blue-100">
            Fair and transparent disaster aid allocation system
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <SummaryCard
            icon={Clock}
            title="Pending"
            value={stats?.pendingAssessments || 0}
            subtitle="Assessments"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-700"
            iconColor="text-blue-600"
          />
          <SummaryCard
            icon={AlertCircle}
            title="awaiting"
            value={stats?.pendingAllocations || 0}
            subtitle="Approval"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            textColor="text-yellow-700"
            iconColor="text-yellow-600"
          />
          <SummaryCard
            icon={CheckCircle}
            title="Approved"
            value={stats?.approvedAllocations || 0}
            subtitle="Requests"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-700"
            iconColor="text-green-600"
          />
          <SummaryCard
            icon={DollarSign}
            title="Approved"
            value={`M${(stats?.approvedTotal || 0).toLocaleString()}`}
            subtitle="Budget"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-700"
            iconColor="text-purple-600"
          />
          <SummaryCard
            icon={TrendingUp}
            title="Estimated"
            value={`M${(stats?.estimatedNeed || 0).toLocaleString()}`}
            subtitle="Total Need"
            bgColor="bg-indigo-50"
            borderColor="border-indigo-200"
            textColor="text-indigo-700"
            iconColor="text-indigo-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <HouseholdAssessmentForm disasterId={disasterId} onSuccess={fetchAllData} />
          <AllocationRequestForm disasterId={disasterId} onSuccess={fetchAllData} />
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <FileText className="h-5 w-5" />
            <span>Generate Plan</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-slate-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "assessments", label: "Assessments" },
            { id: "allocations", label: "Allocations" },
            { id: "plans", label: "Plans" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Vulnerability Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Vulnerability Score Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vulnerabilityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vulnerabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Budget Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Budget Status (Malawi Kwacha)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => `M${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "assessments" && (
          <DataTable
            title="Household Assessments"
            columns={[
              "Household ID",
              "Head Name",
              "Disaster Type",
              "Damage Level",
              "Income",
              "Status",
            ]}
            data={assessments.map((a) => [
              a.householdId,
              a.headOfHousehold.name,
              a.disasterType,
              `Level ${a.damageSeverityLevel}`,
              `M${a.monthlyIncome.toLocaleString()}`,
              <StatusBadge key="status" status={a.status} />,
            ])}
          />
        )}

        {activeTab === "allocations" && (
          <DataTable
            title="Allocation Requests"
            columns=[
              "Household ID",
              "Composite Score",
              "Aid Tier",
              "Estimated Cost",
              "Status",
            ]
            data={allocations.map((a) => [
              a.householdId,
              a.compositeScore,
              a.aidTier || "—",
              `M${(a.totalEstimatedCost || 0).toLocaleString()}`,
              <StatusBadge key="status" status={a.status} />,
            ])}
          />
        )}

        {activeTab === "plans" && (
          <DataTable
            title="Allocation Plans"
            columns=[
              "Plan ID",
              "Plan Name",
              "Households",
              "Total Budget",
              "Status",
            ]
            data={plans.map((p) => [
              p.planId,
              p.planName,
              p.totalHouseholdsCovered,
              `M${p.totalBudgetRequired.toLocaleString()}`,
              <StatusBadge key="status" status={p.status} />,
            ])}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Summary Card Component
 */
function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
  bgColor,
  borderColor,
  textColor,
  iconColor,
}) {
  return (
    <div
      className={`${bgColor} border-2 ${borderColor} rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>
        <Icon className={`${iconColor} h-8 w-8 opacity-40`} />
      </div>
    </div>
  );
}

/**
 * Data Table Component
 */
function DataTable({ title, columns, data }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {data.length === 0 ? (
        <div className="p-6 text-center text-slate-500">
          <p>No data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-left text-slate-700 font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-6 py-4 text-slate-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }) {
  const styles = {
    "Pending Review": "bg-blue-100 text-blue-800",
    "Pending Approval": "bg-yellow-100 text-yellow-800",
    Proposed: "bg-slate-100 text-slate-800",
    Approved: "bg-green-100 text-green-800",
    Allocated: "bg-indigo-100 text-indigo-800",
    Disbursed: "bg-emerald-100 text-emerald-800",
    Draft: "bg-slate-100 text-slate-800",
    "In Progress": "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
        styles[status] || styles["Pending Review"]
      }`}
    >
      {status}
    </span>
  );
}
