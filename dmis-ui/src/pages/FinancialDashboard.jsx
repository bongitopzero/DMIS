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
        setDisasters(res.data);
        if (res.data.length > 0) {
          setSelectedDisaster(res.data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching disasters:", err);
      }
    };
    fetchDisasters();
  }, []);

  // Fetch financial data when disaster changes
  useEffect(() => {
    if (selectedDisaster) {
      fetchFinancialData();
    }
  }, [selectedDisaster]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFinancialData = async () => {
    try {
      const [budgetsRes, expensesRes] = await Promise.all([
        API.get(`/api/financial/budgets/${selectedDisaster}`),
        API.get(`/api/financial/expenses/${selectedDisaster}`),
      ]);

      setBudgets(budgetsRes.data || []);
      setExpenses(expensesRes.data || []);

      // Calculate stats
      const totalBudget = budgetsRes.data.reduce(
        (sum, b) => sum + (b.approvalStatus === "Approved" ? b.allocatedAmount : 0),
        0
      );
      const totalSpent = expensesRes.data.reduce(
        (sum, e) => sum + (e.status === "Approved" ? e.amount : 0),
        0
      );
      const pendingApproval = budgetsRes.data.filter(
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

  const COLORS = ["#006B94", "#EC6B56", "#F5A623", "#2ECC71", "#9013FE", "#FF6B6B"];
  const chartData = getCategoryChartData();
  const spendingData = getSpendingDistributionData();
  const topVendors = getTopVendorsData();
  const budgetHealth = getBudgetHealthData();

  return (
    <div className="financial-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Finance Dashboard</h1>
          <p className="subtitle">
            Financial governance overview — budget allocation, expenditure, and accountability
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

      {selectedDisaster && (
        <>
          {/* KPI Cards */}
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: "#e8f4f8" }}>
                <DollarSign size={24} color="#006B94" />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">TOTAL ALLOCATED</p>
                <p className="kpi-value">M{(stats.totalBudget / 1000000).toFixed(1)}M</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: "#fce8e6" }}>
                <TrendingUp size={24} color="#EC6B56" />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">TOTAL SPENT</p>
                <p className="kpi-value">M{(stats.totalSpent / 1000000).toFixed(1)}M</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: "#e8f5e9" }}>
                <AlertCircle size={24} color="#2ECC71" />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">REMAINING</p>
                <p className="kpi-value" style={{ color: "#2ECC71" }}>
                  M{(stats.remaining / 1000000).toFixed(1)}M
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
                        M{(vendor.amount / 1000).toFixed(0)}K ({(vendor.amount / stats.totalSpent * 100).toFixed(0)}%)
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

          {/* Financial Governance Section */}
          <div className="governance-section">
            <h3>Financial Governance</h3>
            <ul className="governance-rules">
              <li>All budget allocations require Coordinator approval before spending</li>
              <li>Expenditure invoices are automatically detected and blocked</li>
              <li>Finance Officers cannot approve their own expense/reimbursement (duress).</li>
              <li>No records can be deleted — only voided with documented reason</li>
              <li>Complete audit trail maintained for every financial action</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
