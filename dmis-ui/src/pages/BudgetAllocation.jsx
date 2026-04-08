import "./BudgetAllocation.css";
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, CheckCircle, AlertCircle } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";

const initialNationalExpenditure = 82648374;

const fundPartitions = [
  { label: "Core Disaster Response", percent: 0.7, description: "Immediate disaster assistance", sector: 'core' },
  { label: "Backlog Clearance", percent: 0.15, description: "Pending cases from previous disasters", sector: 'backlog' },
  { label: "Strategic Reserve", percent: 0.1, description: "Unexpected large disasters", sector: 'reserve' },
  { label: "Administration", percent: 0.05, description: "System operations and monitoring", sector: 'admin' },
];

const coreSubPartitions = [
  { label: "Drought", percent: 0.4 },
  { label: "Heavy Rainfall / Flooding", percent: 0.35 },
  { label: "Strong Winds / Storms", percent: 0.15 },
  { label: "Other Emergencies", percent: 0.1 },
];

function getBudgetStatus(usedPercent) {
  if (usedPercent <= 50) return { label: 'Healthy', color: 'bg-green-100 text-green-800', bar: 'bg-green-500' };
  if (usedPercent <= 80) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500' };
  return { label: 'Critical', color: 'bg-red-100 text-red-800', bar: 'bg-red-500' };
}

