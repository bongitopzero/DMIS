import React, { useState, useEffect } from "react";
import API from "../api/axios";
import "./MySubmissions.css";

export default function MySubmissions() {
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  const fetchMySubmissions = async () => {
    setLoading(true);
    try {
      const res = await API.get("/disasters");
      setDisasters(res.data || []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setDisasters([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDisasters = disasters.filter(d => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return d.status === "reported" || d.status === "submitted";
    if (activeFilter === "approved") return d.status === "verified";
    if (activeFilter === "rejected") return d.status === "closed";
    return true;
  });

  const getStatusBadgeStyle = (status) => {
    const styles = {
      reported: { backgroundColor: '#fef3c7', color: '#92400e', text: 'Pending' },
      submitted: { backgroundColor: '#fef3c7', color: '#92400e', text: 'Pending' },
      verified: { backgroundColor: '#dcfce7', color: '#166534', text: 'Approved' },
      closed: { backgroundColor: '#fee2e2', color: '#991b1b', text: 'Rejected' }
    };
    return styles[status] || styles.reported;
  };

  const getSeverityBadgeStyle = (severity) => {
    const styles = {
      low: { backgroundColor: '#dcfce7', color: '#166534' },
      medium: { backgroundColor: '#fef3c7', color: '#92400e' },
      high: { backgroundColor: '#fee2e2', color: '#991b1b' }
    };
    return styles[severity] || styles.medium;
  };

  return (
    <div className="p-0 bg-gray-50 min-h-screen">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Submissions</h1>
          <p className="text-gray-600">{filteredDisasters.length} records</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeFilter === tab ? '#1e3a5f' : '#e5e7eb',
                color: activeFilter === tab ? 'white' : '#374151'
              }}
              onMouseEnter={(e) => {
                if (activeFilter !== tab) {
                  e.target.style.backgroundColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (activeFilter !== tab) {
                  e.target.style.backgroundColor = '#e5e7eb';
                }
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading submissions...</div>
          ) : filteredDisasters.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No submissions found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">District</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Severity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Households</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDisasters.map((disaster, idx) => {
                  const statusBadge = getStatusBadgeStyle(disaster.status);
                  const severityBadge = getSeverityBadgeStyle(disaster.severity);
                  const disasterId = `D-${new Date(disaster.createdAt).getFullYear()}-${String(idx + 1).padStart(3, '0')}`;
                  
                  return (
                    <tr key={disaster._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{disasterId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{disaster.type?.charAt(0).toUpperCase() + disaster.type?.slice(1)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{disaster.district}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          style={{
                            backgroundColor: severityBadge.backgroundColor,
                            color: severityBadge.color,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            display: 'inline-block',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}
                        >
                          {disaster.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{disaster.numberOfHouseholdsAffected || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          style={{
                            backgroundColor: statusBadge.backgroundColor,
                            color: statusBadge.color,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            display: 'inline-block',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}
                        >
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(disaster.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
