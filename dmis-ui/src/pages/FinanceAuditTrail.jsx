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
      <h1 className="text-2xl font-bold mb-4">Financial Audit Trail</h1>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Disaster:</label>
        <select
          className="border rounded p-2 w-full max-w-sm"    
          value={selectedDisaster}
          onChange={(e) => setSelectedDisaster(e.target.value)}
        >  
          {disasters.map(d => (
            <option key={d._id || d.id} value={d._id || d.id}>
              {d.type?.replace(/_/g, " ") || "Unknown Type"} - {d.district || "Unknown District"}
            </option>
          ))}
        </select>
      </div>  
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"   
          placeholder="Search logs..."
          className="border rounded p-2 flex-1 min-w-[200px]"
          value={search}  
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>

  );
}
