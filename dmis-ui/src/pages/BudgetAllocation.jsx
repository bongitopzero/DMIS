<<<<<<< HEAD
import React from "react";
import { DollarSign } from "lucide-react";
import "./BudgetAllocation.css";
=======
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import API from "../api/axios";

const initialNationalExpenditure = 82648374; // 2026/2027 national expenditure

const fundPartitions = [
  { label: "Core Disaster Response", percent: 0.7, description: "Immediate disaster assistance" },
  { label: "Backlog Clearance", percent: 0.15, description: "Pending cases from previous disasters" },
  { label: "Strategic Reserve", percent: 0.1, description: "Unexpected large disasters" },
  { label: "Administration", percent: 0.05, description: "System operations and monitoring" },
];

const coreResponseSplit = [
  { label: "Drought", percent: 0.4 },
  { label: "Heavy Rainfall / Flooding", percent: 0.35 },
  { label: "Strong Winds / Storms", percent: 0.15 },
  { label: "Other Emergencies", percent: 0.1 },
];

function formatCurrency(value) {
  if (value === "TBD" || value === null || value === undefined) return "TBD";
  // 'M' is not a valid ISO currency code, so format as a normal number and prefix with 'M'
  return `M${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
>>>>>>> 2beef1669ff02dda749abfd97ac7fe48ac181b7e

export default function BudgetAllocation() {
  const navigate = useNavigate();
  const [nationalExpenditure, setNationalExpenditure] = useState(initialNationalExpenditure);
  const [disasters, setDisasters] = useState([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState("");
  const [allocateLoading, setAllocateLoading] = useState(false);

  // Fetch disasters on mount
  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      const approvedDisasters = res.data.filter(d => d.status === "verified");
      setDisasters(approvedDisasters);
      if (approvedDisasters.length > 0) {
        setSelectedDisasterId(approvedDisasters[0]._id);
      }
    } catch (err) {
      console.error("Error fetching disasters:", err);
    }
  };

  const handleAllocate = () => {
    if (!selectedDisasterId) {
      alert("Please select a disaster");
      return;
    }
    setAllocateLoading(true);
    // Navigate to aid allocation page with selected disaster
    navigate(`/aid-allocation?disasterId=${selectedDisasterId}`);
  };

  const disasterBudget = useMemo(() => nationalExpenditure * 1.0, [nationalExpenditure]);

  const partitions = useMemo(
    () =>
      fundPartitions.map((p) => ({
        ...p,
        amount: Math.round(disasterBudget * p.percent),
      })),
    [disasterBudget]
  );

  const coreResponseAmount = partitions.find((p) => p.label === "Core Disaster Response")?.amount || 0;

  const coreAllocations = useMemo(
    () =>
      coreResponseSplit.map((p) => ({
        ...p,
        amount: Math.round(coreResponseAmount * p.percent),
      })),
    [coreResponseAmount]
  );

  return (
<<<<<<< HEAD
    <div className="budget-allocation-page">
      <div className="budget-allocation-content">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">Budget Allocation module coming soon...</p>
        </div>
=======
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Disaster Budget Allocation</h1>
        <p className="text-gray-600 mb-8">
          The system derives the disaster budget as a percentage of national expenditure, partitions it into strategic envelopes, and tracks allocations by disaster type.
        </p>

        <section className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. National Disaster Budget</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">National Government Expenditure (2026/2027)</label>
              <input
                type="number"
                value={nationalExpenditure}
                onChange={(e) => setNationalExpenditure(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Disaster Budget (100%)</label>
              <div className="mt-1 text-lg font-semibold text-gray-800">{formatCurrency(disasterBudget)}</div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Formula: <span className="font-medium">Disaster Budget = 100% × National Government Expenditure</span>
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Partition of Disaster Budget</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">% of Total</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {partitions.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3">{Math.round(row.percent * 100)}%</td>
                    <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Total disaster budget is split into four envelopes; suggests tracking spend against each envelope and moving cases to backlog or reserve when envelopes are exhausted.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Core Response Allocation by Disaster Type</h2>
          <p className="text-sm text-gray-600 mb-4">
            The core response fund is divided by typical disaster frequency.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="px-4 py-3">Disaster Type</th>
                  <th className="px-4 py-3">% of Core Fund</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {coreAllocations.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3">{Math.round(row.percent * 100)}%</td>
                    <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Remaining Balance by Envelope</h2>
          <p className="text-sm text-gray-600 mb-4">
            Available funds in each envelope. As allocations are made through the system, these balances decrease in real-time.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="px-4 py-3">Envelope</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Allocated</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {partitions.map((partition) => {
                  const allocated = 0; // Placeholder - will be updated from actual allocation data
                  const remaining = partition.amount - allocated;
                  const utilization = (allocated / partition.amount) * 100;
                  const status = utilization > 80 ? 'Critical' : utilization > 50 ? 'Warning' : 'Healthy';
                  const statusColor = status === 'Critical' ? 'text-red-600' : status === 'Warning' ? 'text-yellow-600' : 'text-green-600';

                  return (
                    <tr key={partition.label} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{partition.label}</td>
                      <td className="px-4 py-3">{formatCurrency(partition.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(allocated)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(remaining)}</td>
                      <td className={`px-4 py-3 font-medium ${statusColor}`}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <span className="font-medium">Status Legend:</span> Healthy (0-50% used), Warning (50-80% used), Critical (80%+ used)
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Begin Allocation</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select a disaster and proceed to allocate aid packages to affected households based on the available budget envelopes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Disaster</label>
              <select
                value={selectedDisasterId}
                onChange={(e) => setSelectedDisasterId(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">-- Choose a disaster --</option>
                {disasters.map((disaster) => (
                  <option key={disaster._id} value={disaster._id}>
                    {disaster.name} ({disaster.disasterType})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAllocate}
                disabled={!selectedDisasterId || allocateLoading}
                className="w-full px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <span>{allocateLoading ? "Loading..." : "Proceed to Allocate"}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            This will take you to the Aid Allocation module where you can assess households, create allocation requests, and manage approvals and disbursements.
          </p>
        </section>
>>>>>>> 2beef1669ff02dda749abfd97ac7fe48ac181b7e
      </div>
    </div>
  );
}