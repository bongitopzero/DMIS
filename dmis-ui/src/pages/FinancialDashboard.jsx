import React, { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, DollarSign, BarChart3 } from "lucide-react";
import { ToastManager } from "../components/Toast";
import API from "../api/axios";
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
import "./FinancialDashboard.css";

export default function FinancialDashboard() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    pendingApproval: 0,
  });

  // Fetch disasters
  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const res = await API.get("/disasters");
        const list = res.data?.disasters || res.data || [];
        setDisasters(list);
        // default to aggregated/all view (empty string keeps "All Approved Disasters")
        setSelectedDisaster("");
      } catch (err) {
        console.error("Error fetching disasters:", err);
      }
    };
    fetchDisasters();
  }, []);

  // Fetch financial data when disaster changes
  useEffect(() => {
    // Only fetch once we know the disasters list (for the "All" overview)
    if (!selectedDisaster && disasters.length === 0) return;
    // fetch for selected disaster or aggregate across all when empty
    fetchFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDisaster, disasters]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      let budgetsAcc = [];
      let expensesAcc = [];

      if (!selectedDisaster) {
        // aggregate across all disasters
        const ids = disasters.map(d => d._id || d.id).filter(Boolean);
        // fetch in sequence to avoid overwhelming the API
        for (const id of ids) {
          try {
            const bRes = await API.get(`/financial/budgets/${id}`);
            const eRes = await API.get(`/financial/expenses/${id}`);
            const bData = bRes.data?.budgets || bRes.data || [];
            const eData = eRes.data?.expenses || eRes.data || [];
            budgetsAcc = budgetsAcc.concat(bData);
            expensesAcc = expensesAcc.concat(eData);
          } catch (err) {
            console.warn('Failed to fetch financial data for disaster', id, err?.message || err);
          }
        }
      } else {
        const bRes = await API.get(`/financial/budgets/${selectedDisaster}`);
        const eRes = await API.get(`/financial/expenses/${selectedDisaster}`);
        budgetsAcc = bRes.data?.budgets || bRes.data || [];
        expensesAcc = eRes.data?.expenses || eRes.data || [];
      }

      setBudgets(budgetsAcc || []);
      setExpenses(expensesAcc || []);

      // Calculate stats
      const totalBudget = (budgetsAcc || []).reduce(
        (sum, b) => sum + (b.approvalStatus === "Approved" ? (b.allocatedAmount || 0) : 0),
        0
      );
      const totalSpent = (expensesAcc || []).reduce(
        (sum, e) => sum + (e.status === "Approved" ? (e.amount || 0) : 0),
        0
      );
      const pendingApproval = (budgetsAcc || []).filter(
        (b) => b.approvalStatus === "Pending"
      ).length;

      setStats({
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        pendingApproval,
      });
    } catch (err) {
      console.error("Error fetching financial data:", err);
      ToastManager.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const getCategoryChartData = () => {
    const categories = [...new Set(budgets.map(b => b.category))];
    return categories.map(cat => {
      const allocated = budgets
        .filter((b) => b.category === cat && b.approvalStatus === "Approved")
        .reduce((sum, b) => sum + b.allocatedAmount, 0);
      const spent = expenses
        .filter((e) => e.category === cat && e.status === "Approved")
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        category: cat,
        "Allocated": allocated,
        "Spent": spent,
      };
    });
  };

  const getSpendingDistributionData = () => {
    const categories = [...new Set(expenses.map(e => e.category))];
    return categories.map(cat => {
      const amount = expenses
        .filter((e) => e.category === cat && e.status === "Approved")
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: cat,
        value: amount,
      };
    });
  };

  const getTopVendorsData = () => {
    const vendorSpend = {};
    expenses
      .filter((e) => e.status === "Approved")
      .forEach((e) => {
        vendorSpend[e.vendorName] = (vendorSpend[e.vendorName] || 0) + e.amount;
      });
    return Object.entries(vendorSpend)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const getBudgetHealthData = () => {
    const categories = [...new Set(budgets.map(b => b.category))];
    return categories.map(cat => {
      const allocated = budgets
        .filter((b) => b.category === cat && b.approvalStatus === "Approved")
        .reduce((sum, b) => sum + b.allocatedAmount, 0);
      const spent = expenses
        .filter((e) => e.category === cat && e.status === "Approved")
        .reduce((sum, e) => sum + e.amount, 0);
      const percentageUsed = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
      return {
        category: cat,
        percentageUsed: Math.min(percentageUsed, 100),
      };
    });
  };

  const getSpendingByDisasterData = () => {
    // Aggregate approved spend by disaster and join with disaster metadata for labels
    const totalsByDisaster = {};
    expenses
      .filter((e) => e.status === "Approved")
      .forEach((e) => {
        const key = e.disasterId?.toString();
        if (!key) return;
        totalsByDisaster[key] = (totalsByDisaster[key] || 0) + (e.amount || 0);
      });

    return Object.entries(totalsByDisaster)
      .map(([disasterId, amount]) => {
        const meta =
          disasters.find((d) => (d._id || d.id)?.toString() === disasterId) || {};

        const labelFromMeta =
          meta.disasterCode ||
          meta.incidentTitle ||
          meta.title ||
          (meta.type && meta.district
            ? `${meta.type} - ${meta.district}`
            : meta.type || meta.district || "Unlabelled");

        return {
          disaster: labelFromMeta,
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  };

  const COLORS = ["#006B94", "#EC6B56", "#F5A623", "#2ECC71", "#9013FE", "#FF6B6B"];
  const chartData = getCategoryChartData();
  const spendingData = getSpendingDistributionData();
  const topVendors = getTopVendorsData();
  const budgetHealth = getBudgetHealthData();
  const spendingByDisaster = getSpendingByDisasterData();

  return (
    <div className="financial-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Finance Dashboard</h1>
          <p className="subtitle">
            {selectedDisaster
              ? "Focused view for a single disaster — budget allocation, expenditure, and accountability"
              : "System-wide financial overview — aggregate budget allocation, expenditure, and accountability across all approved disasters"}
          </p>
        </div>
      </div>

      {/* View Selector */}
      <div className="view-selector">
        <label>View:</label>
        <select
          value={selectedDisaster}
          onChange={(e) => setSelectedDisaster(e.target.value)}
          className="view-dropdown"
        >
          <option value="">All Approved Disasters</option>
          {disasters.map((disaster) => (
            <option key={disaster._id} value={disaster._id}>
              {disaster.type} - {disaster.district}
            </option>
          ))}
        </select>
      </div>

      {/* High-level summary */}
      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: "#e8f4f8" }}>
            <DollarSign size={24} color="#006B94" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">
              {selectedDisaster ? "TOTAL ALLOCATED (DISASTER)" : "TOTAL ALLOCATED (ALL DISASTERS)"}
            </p>
            <p className="kpi-value">M{(stats.totalBudget || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: "#fce8e6" }}>
            <TrendingUp size={24} color="#EC6B56" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">
              {selectedDisaster ? "TOTAL SPENT (DISASTER)" : "TOTAL SPENT (ALL DISASTERS)"}
            </p>
            <p className="kpi-value">M{(stats.totalSpent || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: "#e8f5e9" }}>
            <AlertCircle size={24} color="#2ECC71" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">REMAINING</p>
            <p className="kpi-value" style={{ color: "#2ECC71" }}>
              M{(stats.remaining || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: "#fff3e0" }}>
            <BarChart3 size={24} color="#F5A623" />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">PENDING APPROVAL</p>
            <p className="kpi-value">{stats.pendingApproval}</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="no-data">Loading latest financial metrics…</p>
      )}

      {!isLoading && (
        <>
          {/* KPI Cards */}
          {/* Charts Container */}
          <div className="charts-container">
            {/* Budget vs Actual Chart */}
            <div className="chart-card">
              <h3>Budget vs Actual by Category</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => `M${(value / 1000).toFixed(0)}K`} />
                    <Legend />
                    <Bar dataKey="Allocated" fill="#006B94" />
                    <Bar dataKey="Spent" fill="#EC6B56" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No budget data available</p>
              )}
            </div>

            {/* Spend by Disaster */}
            <div className="chart-card">
              <h3>Spending by Disaster (Top 8)</h3>
              {spendingByDisaster.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={spendingByDisaster}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="disaster" hide />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => `M${(value / 1000).toFixed(0)}K`}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="Total Spent" fill="#9013FE" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No spending data available</p>
              )}
            </div>

            {/* Spending Distribution Chart */}
            <div className="chart-card">
              <h3>Spending Distribution</h3>
              {spendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name} (${entry.percent?.toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `M${(value / 1000).toFixed(0)}K`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No spending data available</p>
              )}
            </div>

            {/* Top Vendors */}
            <div className="chart-card">
              <h3>Top Vendors by Spend</h3>
              <div className="vendors-list">
                {topVendors.length > 0 ? (
                  topVendors.map((vendor, index) => (
                    <div key={index} className="vendor-item">
                      <div className="vendor-name">{vendor.vendor}</div>
                      <div className="vendor-bar-container">
                        <div
                          className="vendor-bar"
                          style={{
                            width: `${(vendor.amount / topVendors[0].amount) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <div className="vendor-amount">
                        M{(vendor.amount || 0).toLocaleString()} ({stats.totalSpent ? ((vendor.amount / stats.totalSpent) * 100).toFixed(0) : 0}%)
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No vendor data available</p>
                )}
              </div>
            </div>

            {/* Budget Health */}
            <div className="chart-card">
              <h3>Budget Health by Category</h3>
              <div className="health-list">
                {budgetHealth.length > 0 ? (
                  budgetHealth.map((item, index) => (
                    <div key={index} className="health-item">
                      <div className="health-label">{item.category}</div>
                      <div className="health-bar-container">
                        <div className="health-bar-background">
                          <div
                            className={`health-bar-fill ${
                              item.percentageUsed > 80 ? "warning" : ""
                            }`}
                            style={{ width: `${item.percentageUsed}%` }}
                          />
                        </div>
                      </div>
                      <div className="health-percent">{item.percentageUsed}% used</div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No budget health data available</p>
                )}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
