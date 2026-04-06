import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Edit2, Trash2,
  Eye, Download, Search, Filter, AlertCircle, CheckCircle, Clock,
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
  const [formData, setFormData] = useState({ name: "", location: "", allocatedAmount: "", expenses: "", status: "Active" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get("/funds");
      console.log("GET /funds:", res.status, res.data);
      setFunds(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("GET /funds error:", err.response?.status, err.response?.data || err.message);
      setError("Failed to load funds: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null); setError(""); setSuccess("");
    setFormData({ name: "", location: "", allocatedAmount: "", expenses: "", status: "Active" });
    setShowModal(true);
  };

  const openEditModal = (fund) => {
    setEditingId(fund._id); setError(""); setSuccess("");
    setFormData({ name: fund.name || "", location: fund.location || "", allocatedAmount: fund.allocatedAmount ?? "", expenses: fund.expenses ?? 0, status: fund.status || "Active" });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveFund = async () => {
    setError(""); setSuccess("");
    if (!formData.name?.trim()) { setError("Fund name is required"); return; }
    if (!formData.location?.trim()) { setError("Location is required"); return; }
    if (formData.allocatedAmount === "" || formData.allocatedAmount === null) { setError("Allocated amount is required"); return; }

    const allocatedNum = parseFloat(formData.allocatedAmount);
    const expensesNum  = parseFloat(formData.expenses) || 0;
    if (isNaN(allocatedNum) || allocatedNum < 0) { setError("Allocated amount must be a valid positive number"); return; }

    const payload = { name: formData.name.trim(), location: formData.location.trim(), allocatedAmount: allocatedNum, expenses: expensesNum, status: formData.status || "Active" };
    console.log((editingId ? "PUT" : "POST") + " /funds payload:", payload);

    try {
      if (editingId) {
        const res = await API.put("/funds/" + editingId, payload);
        console.log("PUT /funds response:", res.status, res.data);
        setSuccess("Fund updated successfully!");
      } else {
        const res = await API.post("/funds", payload);
        console.log("POST /funds response:", res.status, res.data);
        setSuccess("Fund created successfully!");
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error("Save fund error:", err.response?.status, err.response?.data || err.message);
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.response?.data?.error || err.message;
      if (err.code === "ERR_NETWORK") setError("Cannot reach the server.");
      else if (status === 401) setError("Session expired — please log in again.");
      else if (status === 403) setError("You do not have permission to manage funds.");
      else if (status === 400) setError("Validation error: " + msg);
      else if (status === 404) setError("Fund not found.");
      else if (status === 500) setError("Server error: " + msg);
      else setError("Operation failed: " + msg);
    }
  };

  const handleDeleteFund = async (id) => {
    if (!window.confirm("Delete this fund?")) return;
    try {
      await API.delete("/funds/" + id);
      setSuccess("Fund deleted successfully!");
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete fund");
    }
  };

  const norm        = (v) => (v ?? "").toString().toLowerCase().trim();
  const toNum       = (v) => (typeof v === "number" && !isNaN(v) ? v : parseFloat(v) || 0);
  const fmtMoney    = (v) => toNum(v).toLocaleString();

  const stats = { totalFunds: funds.reduce((s,f) => s + toNum(f.allocatedAmount), 0), totalExpenses: funds.reduce((s,f) => s + toNum(f.expenses), 0), activeFunds: funds.filter(f => norm(f.status) === "active").length, pendingFunds: funds.filter(f => norm(f.status) === "pending").length, closedFunds: funds.filter(f => norm(f.status) === "closed").length };
  stats.balance = stats.totalFunds - stats.totalExpenses;
  stats.utilizationRate = stats.totalFunds > 0 ? ((stats.totalExpenses / stats.totalFunds) * 100).toFixed(1) : "0.0";
  stats.allocationPer100k = POPULATION > 0 ? (stats.totalFunds / POPULATION) * 100000 : 0;

  const filteredFunds = funds.filter(f => {
    const t = searchTerm.toLowerCase();
    return ((f.name?.toLowerCase()||"").includes(t) || (f.location?.toLowerCase()||"").includes(t))
      && (statusFilter === "all" || norm(f.status) === norm(statusFilter));
  });

  const fundsByStatus = funds.reduce((a,f) => { const s=norm(f.status)||"active"; a[s]=(a[s]||0)+1; return a; }, {active:0,pending:0,closed:0});
  const fundsByLocation = funds.reduce((a,f) => { const l=f.location||"Unknown"; a[l]=(a[l]||0)+toNum(f.allocatedAmount); return a; }, {});
  const topLocations = Object.entries(fundsByLocation).sort((a,b)=>b[1]-a[1]).slice(0,4);

  const getStatusBadge = (status) => {
    const map = { active: { bg:"var(--color-success-100)", color:"var(--color-success-700)" }, pending: { bg:"var(--color-warning-100)", color:"var(--color-warning-700)" }, closed: { bg:"var(--color-danger-100)", color:"var(--color-danger-700)" } };
    return map[norm(status)] || map.pending;
  };

  const exportData = () => {
    const csv = [["Name","Location","Allocated","Expenses","Balance","Status","Created"], ...funds.map(f=>[f.name,f.location,toNum(f.allocatedAmount),toNum(f.expenses),toNum(f.allocatedAmount)-toNum(f.expenses),f.status,new Date(f.createdAt).toLocaleDateString()])].map(r=>r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a = document.createElement("a"); a.href=url; a.download="funds-"+Date.now()+".csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="finance-dashboard loading-state"><p>Loading financial data…</p></div>;

  return (
    <div className="finance-dashboard">
      {!embedded && (
        <div className="dashboard-header">
          <div><h1 className="dashboard-title">Financial Management</h1><p className="dashboard-subtitle">Manage funds, track expenses, and monitor financial health</p></div>
          <button className="btn-export" onClick={exportData}><Download size={18}/> Export Data</button>
        </div>
      )}

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="stats-grid">
        <div className="stat-card primary"><div className="stat-icon"><DollarSign size={24}/></div><div className="stat-info"><p className="stat-label">Total Allocated</p><h3 className="stat-value">M {fmtMoney(stats.totalFunds)}</h3></div></div>
        <div className="stat-card success"><div className="stat-icon"><TrendingDown size={24}/></div><div className="stat-info"><p className="stat-label">Total Expenses</p><h3 className="stat-value">M {fmtMoney(stats.totalExpenses)}</h3></div></div>
        <div className="stat-card warning"><div className="stat-icon"><TrendingUp size={24}/></div><div className="stat-info"><p className="stat-label">Balance</p><h3 className="stat-value">M {fmtMoney(stats.balance)}</h3></div></div>
        <div className="stat-card info"><div className="stat-icon"><Filter size={24}/></div><div className="stat-info"><p className="stat-label">Utilization Rate</p><h3 className="stat-value">{stats.utilizationRate}%</h3></div></div>
      </div>

      <div className="secondary-stats">
        <div className="mini-stat"><CheckCircle size={16} color="var(--color-success-500)"/><span>{stats.activeFunds} Active</span></div>
        <div className="mini-stat"><Clock size={16} color="var(--color-warning-500)"/><span>{stats.pendingFunds} Pending</span></div>
        <div className="mini-stat"><AlertCircle size={16} color="var(--color-danger-500)"/><span>{stats.closedFunds} Closed</span></div>
        <div className="mini-stat"><DollarSign size={16} color="var(--color-primary-600)"/><span>M {fmtMoney(stats.allocationPer100k)} per 100k</span></div>
      </div>

      <div className="forecast-insights">
        <div className="forecast-insights-header"><h2>Portfolio Insights</h2><span className="forecast-period">Allocation snapshot</span></div>
        <div className="forecast-insights-grid">
          <div className="forecast-insight-card"><span className="label">Active Funds</span><span className="value">{fundsByStatus.active}</span></div>
          <div className="forecast-insight-card"><span className="label">Pending Funds</span><span className="value">{fundsByStatus.pending}</span></div>
          <div className="forecast-insight-card"><span className="label">Closed Funds</span><span className="value">{fundsByStatus.closed}</span></div>
          <div className="forecast-insight-card"><span className="label">Average Fund Size</span><span className="value">M {fmtMoney(stats.totalFunds / Math.max(1, funds.length))}</span></div>
        </div>
        {topLocations.length > 0 && (
          <div className="forecast-insights-grid">
            {topLocations.map(([loc, amt]) => (
              <div key={loc} className="forecast-insight-card"><span className="label">{loc}</span><span className="value">M {fmtMoney(amt)}</span></div>
            ))}
          </div>
        )}
      </div>

      <div className="filters-section">
        <div className="search-box"><Search size={18}/><input type="text" placeholder="Search by name or location…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
        <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
        <button className="btn-add" onClick={openAddModal}><Plus size={18}/> Add Fund</button>
      </div>

      {funds.length === 0 && (
        <div style={{textAlign:"center",padding:"3rem",color:"#6b7280",backgroundColor:"white",borderRadius:"0.5rem",border:"2px dashed #e5e7eb",marginTop:"1rem"}}>
          <DollarSign size={48} style={{margin:"0 auto 1rem",opacity:0.3}}/>
          <p style={{fontWeight:"600",marginBottom:"0.5rem"}}>No funds yet</p>
          <p style={{fontSize:"0.875rem"}}>Click <strong>Add Fund</strong> to create your first fund entry.</p>
        </div>
      )}

      {filteredFunds.length > 0 && (
        <div className="funds-table-container">
          <table className="funds-table">
            <thead><tr><th>Fund Name</th><th>Location</th><th>Allocated</th><th>Expenses</th><th>Balance</th><th>Utilization</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredFunds.map(fund => {
                const bal  = toNum(fund.allocatedAmount) - toNum(fund.expenses);
                const util = toNum(fund.allocatedAmount) > 0 ? ((toNum(fund.expenses)/toNum(fund.allocatedAmount))*100).toFixed(1) : "0.0";
                const badge = getStatusBadge(fund.status);
                return (
                  <tr key={fund._id}>
                    <td className="fund-name">{fund.name}</td>
                    <td>{fund.location}</td>
                    <td className="amount">M {fmtMoney(fund.allocatedAmount)}</td>
                    <td className="amount expenses">M {fmtMoney(fund.expenses)}</td>
                    <td className="amount balance">M {fmtMoney(bal)}</td>
                    <td>
                      <div className="utilization-bar">
                        <div className="utilization-fill" style={{width:Math.min(parseFloat(util),100)+"%",backgroundColor:parseFloat(util)>80?"var(--color-danger-500)":parseFloat(util)>50?"var(--color-warning-500)":"var(--color-success-500)"}}/>
                        <span className="utilization-text">{util}%</span>
                      </div>
                    </td>
                    <td><span className="status-badge" style={{backgroundColor:badge.bg,color:badge.color}}>{fund.status}</span></td>
                    <td>{new Date(fund.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view"   onClick={()=>{ setViewingFund(fund); setShowViewModal(true); }} title="View"><Eye size={16}/></button>
                        <button className="action-btn edit"   onClick={()=>openEditModal(fund)} title="Edit"><Edit2 size={16}/></button>
                        <button className="action-btn delete" onClick={()=>handleDeleteFund(fund._id)} title="Delete"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? "Edit Fund" : "Add New Fund"}</h2>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" style={{marginBottom:"1rem"}}>{error}</div>}
              <div className="form-group"><label>Fund Name *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Emergency Relief Fund"/></div>
              <div className="form-group"><label>Location / District *</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g. Maseru"/></div>
              <div className="form-row">
                <div className="form-group"><label>Allocated Amount (Maloti) *</label><input type="number" name="allocatedAmount" value={formData.allocatedAmount} onChange={handleInputChange} min="0" placeholder="0"/></div>
                <div className="form-group"><label>Expenses (Maloti)</label><input type="number" name="expenses" value={formData.expenses} onChange={handleInputChange} min="0" placeholder="0"/></div>
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
              <button className="btn-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveFund}>{editingId ? "Update Fund" : "Create Fund"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingFund && (
        <div className="modal-overlay" onClick={()=>setShowViewModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Fund Details</h2><button className="modal-close" onClick={()=>setShowViewModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="view-section"><h3>Basic Information</h3>
                <div className="view-grid">
                  <div className="view-field"><label>Fund Name</label><p>{viewingFund.name}</p></div>
                  <div className="view-field"><label>Location</label><p>{viewingFund.location}</p></div>
                  <div className="view-field"><label>Status</label><span className="status-badge" style={{backgroundColor:getStatusBadge(viewingFund.status).bg,color:getStatusBadge(viewingFund.status).color}}>{viewingFund.status}</span></div>
                </div>
              </div>
              <div className="view-section"><h3>Financial Details</h3>
                <div className="view-grid">
                  <div className="view-field"><label>Allocated Amount</label><p className="amount-text">M {fmtMoney(viewingFund.allocatedAmount)}</p></div>
                  <div className="view-field"><label>Total Expenses</label><p className="amount-text expenses">M {fmtMoney(viewingFund.expenses)}</p></div>
                  <div className="view-field"><label>Remaining Balance</label><p className="amount-text balance">M {fmtMoney(toNum(viewingFund.allocatedAmount)-toNum(viewingFund.expenses))}</p></div>
                </div>
              </div>
              <div className="view-section"><h3>Timestamps</h3>
                <div className="view-grid">
                  <div className="view-field"><label>Created</label><p>{new Date(viewingFund.createdAt).toLocaleString()}</p></div>
                  <div className="view-field"><label>Last Updated</label><p>{new Date(viewingFund.updatedAt).toLocaleString()}</p></div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={()=>setShowViewModal(false)}>Close</button>
              <button className="btn-save" onClick={()=>{setShowViewModal(false);openEditModal(viewingFund);}}>Edit Fund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}