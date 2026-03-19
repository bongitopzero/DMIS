import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "../components/DisasterEvents.css";

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(null);
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const role = currentUser?.user?.role || "";
  const isCoordinator = role === "Coordinator";

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    let list = incidents;
    if (search) {
      list = list.filter(i => (i.district || "").toLowerCase().includes(search.toLowerCase()) || (i.location || "").toLowerCase().includes(search.toLowerCase()));
    }
    if (statusFilter !== "all") {
      list = list.filter(i => i.status === statusFilter);
    }
    setFiltered(list);
  }, [incidents, search, statusFilter]);

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const fetchIncidents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/incidents");
      setIncidents(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  const getHouseholdCount = (it) => {
    // Prefer explicit numeric field
    if (it.numberOfHouseholdsAffected && Number(it.numberOfHouseholdsAffected) > 0) return Number(it.numberOfHouseholdsAffected);
    if (it.totalAffectedHouseholds && Number(it.totalAffectedHouseholds) > 0) return Number(it.totalAffectedHouseholds);

    // Parse `households` if it's a range like "10-20" or a single number
    if (it.households && typeof it.households === 'string') {
      const nums = it.households.match(/\d+/g);
      if (nums && nums.length > 0) {
        // If a range, use the larger bound as the actual affected households
        const parsed = nums.map(n => parseInt(n, 10));
        return Math.max(...parsed);
      }
    }

    // Try parsing affectedPopulation (e.g. "500-1000"), estimate households by dividing by 5
    if (it.affectedPopulation && typeof it.affectedPopulation === 'string') {
      const nums = it.affectedPopulation.match(/\d+/g);
      if (nums && nums.length > 0) {
        const val = Math.max(...nums.map(n => parseInt(n, 10)));
        return Math.max(1, Math.round(val / 5));
      }
    }

    return 0;
  };

  const openVerify = (incident) => {
    setVerifying(incident);
    setNotes("");
  };

  const confirmVerify = async () => {
    if (!verifying) return;
    try {
      await API.put(`/incidents/${verifying._id}/verify`, {
        verificationNotes: notes,
        verifiedBy: currentUser?.user?.id,
      });
      setVerifying(null);
      fetchIncidents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify incident");
    }
  };

  return (
    <div className="disaster-events" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Incident Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search district or location" value={search} onChange={(e)=>setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 8 }}>
        {loading ? (
          <div style={{ padding: 20 }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" onChange={(e)=>{
                    const next = new Set(selectedIds);
                    if (e.target.checked) {
                      pageItems.forEach(i=> next.add(i._id));
                    } else {
                      pageItems.forEach(i=> next.delete(i._id));
                    }
                    setSelectedIds(next);
                  }} checked={pageItems.every(i=> selectedIds.has(i._id)) && pageItems.length>0} />
                </th>
                <th>ID</th>
                <th>Type</th>
                <th>District</th>
                <th>Location</th>
                <th>Households</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it, idx) => (
                <tr key={it._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>
                    <input type="checkbox" checked={selectedIds.has(it._id)} onChange={(e)=>{
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(it._id); else next.delete(it._id);
                      setSelectedIds(next);
                    }} />
                  </td>
                  <td style={{ padding: 8 }}>{`I-${new Date(it.createdAt).getFullYear()}-${String((currentPage-1)*pageSize + idx+1).padStart(3,'0')}`}</td>
                  <td style={{ padding: 8 }}>{(it.type || '').replace(/_/g,' ')}</td>
                  <td style={{ padding: 8 }}>{it.district}</td>
                  <td style={{ padding: 8 }}>{it.location || '—'}</td>
                  <td style={{ padding: 8 }}>{getHouseholdCount(it)}</td>
                  <td style={{ padding: 8 }}>{it.status || 'reported'}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={()=>openVerify(it)} disabled={!isCoordinator || it.status === 'verified'} style={{ padding: '6px 10px', background: isCoordinator ? '#1e3a5f' : '#d1d5db', color: 'white', border: 'none', borderRadius: 6, cursor: isCoordinator ? 'pointer' : 'not-allowed' }}>
                        Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination & Bulk Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage<=1}>Previous</button>
          <span>Page {currentPage} / {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={currentPage>=totalPages}>Next</button>
          <select value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={()=>{ setSelectedIds(new Set()); setPage(1); }}>Clear Selection</button>
          <button disabled={!isCoordinator || selectedIds.size===0} onClick={()=>setShowBulkModal(true)} style={{ background: isCoordinator && selectedIds.size>0 ? '#1e3a5f' : '#d1d5db', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6 }}>
            Bulk Verify ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Bulk Verify Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={()=>setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Verify {selectedIds.size} incidents</h3>
              <button className="modal-close" onClick={()=>setShowBulkModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <label>Verification Notes (applied to all)</label>
              <textarea value={bulkNotes} onChange={(e)=>setBulkNotes(e.target.value)} rows={4} style={{ width: '100%' }} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={()=>setShowBulkModal(false)}>Cancel</button>
              <button className="btn-save" onClick={async ()=>{
                // perform bulk verify
                const ids = Array.from(selectedIds);
                try {
                  await Promise.all(ids.map(id => API.put(`/incidents/${id}/verify`, { verificationNotes: bulkNotes, verifiedBy: currentUser?.user?.id })));
                  setShowBulkModal(false);
                  setSelectedIds(new Set());
                  setBulkNotes("");
                  fetchIncidents();
                } catch (err) {
                  setError(err.response?.data?.message || 'Bulk verify failed');
                }
              }}>Confirm Bulk Verify</button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {verifying && (
        <div className="modal-overlay" onClick={()=>setVerifying(null)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify Incident</h3>
              <button className="modal-close" onClick={()=>setVerifying(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Type:</strong> {verifying.type}</p>
              <p><strong>District:</strong> {verifying.district}</p>
              <p><strong>Location:</strong> {verifying.location}</p>
              <label>Verification Notes</label>
              <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} style={{ width: '100%' }} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={()=>setVerifying(null)}>Cancel</button>
              <button className="btn-save" onClick={confirmVerify}>Confirm Verify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
