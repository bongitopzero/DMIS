import React, { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, DollarSign, BarChart3 } from "lucide-react";
import { ToastManager } from "../components/Toast";
import API from "../api/axios";
import { assignDisasterIds } from "../utils/locationUtils";
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
        let list = res.data?.disasters || res.data || [];
        // Assign disasterId to each item for consistency
        list = assignDisasterIds(list);
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

    // Use the same formula as BudgetAllocation.jsx
    const nationalExpenditure = 82648374;
    const perDisaster = nationalExpenditure / 3;
    const reserveContribution = perDisaster * 0.1;
    const finalDisasterAmount = perDisaster - reserveContribution;
    const budgetByType = {
      "heavy_rainfall": finalDisasterAmount,
      "strong_winds":   finalDisasterAmount,
      "drought":        finalDisasterAmount,
    };

    const summaryRes = await API.get("/allocation/disaster-summary");
    const disasterSummary = summaryRes.data || [];

    // Map disaster summary to normalize keys
    const spentByType = {};
    disasterSummary.forEach(d => {
      const key = d.type?.toLowerCase().replace(/\s+/g, "_");
      spentByType[key] = (spentByType[key] || 0) + (d.totalAmount || 0);
    });

    // Build budgets for charts
    const budgetsAcc = Object.entries(budgetByType).map(([key, total]) => ({
      category: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      allocatedAmount: total,
      approvalStatus: "Approved",
      spent: spentByType[key] || 0,
    }));

    // Build expenses for pie chart
    const expensesAcc = disasterSummary.map(d => ({
      category: d.type,
      amount: d.totalAmount || 0,
      status: "Approved",
      vendorName: d.type,
    }));

    setBudgets(budgetsAcc);
    setExpenses(expensesAcc);

    const totalBudget = Object.values(budgetByType).reduce((s, v) => s + v, 0);
    const totalSpent  = disasterSummary.reduce((s, d) => s + (d.totalAmount || 0), 0);

    setStats({
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      pendingApproval: disasterSummary.reduce((s, d) => s + (d.totalHouseholds || 0), 0),
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
    return budgets.map(b => ({
      category: b.category,
      "Allocated": b.allocatedAmount || 0,
      "Spent": b.spent || 0,
    }));
  };

  const getSpendingDistributionData = () => {
    return expenses.map(e => ({
      name: e.category,
      value: e.amount || 0,
    }));
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

  const COLORS = ["#006B94", "#EC6B56", "#F5A623", "#2ECC71", "#9013FE", "#FF6B6B"];
  const chartData = getCategoryChartData();
  const spendingData = getSpendingDistributionData();
  const topVendors = getTopVendorsData();
  const budgetHealth = getBudgetHealthData();

  return (
    <div className="financial-dashboard">
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
              {disaster.disasterCode || disaster._id.substring(0, 8)} - {disaster.type} ({disaster.district})
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
