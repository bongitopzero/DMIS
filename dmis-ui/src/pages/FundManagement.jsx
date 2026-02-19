import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import "./FundManagement.css";

export default function FundManagement({ embedded = false }) {
  const POPULATION = 2300000;
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingFund, setViewingFund] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    allocatedAmount: "",
    expenses: "",
    status: "Active",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        API.get("/funds"),
      ]);

      if (results[0].status === "fulfilled") {
        setFunds(results[0].value.data);
      } else {
        setError("Failed to load funds");
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: "",
      location: "",
      allocatedAmount: "",
      expenses: "",
      status: "Active",
    });
    setShowModal(true);
  };

  const openEditModal = (fund) => {
    setEditingId(fund._id);
    setFormData({
      name: fund.name,
      location: fund.location,
      allocatedAmount: fund.allocatedAmount,
      expenses: fund.expenses || 0,
      status: fund.status,
    });
    setShowModal(true);
  };

  const openViewModal = (fund) => {
    setViewingFund(fund);
    setShowViewModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveFund = async () => {
    setError("");
    setSuccess("");

    if (!formData.name || !formData.location || !formData.allocatedAmount) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        ...formData,
        allocatedAmount: parseFloat(formData.allocatedAmount),
        expenses: parseFloat(formData.expenses) || 0,
      };

      if (editingId) {
        await API.put(`/funds/${editingId}`, payload);
        setSuccess("Fund updated successfully!");
      } else {
        await API.post("/funds", payload);
        setSuccess("Fund created successfully!");
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDeleteFund = async (id) => {
    if (window.confirm("Are you sure you want to delete this fund?")) {
      try {
        await API.delete(`/funds/${id}`);
        setSuccess("Fund deleted successfully!");
        fetchData();
      } catch (err) {
        setError("Failed to delete fund");
      }
    }
  };

  // Calculate statistics
  const normalizeStatus = (value) =>
    (value ?? "").toString().toLowerCase().trim();

  const stats = {
    totalFunds: funds.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0),
    totalExpenses: funds.reduce((sum, f) => sum + (f.expenses || 0), 0),
    activeFunds: funds.filter((f) => normalizeStatus(f.status) === "active").length,
    pendingFunds: funds.filter((f) => normalizeStatus(f.status) === "pending").length,
    closedFunds: funds.filter((f) => normalizeStatus(f.status) === "closed").length,
  };

  stats.balance = stats.totalFunds - stats.totalExpenses;
  stats.utilizationRate = stats.totalFunds > 0 
    ? ((stats.totalExpenses / stats.totalFunds) * 100).toFixed(1) 
    : 0;
  stats.allocationPer100k = POPULATION > 0
    ? (stats.totalFunds / POPULATION) * 100000
    : 0;


  const toNumber = (value) => (typeof value === "number" && !Number.isNaN(value) ? value : 0);
  const formatMoney = (value) => toNumber(value).toLocaleString();

  // Filter funds
  const filteredFunds = funds.filter((fund) => {
    const fundName = fund.name?.toLowerCase() || "";
    const fundLocation = fund.location?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      fundName.includes(term) || fundLocation.includes(term);
    const matchesStatus =
      statusFilter === "all" || normalizeStatus(fund.status) === normalizeStatus(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const fundsByStatus = funds.reduce(
    (acc, fund) => {
      const status = normalizeStatus(fund.status) || "active";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { active: 0, pending: 0, closed: 0 }
  );

  const fundsByLocation = funds.reduce((acc, fund) => {
    const location = fund.location || "Unknown";
    acc[location] = (acc[location] || 0) + (fund.allocatedAmount || 0);
    return acc;
  }, {});

  const topLocations = Object.entries(fundsByLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const getStatusBadge = (status) => {
    const styles = {
      Active: { bg: "var(--color-success-100)", color: "var(--color-success-700)", icon: CheckCircle },
      Pending: { bg: "var(--color-warning-100)", color: "var(--color-warning-700)", icon: Clock },
      Closed: { bg: "var(--color-danger-100)", color: "var(--color-danger-700)", icon: AlertCircle },
    };
    return styles[status] || styles.Active;
  };

  const exportData = () => {
    const csvContent = [
      ["Name", "Location", "Allocated Amount", "Expenses", "Balance", "Status", "Created"],
      ...funds.map((f) => [
        f.name,
        f.location,
        f.allocatedAmount,
        f.expenses || 0,
        f.allocatedAmount - (f.expenses || 0),
        f.status,
        new Date(f.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `funds-${Date.now()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="finance-dashboard loading-state">
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {/* Header */}
      {!embedded && (
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Financial Management</h1>
            <p className="dashboard-subtitle">
              Manage funds, track expenses, and monitor financial health
            </p>
          </div>
          <button className="btn-export" onClick={exportData}>
            <Download size={18} />
            Export Data
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}


      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Allocated</p>
            <h3 className="stat-value">M {formatMoney(stats.totalFunds)}</h3>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <TrendingDown size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Expenses</p>
            <h3 className="stat-value">M {formatMoney(stats.totalExpenses)}</h3>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Balance</p>
            <h3 className="stat-value">M {formatMoney(stats.balance)}</h3>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Filter size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Utilization Rate</p>
            <h3 className="stat-value">{stats.utilizationRate}%</h3>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="secondary-stats">
        <div className="mini-stat">
          <CheckCircle size={16} color="var(--color-success-500)" />
          <span>{stats.activeFunds} Active</span>
        </div>
        <div className="mini-stat">
          <Clock size={16} color="var(--color-warning-500)" />
          <span>{stats.pendingFunds} Pending</span>
        </div>
        <div className="mini-stat">
          <AlertCircle size={16} color="var(--color-danger-500)" />
          <span>{stats.closedFunds} Closed</span>
        </div>
        <div className="mini-stat">
          <DollarSign size={16} color="var(--color-primary-600)" />
          <span>M {formatMoney(stats.allocationPer100k)} per 100k</span>
        </div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header">
          <h2>Portfolio Insights</h2>
          <span className="forecast-period">Allocation snapshot</span>
        </div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card">
            <span className="label">Active Funds</span>
            <span className="value">{fundsByStatus.active}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Pending Funds</span>
            <span className="value">{fundsByStatus.pending}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Closed Funds</span>
            <span className="value">{fundsByStatus.closed}</span>
          </div>
          <div className="forecast-insight-card">
            <span className="label">Average Fund Size</span>
            <span className="value">
              M {formatMoney(stats.totalFunds / Math.max(1, funds.length))}
            </span>
          </div>
        </div>
        <div className="forecast-insights-grid">
          {topLocations.map(([location, amount]) => (
            <div key={location} className="forecast-insight-card">
              <span className="label">{location}</span>
              <span className="value">M {formatMoney(amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>

        <button className="btn-add" onClick={openAddModal}>
          <Plus size={18} />
          Add Fund
        </button>
      </div>

      {/* Funds Table */}
      <div className="funds-table-container">
        <table className="funds-table">
          <thead>
            <tr>
              <th>Fund Name</th>
              <th>Location</th>
              <th>Allocated Amount</th>
              <th>Expenses</th>
              <th>Balance</th>
              <th>Utilization</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFunds.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  No funds found
                </td>
              </tr>
            ) : (
              filteredFunds.map((fund) => {
                const balance = fund.allocatedAmount - (fund.expenses || 0);
                const utilization = fund.allocatedAmount > 0
                  ? ((fund.expenses || 0) / fund.allocatedAmount * 100).toFixed(1)
                  : 0;
                const statusStyle = getStatusBadge(fund.status);

                return (
                  <tr key={fund._id}>
                    <td className="fund-name">{fund.name}</td>
                    <td>{fund.location}</td>
                    <td className="amount">M {formatMoney(fund.allocatedAmount)}</td>
                    <td className="amount expenses">M {formatMoney(fund.expenses)}</td>
                    <td className="amount balance">M {formatMoney(balance)}</td>
                    <td>
                      <div className="utilization-bar">
                        <div
                          className="utilization-fill"
                          style={{
                            width: `${Math.min(utilization, 100)}%`,
                            backgroundColor: utilization > 80
                              ? "var(--color-danger-500)"
                              : utilization > 50
                                ? "var(--color-warning-500)"
                                : "var(--color-success-500)"
                          }}
                        ></div>
                        <span className="utilization-text">{utilization}%</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {fund.status}
                      </span>
                    </td>
                    <td>{new Date(fund.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => openViewModal(fund)}
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(fund)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteFund(fund._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? "Edit Fund" : "Add New Fund"}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Fund Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Location/District *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Allocated Amount (Maloti) *</label>
                  <input
                    type="number"
                    name="allocatedAmount"
                    value={formData.allocatedAmount}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Expenses (Maloti)</label>
                  <input
                    type="number"
                    name="expenses"
                    value={formData.expenses}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveFund}>
                {editingId ? "Update Fund" : "Create Fund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingFund && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Fund Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="view-section">
                <h3>Basic Information</h3>
                <div className="view-grid">
                  <div className="view-field">
                    <label>Fund Name</label>
                    <p>{viewingFund.name}</p>
                  </div>
                  <div className="view-field">
                    <label>Location</label>
                    <p>{viewingFund.location}</p>
                  </div>
                  <div className="view-field">
                    <label>Status</label>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusBadge(viewingFund.status).bg,
                        color: getStatusBadge(viewingFund.status).color,
                      }}
                    >
                      {viewingFund.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="view-section">
                <h3>Financial Details</h3>
                <div className="view-grid">
                  <div className="view-field">
                    <label>Allocated Amount</label>
                    <p className="amount-text">M {formatMoney(viewingFund.allocatedAmount)}</p>
                  </div>
                  <div className="view-field">
                    <label>Total Expenses</label>
                    <p className="amount-text expenses">M {formatMoney(viewingFund.expenses)}</p>
                  </div>
                  <div className="view-field">
                    <label>Remaining Balance</label>
                    <p className="amount-text balance">
                      M {formatMoney(viewingFund.allocatedAmount - (viewingFund.expenses || 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="view-section">
                <h3>Timestamps</h3>
                <div className="view-grid">
                  <div className="view-field">
                    <label>Created</label>
                    <p>{new Date(viewingFund.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="view-field">
                    <label>Last Updated</label>
                    <p>{new Date(viewingFund.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingFund);
                }}
              >
                Edit Fund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
