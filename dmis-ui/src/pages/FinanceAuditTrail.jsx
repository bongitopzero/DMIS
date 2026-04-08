import React, { useState, useEffect } from "react";
import { Download, Search, Calendar, Filter } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./FinanceAuditTrail.css";

const FinanceAuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    action: "all",
    entityType: "all",
  });
  const [actionOptions] = useState([
    "all", "BUDGET_CREATED", "BUDGET_UPDATED", "REQUEST_CREATED", "REQUEST_APPROVED", 
    "REQUEST_REJECTED", "ALLOCATION_DISBURSED", "EXPENSE_LOGGED"
  ]);
  const [entityOptions] = useState(["all", "Budget", "FundRequest", "Expenditure", "Disaster"]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams(filters);
      const res = await API.get(`/auditlogs?${params}`);
      setAuditLogs(res.data.logs || res.data.auditLogs || res.data || []);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      ToastManager.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams(filters);
      const res = await API.get(`/auditlogs/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dmis-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      ToastManager.success("Audit trail exported to CSV");
    } catch (err) {
      ToastManager.error("Export failed");
    }
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('CREATED')) return 'badge-success';
    if (action.includes('APPROVED') || action.includes('DISBURSED')) return 'badge-info';
    if (action.includes('EXPENSE') || action.includes('LOGGED')) return 'badge-warning';
    if (action.includes('REJECTED')) return 'badge-error';
    return 'badge-secondary';
  };

  const getFormattedDetails = (log) => {
    if (log.oldValue && log.newValue) {
      return `${JSON.stringify(log.oldValue).slice(0,50)}... → ${JSON.stringify(log.newValue).slice(0,50)}...`;
    }
    return log.details || 'N/A';
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filters.action !== "all" && log.action !== filters.action) return false;
    if (filters.entityType !== "all" && log.entityType !== filters.entityType) return false;
    if (filters.search && !log.action.toLowerCase().includes(filters.search.toLowerCase()) &&
        !log.actorName?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !log.details?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.startDate && new Date(log.createdAt) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(log.createdAt) > new Date(filters.endDate)) return false;
    return true;
  });

  return (
    <div className="finance-audit-trail">
      {/* Header */}
      <div className="audit-header">
        <div>
          <h1>Finance Audit Trail</h1>
          <p>Immutable record of all financial actions — no deletions allowed</p>
        </div>
        <button onClick={exportToCSV} className="export-btn">
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Simplified - just the table with basic search */}
      <div className="simple-search">
        <input
          type="text"
          placeholder="Search audit records..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="search-input"
        />
        <button onClick={fetchAuditLogs} className="refresh-btn">
          Refresh
        </button>
      </div>

      {/* Audit Table */}
      <div className="audit-table-section">
        <div className="table-header">
          <h3>Audit Records ({filteredLogs.length})</h3>
          {loading && <div className="spinner" />}
        </div>
        <div className="table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Amount</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={log._id || index}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entityType}</td>
                  <td>{log.amount ? `M${log.amount.toLocaleString()}` : '-'}</td>
                  <td>{log.actorName || log.actorRole}</td>
                  <td className="details-cell">{getFormattedDetails(log)}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="no-data">
                    No audit records match the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceAuditTrail;

