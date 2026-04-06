import React, { useState, useEffect, useCallback } from "react";
import { Plus, Eye, FileText, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./AidAllocation.css";

// ─── Budget status banner shown at the top of the Allocation Plan tab ─────────
function BudgetBanner({ budget, onCreateBudget, creating }) {
  if (!budget) {
    return (
      <div style={{
        padding: "1rem 1.25rem",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "0.5rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <AlertTriangle size={18} color="#dc2626" />
          <div>
            <p style={{ margin: 0, fontWeight: "700", color: "#991b1b", fontSize: "0.9rem" }}>
              No budget found in database
            </p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#b91c1c" }}>
              A national budget must exist before fund allocations can be recorded.
            </p>
          </div>
        </div>
        <button
          onClick={onCreateBudget}
          disabled={creating}
          style={{
            padding: "0.5rem 1.1rem",
            backgroundColor: creating ? "#94a3b8" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: creating ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            fontWeight: "700",
            whiteSpace: "nowrap",
          }}
        >
          {creating ? "Creating…" : "Create Budget Now"}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: "0.75rem 1.25rem",
      backgroundColor: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: "0.5rem",
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <CheckCircle size={16} color="#15803d" />
        <span style={{ fontWeight: "700", color: "#15803d", fontSize: "0.85rem" }}>
          Budget Active — FY {budget.fiscalYear}
        </span>
      </div>
      {[
        ["Allocated",  `M${(budget.allocatedBudget  || 0).toLocaleString()}`, "#2563eb"],
        ["Committed",  `M${(budget.committedFunds   || 0).toLocaleString()}`, "#d97706"],
        ["Remaining",  `M${(budget.remainingBudget  || 0).toLocaleString()}`, "#059669"],
      ].map(([label, val, color]) => (
        <div key={label} style={{ fontSize: "0.8rem" }}>
          <span style={{ color: "#6b7280" }}>{label}: </span>
          <strong style={{ color }}>{val}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AidAllocation() {
  const [disasters, setDisasters]             = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [currentDisaster, setCurrentDisaster]   = useState(null);
  const [activeTab, setActiveTab]             = useState("assess");
  const [households, setHouseholds]           = useState([]);
  const [allocationPlans, setAllocationPlans] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [generatingPlan, setGeneratingPlan]   = useState(false);

  // Budget state
  const [budget, setBudget]           = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [creatingBudget, setCreatingBudget] = useState(false);

  // Allocation state
  const [allocatedIds, setAllocatedIds]   = useState(new Set());
  const [allocatingIds, setAllocatingIds] = useState(new Set());

  // ─── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBudget();
    fetchDisasters();
  }, []);

  useEffect(() => {
    if (selectedDisaster) {
      const disaster = disasters.find(d => d._id === selectedDisaster);
      setCurrentDisaster(disaster || null);
      setAllocationPlans([]);
      setAllocatedIds(new Set());
      fetchHouseholds();
    }
  }, [selectedDisaster, disasters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Budget ────────────────────────────────────────────────────────────────
const fetchBudget = async () => {
  setBudgetLoading(true);
  try {
    // FIXED: Remove /finance from the path
    const res = await API.get("/budget/current");
    setBudget(res.data);
    console.log("✅ Budget found:", res.data);
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn("⚠️ No budget in database — user must create one");
      setBudget(null);
    } else {
      console.error("Budget fetch error:", err.response?.data || err.message);
      setBudget(null);
    }
  } finally {
    setBudgetLoading(false);
  }
};
const handleCreateBudget = async () => {
  setCreatingBudget(true);
  try {
    console.log("Creating budget with payload:", {
      fiscalYear: new Date().getFullYear(),
      allocatedBudget: 82648374
    });
    
    // FIXED: Remove /finance from the path
    const res = await API.post("/budget/create", {
      fiscalYear: new Date().getFullYear(),
      allocatedBudget: 82648374,
    });
    
    console.log("Budget created response:", res.data);
    setBudget(res.data);
    ToastManager.success(`✅ Budget created for FY ${res.data.fiscalYear} — M${(res.data.allocatedBudget || 0).toLocaleString()}`);
  } catch (err) {
    console.error("❌ Budget creation error:", err);
    console.error("Error response:", err.response?.data);
    console.error("Error status:", err.response?.status);
    
    if (err.response?.status === 409) {
      ToastManager.info("Budget already exists — refreshing…");
      await fetchBudget();
    } else if (err.response?.status === 403) {
      ToastManager.error("Only Finance Officers can create a budget.");
    } else if (err.response?.status === 404) {
      ToastManager.error("Budget endpoint not found. Check if backend is running.");
    } else {
      ToastManager.error(err.response?.data?.message || "Failed to create budget");
    }
  } finally {
    setCreatingBudget(false);
  }
};

  // ─── Disasters & Households ────────────────────────────────────────────────
  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      const approved = res.data.filter(d => d.status === "verified" || d.status === "responding");
      setDisasters(approved);
      if (approved.length > 0) setSelectedDisaster(approved[0]._id);
    } catch (err) {
      console.error("fetchDisasters:", err);
      ToastManager.error("Failed to load disasters");
    }
  };

  const fetchHouseholds = useCallback(async () => {
    if (!selectedDisaster) return;
    setLoading(true);
    try {
      const res = await API.get(`/allocation/assessments/${selectedDisaster}`);
      setHouseholds(res.data.assessments || res.data || []);
    } catch (err) {
      console.error("fetchHouseholds:", err);
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDisaster]);

  // ─── Scoring engine ────────────────────────────────────────────────────────
  const calculateVulnerabilityScore = (hh) => {
    let score = 0;
    if (parseInt(hh.headOfHousehold?.age || hh.age || 0) > 65) score += 2;
    if (parseInt(hh.childrenUnder5 || 0) > 0) score += 2;
    if (parseInt(hh.householdSize || 0) > 6) score += 2;
    const income = parseFloat(hh.monthlyIncome) || 0;
    if (income <= 3000) score += 3;
    else if (income <= 10000) score += 1;
    return score;
  };

  const getAssistancePackages = (hh) => {
    const damageScore    = hh.damageSeverityLevel || 1;
    const vulnScore      = calculateVulnerabilityScore(hh);
    const compositeScore = damageScore + vulnScore;
    const disasterType   = (hh.disasterType || currentDisaster?.type || "").toLowerCase();
    const income         = parseFloat(hh.monthlyIncome) || 0;
    const householdSize  = parseInt(hh.householdSize) || 1;

    if (compositeScore <= 2 && damageScore === 1 && income > 10000 && householdSize <= 3) {
      return { packages: [], totalCost: 0, tier: "No Assistance Required", compositeScore };
    }

    let tier = "", packages = [];
    const isDrought = disasterType.includes("drought");

    if (isDrought) {
      if      (compositeScore >= 10) { tier = "Priority Support";  packages = [{ name: "Water Tank (5,000L)", cost: 6000 }, { name: "Food Parcel", cost: 1500 }]; }
      else if (compositeScore >= 7)  { tier = "Extended Support";  packages = [{ name: "Water Tank (5,000L)", cost: 6000 }, { name: "Food Parcel", cost: 1500 }]; }
      else if (compositeScore >= 4)  { tier = "Basic Support";     packages = [{ name: "Water Tank (5,000L)", cost: 6000 }, { name: "Food Parcel", cost: 1500 }]; }
      else                           { tier = "Minimal Support";   packages = [{ name: "Food Parcel", cost: 1500 }]; }
    } else {
      if      (compositeScore >= 10) { tier = "Priority Reconstruction + Livelihood"; packages = [{ name: "Reconstruction Grant", cost: 75000 }, { name: "Emergency Tent", cost: 6500 }, { name: "Tarpaulin Kit", cost: 2000 }, { name: "Food Parcel", cost: 1500 }, { name: "Blanket & Clothing Pack", cost: 1500 }, { name: "Medical Aid Kit", cost: 1000 }]; }
      else if (compositeScore >= 7)  { tier = "Tent + Reconstruction + Food";        packages = [{ name: "Emergency Tent", cost: 6500 }, { name: "Re-roofing Kit", cost: 18000 }, { name: "Tarpaulin Kit", cost: 2000 }, { name: "Food Parcel", cost: 1500 }, { name: "Blanket & Clothing Pack", cost: 1500 }]; }
      else if (compositeScore >= 4)  { tier = "Shelter + Food";                      packages = [{ name: "Tarpaulin Kit", cost: 2000 }, { name: "Emergency Tent", cost: 6500 }, { name: "Food Parcel", cost: 1500 }, { name: "Medical Aid Kit", cost: 1000 }]; }
      else                           { tier = "Basic Support";                        packages = [{ name: "Tarpaulin Kit", cost: 2000 }, { name: "Food Parcel", cost: 1500 }, { name: "Blanket & Clothing Pack", cost: 1500 }, { name: "Medical Aid Kit", cost: 1000 }]; }
    }

    return { packages, totalCost: packages.reduce((s, p) => s + p.cost, 0), tier, compositeScore };
  };

  // ─── Generate plan ─────────────────────────────────────────────────────────
  const generateAllocationPlan = () => {
    setGeneratingPlan(true);
    try {
      const plans = households.map((hh, idx) => {
        const damageScore    = hh.damageSeverityLevel || 1;
        const vulnScore      = calculateVulnerabilityScore(hh);
        const compositeScore = damageScore + vulnScore;
        const { packages, totalCost, tier } = getAssistancePackages(hh);
        return {
          id:           hh._id || String(idx),
          assessmentId: hh._id,
          hhId:         hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
          head:         hh.headOfHousehold?.name || hh.householdHeadName || "Unknown",
          district:     currentDisaster?.district || "N/A",
          damage:       getSeverityLabel(damageScore),
          damageScore,
          vulnerability: vulnScore,
          compositeScore,
          tier,
          packages,
          totalCost,
        };
      });
      plans.sort((a, b) => b.compositeScore - a.compositeScore);
      setAllocationPlans(plans);
      ToastManager.success(`Allocation plan generated for ${plans.length} household(s)`);
    } catch (err) {
      console.error("generateAllocationPlan:", err);
      ToastManager.error("Failed to generate allocation plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─── Allocate button handler ───────────────────────────────────────────────
 const handleAllocate = async (plan) => {
    if (allocatedIds.has(plan.id))  return;
    if (allocatingIds.has(plan.id)) return;

    // Guard: must have a budget before allocating
    if (!budget) {
      ToastManager.error("No active budget. Click 'Create Budget Now' above first.");
      return;
    }

    console.log("ALLOCATE →", plan.hhId, "M" + plan.totalCost, "disaster:", selectedDisaster);
    setAllocatingIds(prev => new Set([...prev, plan.id]));

    const packageList = plan.packages.map(p => `${p.name} (M${p.cost.toLocaleString()})`).join(", ");

    const payload = {
      incidentId:      selectedDisaster,
      requestedAmount: plan.totalCost,
      category:        "Aid Allocation",
      urgency:         plan.compositeScore >= 10 ? "Critical" : plan.compositeScore >= 7 ? "Urgent" : "Normal",
      purpose:         `${plan.tier} — ${plan.hhId} (${plan.head}): ${packageList}`,
      notes:           `HH: ${plan.hhId} | Head: ${plan.head} | Score: ${plan.compositeScore} | Tier: ${plan.tier}`,
    };

    // FIXED: Changed from "/finance/request" to "/request"
    console.log("POST /request:", JSON.stringify(payload, null, 2));

    try {
      const res = await API.post("/request", payload);
      console.log("✅ Allocation recorded:", res.status, res.data);

      // Update local budget state so the banner reflects the new committed amount
      setBudget(prev => prev ? {
        ...prev,
        committedFunds:  (prev.committedFunds  || 0) + plan.totalCost,
        remainingBudget: (prev.remainingBudget || 0) - plan.totalCost,
      } : prev);

      setAllocatedIds(prev => new Set([...prev, plan.id]));
      ToastManager.success(`✅ Allocated to ${plan.head} — M${plan.totalCost.toLocaleString()}`);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message;
      console.error("❌ Allocate error:", status, msg, err.response?.data);

      if (!err.response) {
        ToastManager.error("Cannot reach server — is the backend running?");
      } else if (status === 400) {
        ToastManager.error(`Validation error: ${msg}`);
      } else if (status === 401) {
        ToastManager.error("Session expired — please log in again.");
      } else if (status === 403) {
        ToastManager.error("Permission denied — Finance Officer role required.");
      } else if (status === 404) {
        // Budget was deleted between check and request — re-fetch and show banner
        ToastManager.error("Budget not found. Please create a budget using the banner above.");
        setBudget(null);
        // Optionally trigger a budget refresh
        fetchBudget();
      } else if (status === 500) {
        ToastManager.error(`Server error: ${msg}`);
      } else {
        ToastManager.error(`Failed (${status}): ${msg}`);
      }
    } finally {
      setAllocatingIds(prev => { const n = new Set(prev); n.delete(plan.id); return n; });
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getSeverityLabel = (l) => ({ 1:"Minor", 2:"Moderate", 3:"Severe", 4:"Catastrophic" }[l] || "Unknown");
  const getSeverityClass = (l) => ({ 1:"minor", 2:"moderate", 3:"severe", 4:"catastrophic" }[l] || "minor");
  const getIncomeCategory = (income) => { const i = parseFloat(income)||0; return i<=3000?"Low":i<=10000?"Middle":"High"; };

  const allocatedCost    = allocationPlans.filter(p => allocatedIds.has(p.id)).reduce((s,p) => s+p.totalCost, 0);
  const eligibleCount    = allocationPlans.filter(p => p.tier !== "No Assistance Required").length;
  const allocatedCount   = allocationPlans.filter(p => allocatedIds.has(p.id)).length;
  const progressPct      = eligibleCount > 0 ? Math.round((allocatedCount / eligibleCount) * 100) : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="aid-allocation">
      <div className="aid-allocation-content">

        {/* Disaster Selector */}
        <div className="disaster-selector-section">
          <div className="selector-content">
            <label>Disaster:</label>
            <select value={selectedDisaster} onChange={e => setSelectedDisaster(e.target.value)} className="disaster-select">
              <option value="">Select an approved disaster…</option>
              {disasters.map(d => (
                <option key={d._id} value={d._id}>
                  {d.disasterCode || `D-${d._id.slice(-4)}`} — {d.type} ({d.district})
                </option>
              ))}
            </select>
          </div>
          <div className="household-count">
            <span>
              {households.length}
              {currentDisaster?.numberOfHouseholdsAffected ? ` of ${currentDisaster.numberOfHouseholdsAffected}` : ""} household(s) assessed
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <button className={`tab-btn ${activeTab==="assess"?"active":""}`} onClick={() => setActiveTab("assess")}>
            <Plus size={18}/> Assess Household
          </button>
          <button className={`tab-btn ${activeTab==="plan"?"active":""}`} onClick={() => setActiveTab("plan")}>
            <FileText size={18}/> Allocation Plan
          </button>
          <button className={`tab-btn ${activeTab==="summary"?"active":""}`} onClick={() => setActiveTab("summary")}>
            <Eye size={18}/> Summary Dashboard
          </button>
        </div>

        {/* ── TAB: Assess Household ── */}
        {activeTab === "assess" && (
          <div className="tab-content">
            {households.length === 0 ? (
              <div className="placeholder-section">
                <h3>Assessed Households</h3>
                <p>Household assessment data from approved disasters will appear here after coordinator approval</p>
              </div>
            ) : (
              <div className="households-table-section">
                <h3>Assessed Households from Approved Disaster</h3>
                <div className="households-table-wrapper">
                  <table className="households-table">
                    <thead>
                      <tr>
                        <th>Household Head</th><th>Gender</th><th>Age</th><th>Size</th>
                        <th>Monthly Income</th><th>Income Category</th><th>Damage Severity</th><th>Damage Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {households.map((hh, idx) => (
                        <tr key={hh._id || idx}>
                          <td className="font-medium">{hh.headOfHousehold?.name || hh.householdHeadName}</td>
                          <td>{hh.headOfHousehold?.gender || hh.gender}</td>
                          <td>{hh.headOfHousehold?.age || hh.age}</td>
                          <td>{hh.householdSize}</td>
                          <td>M {parseFloat(hh.monthlyIncome).toLocaleString()}</td>
                          <td><span className={`income-badge ${getIncomeCategory(hh.monthlyIncome).toLowerCase()}`}>{getIncomeCategory(hh.monthlyIncome)}</span></td>
                          <td><span className={`severity-badge ${getSeverityClass(hh.damageSeverityLevel)}`}>{getSeverityLabel(hh.damageSeverityLevel)}</span></td>
                          <td>{hh.damageDescription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Allocation Plan ── */}
        {activeTab === "plan" && (
          <div className="tab-content">

            {/* Budget banner — always visible on this tab */}
            {budgetLoading ? (
              <div style={{ padding:"0.75rem 1rem", backgroundColor:"#f1f5f9", borderRadius:"0.5rem", fontSize:"0.85rem", color:"#64748b", marginBottom:"1rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <DollarSign size={15}/> Checking budget status…
              </div>
            ) : (
              <BudgetBanner
                budget={budget}
                onCreateBudget={handleCreateBudget}
                creating={creatingBudget}
              />
            )}

            {households.length === 0 ? (
              <div className="placeholder-section">
                <h3>Allocation Plan</h3>
                <p>Select a disaster and assess households first to generate allocation plans</p>
              </div>
            ) : (
              <div className="allocation-plan-section">
                <div className="plan-header">
                  <div>
                    <h3>Aid Allocation Plan — {currentDisaster?.disasterCode || "Selected Disaster"}</h3>
                    <p className="plan-subtitle">{households.length} households assessed</p>
                  </div>
                  <button className="btn-generate-plan" onClick={generateAllocationPlan} disabled={generatingPlan}>
                    {generatingPlan ? "Generating…" : "Generate Allocation Plan"}
                  </button>
                </div>

                {allocationPlans.length > 0 ? (
                  <>
                    {/* Allocation progress */}
                    {eligibleCount > 0 && (
                      <div style={{ padding:"0.75rem 1rem", backgroundColor:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"0.5rem", marginBottom:"1rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.82rem", color:"#1d4ed8", marginBottom:"0.35rem" }}>
                          <span><strong>{allocatedCount}</strong> of <strong>{eligibleCount}</strong> eligible households allocated</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div style={{ height:"6px", backgroundColor:"#dbeafe", borderRadius:"9999px", overflow:"hidden" }}>
                          <div style={{ height:"100%", backgroundColor:"#2563eb", borderRadius:"9999px", width:`${progressPct}%`, transition:"width 0.4s ease" }}/>
                        </div>
                      </div>
                    )}

                    <div className="allocation-table-wrapper">
                      <table className="allocation-table">
                        <thead>
                          <tr>
                            <th>HH ID</th><th>Head</th><th>District</th><th>Damage</th>
                            <th>Damage Score</th><th>Vuln. Score</th><th>Composite Score</th>
                            <th>Tier</th><th>Packages</th><th>Total Cost</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocationPlans.map(plan => {
                            const allocated  = allocatedIds.has(plan.id);
                            const allocating = allocatingIds.has(plan.id);
                            const noAid      = plan.tier === "No Assistance Required";

                            return (
                              <tr key={plan.id} style={{ backgroundColor: allocated ? "#f0fdf4" : "white" }}>
                                <td className="font-mono">{plan.hhId}</td>
                                <td className="font-medium">{plan.head}</td>
                                <td>{plan.district}</td>
                                <td>{plan.damage}</td>
                                <td className="text-center">{plan.damageScore}</td>
                                <td className="text-center">{plan.vulnerability}</td>
                                <td className="text-center font-bold">{plan.compositeScore}</td>
                                <td><span className="tier-badge">{plan.tier}</span></td>
                                <td>
                                  {plan.packages.length === 0 ? (
                                    <span className="no-assistance">No assistance required</span>
                                  ) : (
                                    <div className="packages-list">
                                      {plan.packages.map((pkg, i) => (
                                        <div key={i} className="package-item">
                                          <span className="package-name">{pkg.name}</span>
                                          <span className="package-cost">M{pkg.cost.toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right font-bold">
                                  {plan.totalCost === 0 ? "—" : `M${plan.totalCost.toLocaleString()}`}
                                </td>
                                <td>
                                  {noAid ? null : allocated ? (
                                    <span style={{
                                      display:"inline-flex", alignItems:"center", gap:"0.3rem",
                                      padding:"0.35rem 0.75rem",
                                      backgroundColor:"#dcfce7", color:"#15803d",
                                      border:"1px solid #86efac", borderRadius:"0.375rem",
                                      fontSize:"0.8rem", fontWeight:"700", whiteSpace:"nowrap",
                                    }}>
                                      ✓ Allocated
                                    </span>
                                  ) : (
                                    <button
                                      className="btn-action"
                                      onClick={() => handleAllocate(plan)}
                                      disabled={allocating || !budget}
                                      title={!budget ? "Create a budget first" : ""}
                                      style={{
                                        opacity: (allocating || !budget) ? 0.5 : 1,
                                        cursor: (allocating || !budget) ? "not-allowed" : "pointer",
                                        minWidth: "90px",
                                      }}
                                    >
                                      {allocating ? "…" : "✓ Allocate"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="plan-summary">
                        <div className="summary-item"><span>Total Households:</span><span className="summary-value">{allocationPlans.length}</span></div>
                        <div className="summary-item"><span>Households Receiving Aid:</span><span className="summary-value">{eligibleCount}</span></div>
                        <div className="summary-item"><span>Allocated This Session:</span><span className="summary-value" style={{color:"#15803d"}}>{allocatedCount}</span></div>
                        <div className="summary-item"><span>Total Budget Required:</span><span className="summary-value">M{allocationPlans.reduce((s,p)=>s+p.totalCost,0).toLocaleString()}</span></div>
                        <div className="summary-item"><span>Allocated So Far:</span><span className="summary-value" style={{color:"#15803d"}}>M{allocatedCost.toLocaleString()}</span></div>
                        <div className="summary-item"><span>Average Composite Score:</span><span className="summary-value">{allocationPlans.length>0?(allocationPlans.reduce((s,p)=>s+p.compositeScore,0)/allocationPlans.length).toFixed(1):"—"}</span></div>
                        <div className="summary-item"><span>Highest Priority:</span><span className="summary-value">{allocationPlans[0]?.head} (Score: {allocationPlans[0]?.compositeScore})</span></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="placeholder-section">
                    <p>Click "Generate Allocation Plan" to create an allocation plan for the assessed households</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Summary Dashboard ── */}
        {activeTab === "summary" && (
          <div className="tab-content">
            {allocationPlans.length === 0 ? (
              <div className="placeholder-section">
                <h3>Summary Dashboard</h3>
                <p>Generate an allocation plan first to view the summary dashboard</p>
              </div>
            ) : (
              <div className="summary-dashboard">
                <h3>Allocation Summary — {currentDisaster?.disasterCode || "Selected Disaster"}</h3>

                <div className="summary-cards">
                  <div className="summary-card"><p className="card-label">Total Households</p><p className="card-value">{allocationPlans.length}</p></div>
                  <div className="summary-card"><p className="card-label">Receiving Aid</p><p className="card-value">{eligibleCount}</p></div>
                  <div className="summary-card"><p className="card-label">Allocated This Session</p><p className="card-value" style={{color:"#15803d"}}>{allocatedCount}</p></div>
                  <div className="summary-card"><p className="card-label">Total Budget Required</p><p className="card-value">M{allocationPlans.reduce((s,p)=>s+p.totalCost,0).toLocaleString()}</p></div>
                  <div className="summary-card"><p className="card-label">Allocated So Far</p><p className="card-value" style={{color:"#15803d"}}>M{allocatedCost.toLocaleString()}</p></div>
                  <div className="summary-card"><p className="card-label">No Assistance Required</p><p className="card-value">{allocationPlans.filter(p=>p.tier==="No Assistance Required").length}</p></div>
                </div>

                {/* Live budget snapshot on summary tab */}
                {budget && (
                  <div style={{ margin:"1.5rem 0 1rem", padding:"1rem 1.25rem", backgroundColor:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:"0.5rem" }}>
                    <h4 style={{ margin:"0 0 0.75rem", fontSize:"0.9rem", fontWeight:"700", color:"#1f2937" }}>
                      National Budget — FY {budget.fiscalYear}
                    </h4>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"0.75rem" }}>
                      {[["Allocated","#2563eb",budget.allocatedBudget],["Committed","#d97706",budget.committedFunds],["Remaining","#059669",budget.remainingBudget]].map(([label,color,val])=>(
                        <div key={label} style={{ backgroundColor:"white", border:"1px solid #e5e7eb", borderRadius:"0.375rem", padding:"0.625rem 0.875rem" }}>
                          <p style={{ margin:"0 0 0.2rem", fontSize:"0.7rem", fontWeight:"700", color:"#9ca3af", textTransform:"uppercase" }}>{label}</p>
                          <p style={{ margin:0, fontSize:"1rem", fontWeight:"700", color }}>M{(val||0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="tier-breakdown">
                  <h4>Breakdown by Aid Tier</h4>
                  {["Priority Reconstruction + Livelihood","Tent + Reconstruction + Food","Shelter + Food","Basic Support","Priority Support","Extended Support","Minimal Support","No Assistance Required"].map(tier => {
                    const group = allocationPlans.filter(p => p.tier === tier);
                    if (group.length === 0) return null;
                    const cost = group.reduce((s,p) => s+p.totalCost, 0);
                    const done = group.filter(p => allocatedIds.has(p.id)).length;
                    return (
                      <div key={tier} className="tier-row">
                        <span className="tier-name">{tier}</span>
                        <span className="tier-count">{group.length} households</span>
                        <span className="tier-cost">{cost===0?"—":`M${cost.toLocaleString()}`}</span>
                        <span style={{ fontSize:"0.8rem", color: done===group.length&&done>0?"#15803d":"#d97706", fontWeight:"600" }}>
                          {done}/{group.length} allocated
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}