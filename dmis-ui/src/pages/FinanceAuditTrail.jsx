import React, { useEffect, useState, useMemo } from "react";
import API from "../api/axios";

function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (e) {
    return ts;
  }
}

export default function FinanceAuditTrail() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [entityFilter, setEntityFilter] = useState("All Entities");

  useEffect(() => {
    // Load disasters to allow selecting one
    API.get("/disasters").then((res) => {
      const list = res.data?.disasters || res.data || [];
      setDisasters(list);
      if (list.length > 0) setSelectedDisaster(list[0]._id || list[0].id);
    }).catch(() => {
      setDisasters([]);
    });
  }, []);

  useEffect(() => {
    if (!selectedDisaster) return;
    setLoading(true);
    API.get(`/financial/auditlogs/${selectedDisaster}`)
      .then((res) => {
        setLogs(res.data?.logs || []);
      })
      .catch((err) => {
        console.error('Error loading audit logs', err?.response || err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDisaster]);

  const actions = useMemo(() => {
    const setA = new Set();
    logs.forEach(l => setA.add(l.action || l.actionType || ''));
    return ["All Actions", ...Array.from(setA).filter(Boolean)];
  }, [logs]);

  const entities = useMemo(() => {
    const setE = new Set();
    logs.forEach(l => setE.add(l.entityType || ''));
    return ["All Entities", ...Array.from(setE).filter(Boolean)];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      // search across actorName, details and action
      const q = search.trim().toLowerCase();
      if (actionFilter !== 'All Actions' && (l.action || l.actionType || '') !== actionFilter) return false;
      if (entityFilter !== 'All Entities' && (l.entityType || '') !== entityFilter) return false;
      if (!q) return true;
      const hay = `${l.actorName || ''} ${JSON.stringify(l.details || {})} ${l.action || l.actionType || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [logs, search, actionFilter, entityFilter]);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
<<<<<<< HEAD
        
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">Finance Audit Trail module coming soon...</p>
=======
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Finance Audit Trail</h1>
        <p className="text-gray-500 mb-6">Immutable record of all financial actions — no deletions allowed</p>

        <div className="flex gap-3 mb-4 items-center">
          <div className="flex-1">
            <input className="w-full p-2 border rounded" placeholder="Search by user, details, or ID..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>

          <div>
            <select className="p-2 border rounded" value={actionFilter} onChange={(e)=>setActionFilter(e.target.value)}>
              {actions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <select className="p-2 border rounded" value={entityFilter} onChange={(e)=>setEntityFilter(e.target.value)}>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <select className="p-2 border rounded" value={selectedDisaster} onChange={(e)=>setSelectedDisaster(e.target.value)}>
              {disasters.length === 0 && <option value="">Select disaster</option>}
              {disasters.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>{d.title || d.name || d.disasterCode || `${d.type} — ${d._id}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Old → New</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="p-6 text-center">Loading…</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center">No records found</td></tr>}
                {!loading && filtered.map((log) => (
                  <tr key={log._id || log.id} className="border-t text-sm text-gray-700">
                    <td className="p-3 align-top">{formatDate(log.createdAt || log.timestamp || log.updatedAt)}</td>
                    <td className="p-3 align-top">
                      <span className="inline-block px-2 py-1 rounded text-xs bg-green-100 text-green-800">{log.action || log.actionType}</span>
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium">{log.entityType}</div>
                      <div className="text-xs text-gray-500">{log.entityId || ''}</div>
                    </td>
                    <td className="p-3 align-top">
                      {log.oldValues ? (
                        <div className="text-xs">
                          {Object.entries(log.oldValues).slice(0,3).map(([k,v])=> <div key={k}><strong>{k}:</strong> {String(v).slice(0,80)}</div>)}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                      <div className="mt-2 text-xs text-green-600">
                        {log.newValues ? Object.entries(log.newValues).slice(0,3).map(([k,v])=> <div key={k}><strong>{k}:</strong> {String(v).slice(0,80)}</div>) : null}
                      </div>
                    </td>
                    <td className="p-3 align-top text-sm text-gray-700">
                      <div>{(log.details && typeof log.details === 'object') ? JSON.stringify(log.details) : (log.details || '')}</div>
                      <div className="text-xs text-gray-400 mt-1">By: {log.actorName || log.actorId || 'System'} — {log.actorRole || ''}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-emerald-50 border border-emerald-100 p-4 rounded text-sm text-emerald-800">
            <strong>IMMUTABILITY POLICY</strong>
            <ul className="list-disc ml-5 mt-2 text-emerald-700">
              <li>All records in this log are permanent and cannot be deleted or modified.</li>
              <li>Every budget creation, approval, expense, and status change is automatically captured.</li>
              <li>Old and new values are recorded for all state transitions.</li>
              <li>This log serves as the system's authoritative financial audit trail.</li>
            </ul>
          </div>
>>>>>>> 2beef1669ff02dda749abfd97ac7fe48ac181b7e
        </div>
      </div>
    </div>
  );
}