function formatCurrency(value) {
  if (!value || value === "TBD") return "TBD";
  return `M${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function BudgetAllocation() {
  const navigate = useNavigate();
  const [nationalExpenditure, setNationalExpenditure] = useState(initialNationalExpenditure);
  const [disasters, setDisasters] = useState([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState("");
  const [budget, setBudget] = useState(null);
  const [envelopes, setEnvelopes] = useState({});
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchBudget();
    fetchDisasters();
  }, []);

const fetchBudget = async () => {
    try {
      const res = await API.get("/budget/current");
      setBudget(res.data);
      setNationalExpenditure(res.data?.allocatedBudget || initialNationalExpenditure);
    } catch {
      setBudget(null);
    } finally {
      setLoading(false);
    }
  };

  const [showCoreBreakdown, setShowCoreBreakdown] = useState(false);

  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      const approved = res.data.filter(d => d.status === "verified");
      setDisasters(approved);
      if (approved.length > 0) setSelectedDisasterId(approved[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnvelopes = async (disasterId) => {
    try {
      const res = await API.get(`/finance/envelopes/${disasterId}`);
      setEnvelopes(res.data);
    } catch {
      setEnvelopes({});
    }
  };

  const handleAllocateToDisaster = async () => {
    if (!selectedDisasterId) return;
    setAllocating(true);
    try {
       await API.post(`/budget/disaster/${selectedDisasterId}/allocate`, {
        nationalBudget: nationalExpenditure,
      });
      await fetchEnvelopes(selectedDisasterId);
      ToastManager.success("✅ Budget envelopes auto-allocated to disaster");
      navigate(`/aid-allocation?disasterId=${selectedDisasterId}`);
    } catch (err) {
      ToastManager.error("Failed to allocate budget envelopes");
    } finally {
      setAllocating(false);
    }
  };

const handleSaveBudget = async () => {
    try {
      const res = await API.post("/budget/create", {
        fiscalYear: new Date().getFullYear(),
        allocatedBudget: nationalExpenditure,
      });
      setBudget(res.data);
      ToastManager.success("✅ Budget SAVED!");
    } catch (err) {
      ToastManager.error("Failed to save budget");
    }
  };

  useEffect(() => {
    if (selectedDisasterId) fetchEnvelopes(selectedDisasterId);
  }, [selectedDisasterId]);

  const disasterBudget = nationalExpenditure;
  const partitions = useMemo(() => fundPartitions.map(p => ({
    ...p,
    amount: Math.round(disasterBudget * p.percent),
    allocated: envelopes[p.sector]?.committed || 0,
    remaining: Math.max(0, Math.round(disasterBudget * p.percent) - (envelopes[p.sector]?.committed || 0)),
  })), [disasterBudget, envelopes]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Automated Budget Allocation</h1>
      <p className="text-gray-600 mb-8">Set national budget, select disaster, auto-partition to envelopes, track allocations.</p>

      {/* Budget Status Banner */}
      {budget ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 flex flex-wrap gap-4 items-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <div className="font-semibold text-green-800">Active Budget FY {budget.fiscalYear}</div>
            <div className="text-sm text-green-700">
              Allocated: {formatCurrency(budget.allocatedBudget)} | Committed: {formatCurrency(budget.committedFunds)} | Remaining: {formatCurrency(budget.remainingBudget)}
            </div>
          </div>
          <button 
            onClick={() => {/* edit logic later */}} 
            className="ml-auto px-4 py-2 bg-white border border-green-600 text-green-600 rounded-md hover:bg-green-50 text-sm font-medium"
          >
            Edit Budget
          </button>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex flex-wrap gap-4 items-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <div className="font-semibold text-red-800">No Active Budget</div>
            <div className="text-sm text-red-700">Create national budget to enable allocations</div>
          </div>
        </div>
      )}

      {/* National Budget */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">National Disaster Budget</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="number"
            value={nationalExpenditure}
            onChange={e => setNationalExpenditure(Number(e.target.value))}
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSaveBudget} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save National Budget
          </button>
        </div>
        <div>Total for Disaster Allocation: {formatCurrency(disasterBudget)}</div>
        {budget && <div className="text-green-600 mt-2">Active: FY {budget.fiscalYear}</div>}
      </div>

      {/* Partitions Table */}
      <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4 text-left font-semibold">Sector</th>
              <th className="p-4 text-right font-semibold">Total</th>
              <th className="p-4 text-right font-semibold">Committed</th>
              <th className="p-4 text-right font-semibold">Remaining</th>
              <th className="p-4 text-right font-semibold">Status</th>
              <th className="p-4 text-right font-semibold">Progress</th>
              <th className="p-4 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {partitions.map(p => {
              const committed = budget?.committedFunds * p.percent || 0;
              const usedPercent = committed > 0 ? Math.min(100, (committed / p.amount * 100)) : 0;
              const status = getBudgetStatus(usedPercent);
              const isCore = p.sector === 'core';
              return (
                <React.Fragment key={p.sector}>
                  <tr className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => isCore && setShowCoreBreakdown(!showCoreBreakdown)}>
                    <td className="p-4 font-medium flex items-center gap-2">
                      {p.label}
                      {isCore && (showCoreBreakdown ? '▼' : '▶')}
                    </td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="p-4 text-right text-orange-600">{formatCurrency(committed)}</td>
                    <td className="p-4 text-right font-bold text-green-600">{formatCurrency(p.amount - committed)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${status.bar}`} 
                          style={{width: `${usedPercent}%`}}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{p.description}</td>
                  </tr>
                  {isCore && showCoreBreakdown && coreSubPartitions.map(sub => {
                    const subAmount = Math.round(p.amount * sub.percent);
                    return (
                      <tr key={`${p.sector}-${sub.label}`} className="bg-gray-25 border-t">
                        <td className="p-4 pl-12 text-sm font-medium opacity-90">{sub.label}</td>
                        <td className="p-4 text-right text-sm">{formatCurrency(subAmount)}</td>
                        <td className="p-4 text-right text-orange-600 text-sm">M0</td>
                        <td className="p-4 text-right font-bold text-green-600 text-sm">{formatCurrency(subAmount)}</td>
                        <td className="p-4"><span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">Healthy</span></td>
                        <td className="p-4">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full w-0" />
                          </div>
                        </td>
                        <td className="p-4 text-xs text-gray-500 italic">Sub-allocation of Core</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Allocate to Disaster */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Allocate to Disaster</h2>
        <div className="flex gap-4 items-end">
          <select
            value={selectedDisasterId}
            onChange={e => setSelectedDisasterId(e.target.value)}
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Disaster</option>
            {disasters.map(d => (
              <option key={d._id} value={d._id}>
                {d.type} - {d.district}
              </option>
            ))}
          </select>
          <button
            onClick={handleAllocateToDisaster}
            disabled={!selectedDisasterId || allocating}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold flex items-center gap-2"
          >
            {allocating ? "Allocating..." : "Allocate & Proceed"}
            <ArrowRight size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">Auto-creates sector envelopes for disaster, navigates to aid allocation.</p>
      </div>
    </div>
  );
}

