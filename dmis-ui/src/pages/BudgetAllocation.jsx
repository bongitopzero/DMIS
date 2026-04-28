import React, { useMemo, useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./BudgetAllocation.css";

const initialNationalExpenditure = 82648374; // 2026/2027 national expenditure

const calculateDisasterAllocations = (totalBudget) => {
  const perDisasterAmount = totalBudget / 3;
  const reserveContribution = perDisasterAmount * 0.1;
  const finalDisasterAmount = perDisasterAmount - reserveContribution;
  const strategicReserve = reserveContribution * 3;

  return {
    drought: finalDisasterAmount,
    heavy_rainfall: finalDisasterAmount,
    strong_winds: finalDisasterAmount,
    strategic_reserve: strategicReserve,
  };
};

const fundPartitions = [
  { label: "drought", displayLabel: "Drought", description: "Budget allocated for drought disasters" },
  { label: "heavy_rainfall", displayLabel: "Heavy Rainfall", description: "Budget allocated for heavy rainfall disasters" },
  { label: "strong_winds", displayLabel: "Strong winds", description: "Budget allocated for strong winds disasters" },
  { label: "strategic_reserve", displayLabel: "Strategic Reserve", description: "Emergency fund for unexpected large disasters" },
];

function formatCurrency(value) {
  if (value === "TBD" || value === null || value === undefined) return "TBD";
  return `M${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function BudgetAllocation() {
  const [nationalExpenditure, setNationalExpenditure] = useState(initialNationalExpenditure);
  const [savingBudget, setSavingBudget] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    fetchDisasters();
    fetchBudgetStatus();
    fetchDisasterSummary();
  }, []);

  const fetchDisasters = async () => {
    try {
      await API.get("/disasters");
    } catch (err) {
      console.error("Error fetching disasters:", err);
      ToastManager.error("Failed to load disasters");
    }
  };

  const fetchBudgetStatus = async () => {
    try {
      const res = await API.get("/financial/envelope-status/all");
      const data = res.data || {};
      const fiscalYearKey = Object.keys(data)[0];
      const activeBudget = data[fiscalYearKey] || null;

      if (activeBudget) {
        setNationalExpenditure(activeBudget.allocatedBudget || initialNationalExpenditure);
        setBudgetStatus(activeBudget);
      }
    } catch (err) {
      console.error("Error fetching budget status:", err);
    }
  };

  const fetchDisasterSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await API.get("/allocation/disaster-summary");
      const data = res.data;
      const safeSummary = Array.isArray(data)
        ? data.map((item) => ({ disasters: [], totalPackages: 0, ...item }))
        : [];
      setSummaryData(safeSummary);
    } catch (err) {
      console.error("Error fetching disaster summary:", err);
      setSummaryData([]);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveNationalBudget = async () => {
    try {
      setSavingBudget(true);
      const res = await API.post("/budgets/national", {
        amount: nationalExpenditure,
        fiscalYear: "2026/2027",
      });
      const savedBudget = res.data?.budget;
      if (savedBudget) {
        setBudgetStatus(savedBudget);
      }
      ToastManager.success("National budget saved successfully");
    } catch (err) {
      console.error("Error saving budget:", err);
      ToastManager.error(err.response?.data?.message || "Failed to save budget");
    } finally {
      setSavingBudget(false);
    }
  };

  const disasterBudget = useMemo(() => nationalExpenditure * 1.0, [nationalExpenditure]);

  const envelopePartitions = useMemo(() => {
    const allocations = calculateDisasterAllocations(nationalExpenditure);
    return fundPartitions.map((partition) => {
      const total = allocations[partition.label] || 0;
      // Use summaryData (which already works) to get committed amounts
      const match = summaryData.find(s => 
        s.type?.toLowerCase().replace(/\s+/g, '_') === partition.label
      );
      const allocated = match?.totalAmount || 0;
      const remaining = total - allocated;
      return {
        ...partition,
        total,
        allocated,
        remaining: Math.max(0, remaining),
        utilization: total > 0 ? (allocated / total) * 100 : 0,
      };
    });
  }, [nationalExpenditure, summaryData]);

  const committedTotal = envelopePartitions.reduce((sum, p) => sum + (p.allocated || 0), 0);
  const totalBudget = envelopePartitions.reduce((sum, p) => sum + (p.total || 0), 0);
  const budgetAllocated = budgetStatus?.allocatedBudget ?? totalBudget;
  const budgetCommitted = budgetStatus?.committedFunds ?? committedTotal;
  const budgetRemaining = budgetStatus?.remainingBudget ?? Math.max(0, budgetAllocated - budgetCommitted);
  const summaryItems = Array.isArray(summaryData) ? summaryData : [];

  return (
    <div className="budget-allocation-container">
      <div className="budget-allocation-header">
        <h1>Automated Budget Allocation</h1>
        <p>Set national budget, select disaster, auto-partition to envelopes, track allocations.</p>
      </div>

      {/* Active Budget Status */}
      <div className="budget-status-box">
        <div className="status-box-content">
          <div className="status-box-icon">
            <CheckCircle size={24} />
          </div>
          <div className="status-box-text">
            <h3>Active Budget FY 2026</h3>
            <p>
              National Budget: {formatCurrency(budgetAllocated)} | Committed: {formatCurrency(budgetCommitted)} | Remaining: {formatCurrency(budgetRemaining)}
            </p>
          </div>
        </div>
        <button onClick={() => setIsEditing(!isEditing)} className="btn-edit-budget">
          {isEditing ? "Close" : "Edit Budget"}
        </button>
      </div>

      {/* National Disaster Budget Section */}
      {isEditing && (
        <div className="budget-section">
          <h2>National Disaster Budget</h2>
          <div className="budget-input-group">
            <input
              type="number"
              value={nationalExpenditure}
              onChange={(e) => setNationalExpenditure(Number(e.target.value))}
              className="budget-input"
              placeholder="Enter budget amount"
            />
            <button
              onClick={handleSaveNationalBudget}
              className="btn-save-budget"
              disabled={savingBudget}
            >
              {savingBudget ? "Saving..." : "Save National Budget"}
            </button>
          </div>
          <div className="budget-info">
            <p><strong>Total for Disaster Allocation:</strong> {formatCurrency(disasterBudget)}</p>
            <p><strong>Active:</strong> FY 2026</p>
          </div>
        </div>
      )}

      {/* Sector Allocation Table */}
      <div className="budget-section">
        <h2 style={{ margin: 0 }}>Type of Disaster Allocation</h2>

        <div className="overflow-x-auto">
          <table className="sector-table">
            <thead>
              <tr>
                <th>Type of Disaster</th>
                <th>Total</th>
                <th>Committed</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {envelopePartitions.map((partition) => {
                const committed = partition.allocated || 0;
                const total = partition.total || 0;
                const remaining = partition.remaining || 0;
                const utilization = total > 0 ? (committed / total) * 100 : 0;
                const status = utilization > 80 ? "Critical" : utilization > 50 ? "Warning" : "Healthy";
                const statusColor = status === "Critical" ? "status-critical" : status === "Warning" ? "status-warning" : "status-healthy";

                return (
                  <tr key={partition.label}>
                    <td className="sector-name">{partition.displayLabel}</td>
                    <td>{formatCurrency(total)}</td>
                    <td className="committed">{formatCurrency(committed)}</td>
                    <td className="remaining">{formatCurrency(remaining)}</td>
                    <td><span className={`status-badge ${statusColor}`}>{status}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${utilization}%` }}></div>
                      </div>
                    </td>
                    <td className="description">{partition.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disaster Allocation Summary */}
      <div className="budget-section">
        <h2>Disaster Allocation Summary</h2>
        <p style={{ marginBottom: "1.5rem", color: "#718096" }}>
          Summary of disbursed allocations grouped by disaster type, showing total amounts and individual disaster details.
        </p>

        {loadingSummary ? (
          <p style={{ color: "#718096" }}>Loading summary...</p>
        ) : summaryItems.length === 0 ? (
          <p style={{ color: "#718096" }}>No disbursed allocations found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {summaryItems.map((typeSummary) => (
              <div
                key={typeSummary.type}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  backgroundColor: "white",
                }}
              >
                {/* Group Header Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    backgroundColor: "#f7fafc",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {/* Left: type + badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#2d3748" }}>
                      {typeSummary.type}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#718096",
                        backgroundColor: "#edf2f7",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                      }}
                    >
                      {(typeSummary.disasters?.length ?? 0)} disaster{(typeSummary.disasters?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Centre: aggregated stats */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      fontSize: "0.85rem",
                      color: "#4a5568",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Used: <strong style={{ color: "#2d3748" }}>{formatCurrency(typeSummary.totalAmount)}</strong>
                    </span>
                    <span>
                      Households: <strong style={{ color: "#2d3748" }}>{typeSummary.totalHouseholds?.toLocaleString() || 0}</strong>
                    </span>
                    <span>
                      Packages: <strong style={{ color: "#2d3748" }}>{typeSummary.totalPackages ?? 0}</strong>
                    </span>
                  </div>

                  {/* Right: toggle button */}
                  <button
                    onClick={() =>
                      setSelectedType(selectedType === typeSummary.type ? null : typeSummary.type)
                    }
                    style={{
                      padding: "0.4rem 0.9rem",
                      backgroundColor: selectedType === typeSummary.type ? "#e2e8f0" : "white",
                      border: "1px solid #cbd5e0",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "#4a5568",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedType === typeSummary.type ? "Hide Details" : "View Disaster Details"}
                  </button>
                </div>

                {/* Expandable Detail Table */}
                {selectedType === typeSummary.type && (
                  <div style={{ padding: "0 1.25rem 1.25rem" }}>
                    {(typeSummary.disasters?.length ?? 0) > 0 ? (
                      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
                        {typeSummary.disasters.map((disaster) => (
                          <div
                            key={disaster.id || disaster._id || `${typeSummary.type}-${typeSummary.totalAmount}`}
                            style={{
                              padding: "1rem",
                              border: "1px solid #e2e8f0",
                              borderRadius: "0.5rem",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "#2d3748" }}>
                              {disaster.incidentName || disaster.id || disaster._id}
                            </div>
                            <div style={{ color: "#4a5568", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                              Households: {(disaster.households || 0).toLocaleString()} | Packages: {disaster.packages || 0} | Amount: {formatCurrency(disaster.totalAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "1rem", color: "#4a5568", backgroundColor: "#f7fafc", borderRadius: "0.5rem" }}>
                        No detailed disaster records are available for this summary item.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}