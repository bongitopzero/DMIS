import React, { useState, useEffect, useCallback } from "react";
import { Plus, Eye, FileText, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./AidAllocation.css";

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
              No budget found
            </p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#b91c1c" }}>
              Create budget for allocations.
            </p>
          </div>
        </div>
        <button onClick={onCreateBudget} disabled={creating} style={{
          padding: "0.5rem 1.1rem",
          backgroundColor: creating ? "#94a3b8" : "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: "700"
        }}>
          {creating ? "Creating…" : "Create Budget"}
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
        <span style={{ fontWeight: "700", color: "#15803d" }}>
          FY {budget.fiscalYear}
        </span>
      </div>
      <div style={{ fontSize: "0.8rem" }}>
        Allocated: M{budget.allocatedBudget?.toLocaleString()}
      </div>
      <div style={{ fontSize: "0.8rem" }}>
        Committed: M{budget.committedFunds?.toLocaleString()}
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#059669" }}>
        Remaining: M{budget.remainingBudget?.toLocaleString()}
      </div>
    </div>
  );
}

export default function AidAllocation() {
  const [budget, setBudget] = useState(null);
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [allocationPlans, setAllocationPlans] = useState([]);
  const [allocatedPlans, setAllocatedPlans] = useState(new Set());
const [allocatedDisasters, setAllocatedDisasters] = useState([]);
  const [activeTab, setActiveTab] = useState('assess');
  const [householdsLoading, setHouseholdsLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [allocating, setAllocating] = useState(false);
  // const [disbursing, setDisbursing] = useState(false); // Removed disbursing
  const [noAssistanceCount, setNoAssistanceCount] = useState(0);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingBudget, setCreatingBudget] = useState(false);

useEffect(() => {
    fetchBudget();
    fetchDisasters();
  }, []);

  useEffect(() => {
    if (selectedDisaster) {
      fetchHouseholds();
    }
  }, [selectedDisaster]);

  const fetchBudget = async () => {
    setLoading(true);
    try {
      const res = await API.get("/budget/current");
      setBudget(res.data);
    } catch (err) {
      setBudget(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    setCreatingBudget(true);
    try {
      const res = await API.post("/budget/create", {
        fiscalYear: new Date().getFullYear(),
        allocatedBudget: 82648374,
      });
      setBudget(res.data);
      ToastManager.success("Budget created");
    } catch (err) {
      ToastManager.error("Budget creation failed");
    } finally {
      setCreatingBudget(false);
    }
  };

const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      setDisasters(res.data.filter(d => d.status === 'verified'));
    } catch (err) {
      console.error(err);
    }
  };

const fetchHouseholds = async () => {
    if (!selectedDisaster) return;
    setHouseholdsLoading(true);
    try {
      const res = await API.get(`/allocation/assessments/${selectedDisaster}`);
      setHouseholds(res.data.assessments || res.data || []);
    } catch (err) {
      console.error(err);
      setHouseholds([]);
    } finally {
      setHouseholdsLoading(false);
    }
  };

  const calculateVulnerabilityScore = useCallback((hh) => {
    let score = 0;
    const age = hh.headOfHousehold?.age || 0;
    const size = hh.householdSize || 0;
    const monthlyIncome = hh.monthlyIncome || 0;
    const childrenUnder5 = hh.childrenUnder5 || 0;

    if (age > 65) score += 2;
    if (childrenUnder5 > 0) score += 2;
    if (size > 6) score += 2;
    if (monthlyIncome <= 3000) score += 3;
    else if (monthlyIncome <= 10000) score += 1;

    return score;
  }, []);

  const generatePlan = async () => {
    if (households.length === 0) {
      ToastManager.error('No households - select disaster first');
      return;
    }
    setGeneratingPlan(true);
    try {
      console.log('Households for plan:', households);
      const scoredHouseholds = households.map(hh => {
        const vuln = calculateVulnerabilityScore(hh);
        const damage = hh.damageSeverity || 1;
        const composite = damage + vuln;
        return {
          ...hh,
          vulnScore: vuln,
          damageLevel: damage,
          compositeScore: composite,
        };
      }).sort((a, b) => b.compositeScore - a.compositeScore);

      let noAssist = 0;
      const plans = scoredHouseholds.map(hh => {
        // No assistance condition
        if (hh.compositeScore <= 2 && hh.damageLevel === 1 && hh.monthlyIncome > 10000 && hh.householdSize <= 3) {
          noAssist++;
          return null;
        }

        const disasterType = disasters.find(d => d._id === selectedDisaster)?.type || 'Drought';
        const pkg = getPackageByScoreAndDisaster(hh.compositeScore, disasterType);
        
        return {
          id: hh._id || Math.random().toString(),
          hhId: hh.householdId || `HH${Math.floor(Math.random() * 1000)}`,
          head: hh.headOfHousehold?.name || 'Unknown Head',
          vulnScore: hh.vulnScore,
          compositeScore: hh.compositeScore,
          tier: pkg.tier,
          packages: pkg.packages,
          totalCost: pkg.total,
          disasterType,
        };
      }).filter(Boolean);

      console.log('Generated plans:', plans.slice(0, 3));
      setAllocationPlans(plans);
      setNoAssistanceCount(noAssist);
      ToastManager.success(`Generated ${plans.length} plans (${noAssist} no assistance)`);
    } catch (err) {
      console.error('Generate plan error:', err);
      ToastManager.error('Plan generation failed: ' + err.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const getPackageByScoreAndDisaster = useCallback((compositeScore, disasterType) => {
    // Extract disaster type from selectedDisaster or default
    const type = disasterType || 'Drought';
    
    if (type === 'Drought') {
      if (compositeScore >= 10) return { tier: 'Priority Support', packages: [{name: 'Water Tank', cost: 6000}, {name: 'Food Parcel', cost: 1500}], total: 7500 };
      if (compositeScore >= 7) return { tier: 'Extended Support', packages: [{name: 'Water Tank', cost: 6000}, {name: 'Food Parcel', cost: 1500}], total: 7500 };
      if (compositeScore >= 4) return { tier: 'Basic Support', packages: [{name: 'Water Tank', cost: 6000}, {name: 'Food Parcel', cost: 1500}], total: 7500 };
      return { tier: 'Minimal Support', packages: [{name: 'Food Parcel', cost: 1500}], total: 1500 };
    } else if (type === 'Heavy Rainfall' || type === 'Flooding') {
      if (compositeScore >= 10) return { tier: 'Priority Reconstruction + Livelihood', packages: [{name: 'Full Reconstruction + Livelihood', cost: 87500}], total: 87500 };
      if (compositeScore >= 7) return { tier: 'Tent + Reconstruction + Food', packages: [{name: 'Tent + Reconstruction', cost: 29500}], total: 29500 };
      if (compositeScore >= 4) return { tier: 'Shelter + Food', packages: [{name: 'Shelter + Food', cost: 11000}], total: 11000 };
      return { tier: 'Basic Support', packages: [{name: 'Basic Shelter', cost: 6000}], total: 6000 };
    } else { // Winds, Other
      if (compositeScore >= 10) return { tier: 'Priority Reconstruction', packages: [{name: 'Full Reconstruction', cost: 50000}], total: 50000 };
      if (compositeScore >= 7) return { tier: 'Tent + Repair', packages: [{name: 'Tent + Roof Repair', cost: 25000}], total: 25000 };
      if (compositeScore >= 4) return { tier: 'Basic Repair', packages: [{name: 'Basic Repair', cost: 10000}], total: 10000 };
      return { tier: 'Minimal', packages: [{name: 'Emergency Supplies', cost: 5000}], total: 5000 };
    }
  }, []); 

  const allocate = async (plan) => {
    if (allocatedPlans.has(plan.id)) return;
    try {
      console.log('Allocating plan:', plan);
      setAllocating(true);
      const response = await API.post("/request", {
        incidentId: selectedDisaster,
        requestedAmount: plan.totalCost,
        category: "Aid Allocation",
        urgency: plan.compositeScore >= 10 ? "Critical" : plan.compositeScore >= 7 ? "Urgent" : "Normal",
        purpose: `${plan.tier} packages for ${plan.hhId}: ${plan.packages.map(p => p.name).join(', ')}`,
        notes: `Vuln score: ${plan.vulnScore}, Composite: ${plan.compositeScore}, Disaster: ${plan.disasterType}`,
        householdId: plan.hhId
      });
      
      console.log('Allocation response:', response.data);
      
      // Avoid duplicate by checking if request already exists for this household/disaster combo
      const requestId = response.data._id;
      if (allocatedPlans.has(requestId)) return; // Duplicate prevented backend-side
      
      setAllocatedPlans(prev => new Set([...prev, plan.id]));
      
      if (Array.from(allocatedPlans).length + 1 === allocationPlans.length) {
        setAllocatedDisasters(prev => new Set([...prev, selectedDisaster]));
        ToastManager.success(`All ${allocationPlans.length} households allocated! Check Finance Audit Trail`);
      } else {
        ToastManager.success(`Allocated ✓ M${plan.totalCost.toLocaleString()} - See Finance Audit Trail`);
      }
      
      await fetchBudget();
    } catch (err) {
      console.error('Allocation error:', err.response || err);
      if (err.response?.status === 409) { // Duplicate
        ToastManager.warning('Already allocated - check Finance Audit Trail');
      } else {
        ToastManager.error('Allocation failed: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setAllocating(false);
    }
  };

  // Removed disburse function - allocation directly records expenditure and audit

  return (
    <div className="aid-allocation">
      <div className="page-header">
        <h1>Aid Allocation</h1>
        <p className="subtitle">Generate vulnerability-based aid packages for verified disasters</p>
      </div>
      
      {BudgetBanner({ budget, onCreateBudget: handleCreateBudget, creating: creatingBudget })}
      
      {/* Disaster Selector */}
      <div className="disaster-selector-section">
        <div className="selector-content">
          <label>Select Verified Disaster:</label>
          <select 
            value={selectedDisaster} 
            onChange={(e) => setSelectedDisaster(e.target.value)}
            className="disaster-select"
            disabled={householdsLoading}
          >
            <option value="">Choose disaster to assess households...</option>
{disasters.map(d => (
              <option key={d._id} value={d._id}>
                {d.type} - {d.district} ({d.numberOfHouseholdsAffected || 0} households){d.allocatedAid && ' (Allocated)'}
              </option>
            ))}
          </select>
        </div>
        {households.length > 0 && (
          <div className="household-count">
            {households.length} households loaded • {generatingPlan ? 'Generating...' : 'Ready for allocation plan'}
          </div>
        )}
      </div>

      {/* Tabs */}
      {selectedDisaster && (
        <div className="tabs-section">
          <button 
            className={`tab-btn ${activeTab === 'assess' ? 'active' : ''}`}
            onClick={() => setActiveTab('assess')}
          >
            <Eye className="w-4 h-4" />
            Household Assessment
          </button>
          <button 
            className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            <FileText className="w-4 h-4" />
            Allocation Plan
          </button>
          <button 
            className={`tab-btn ${activeTab === 'allocate' ? 'active' : ''}`}
            onClick={() => setActiveTab('allocate')}
          >
            <DollarSign className="w-4 h-4" />
            Allocate Aid
          </button>
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <DollarSign className="w-4 h-4" />
            Summary Dashboard
          </button>
        </div>
      )}

      {/* Tab Content */}
      {selectedDisaster && (
        <div className="tab-content">
          {activeTab === 'assess' && (
            <div>
              <div className="households-table-section">
                <h3>Assessed Households ({households.length})</h3>
                {householdsLoading ? (
                  <div className="placeholder-section">
                    <div className="spinner" />
                    <p>Loading households...</p>
                  </div>
                ) : households.length === 0 ? (
                  <div className="placeholder-section">
                    <h3>No households found</h3>
                    <p>This disaster has no assessments yet.</p>
                  </div>
                ) : (
                  <div className="households-table-wrapper">
                    <table className="households-table">
                      <thead>
                        <tr>
                          <th>Household Head</th>
                          <th>Gender</th>
                          <th>Age</th>
                          <th>Size</th>
                          <th>Monthly Income</th>
                          <th>Income Category</th>
                          <th>Damage Severity</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {households.slice(0, 20).map((hh, i) => (
                          <tr key={hh._id || i}>
                            <td className="font-medium">{hh.headOfHousehold?.name || 'N/A'}</td>
                            <td>{hh.headOfHousehold?.gender || 'N/A'}</td>
                            <td>{hh.headOfHousehold?.age || 'N/A'}</td>
                            <td>{hh.householdSize || 'N/A'}</td>
                            <td>M{(hh.monthlyIncome || 0).toLocaleString()}</td>
                            <td>
                              <span className={`income-badge income-badge-${hh.incomeCategory?.toLowerCase() || 'low'}`}>
                                {hh.incomeCategory || 'Low'}
                              </span>
                            </td>
                            <td>
                              <span className={`severity-badge severity-badge-${hh.damageSeverity?.toLowerCase().replace(' ', '-') || 'no-damage'}`}>
                                {hh.damageSeverity || 'No Damage'}
                              </span>
                            </td>
                            <td className="text-sm">{hh.damageDescription?.substring(0, 100)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div>
              <div className="allocation-plan-section">
                <div className="plan-header">
                  <div>
                    <h3>Allocation Plan ({allocationPlans.length} households)</h3>
                    <p className="plan-subtitle">Sorted by composite vulnerability score | Total cost: M{allocationPlans.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={generatePlan}
                    disabled={generatingPlan || households.length === 0 || !budget}
                    className="btn-generate-plan"
                  >
                    {generatingPlan ? 'Generating...' : 'Generate Allocation Plan'}
                  </button>
                </div>
                {allocationPlans.length === 0 ? (
                  <div className="placeholder-section">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3>No allocation plan</h3>
                    <p>Generate vulnerability-based aid packages for all households</p>
                    {!budget && <p className="text-sm text-red-600 mt-2">Create budget first</p>}
                  </div>
                ) : (
                  <div>
                    <div className="allocation-table-wrapper">
                      <table className="allocation-table">
                        <thead>
                          <tr>
                            <th>Household</th>
                            <th>Score</th>
                            <th>Tier</th>
                            <th>Packages</th>
                            <th>Cost</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocationPlans.slice(0, 50).map((plan) => (
                            <tr key={plan.id}>
                              <td>{plan.hhId} - {plan.head}</td>
                              <td className="font-mono">{plan.compositeScore}</td>
                              <td><span className="status-badge status-proposed">{plan.tier}</span></td>
                              <td>
                                <div className="packages-list">
                                  {plan.packages.map((pkg, i) => (
                                    <div key={i} className="package-item">
                                      <span className="package-name">{pkg.name}</span>
                                      <span className="package-cost">M{pkg.cost.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="font-mono font-semibold">M{plan.totalCost.toLocaleString()}</td>
                              <td>
                                {!budget ? (
                                  <span className="text-sm text-gray-500">No budget</span>
                                ) : (
          <button 
            className={`btn-action ${allocatedPlans.has(plan.id) ? 'btn-allocated' : ''}`}
            onClick={() => {
              console.log('Button clicked for plan:', plan);
              allocate(plan);
            }}
            disabled={allocating || allocatedPlans.has(plan.id)}
          >
            {allocatedPlans.has(plan.id) ? 'Allocated ✓' : 'Allocate'}
          </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="plan-summary">
                      <div className="summary-item">
                        <span>Total Households</span>
                        <span className="summary-value">{allocationPlans.length}</span>
                      </div>
                      <div className="summary-item">
                        <span>Total Required</span>
                        <span className="summary-value">M{allocationPlans.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}</span>
                      </div>
                      {noAssistanceCount > 0 && (
                        <div className="summary-item">
                          <span>No Assistance</span>
                          <span className="summary-value">{noAssistanceCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

{activeTab === 'summary' && (
            <div className="allocation-summary-grid">
              <div className="allocation-summary-card">
                <span className="summary-label">Total Households</span>
                <span className="summary-main">
                  <span className="summary-number">{households.length}</span>
                </span>
                <span className="summary-caption">Assessed in selected disaster</span>
              </div>
              <div className="allocation-summary-card allocated">
                <span className="summary-label">Receiving Aid</span>
                <span className="summary-main">
                  <span className="summary-number">{allocationPlans.length}</span>
                </span>
                <span className="summary-sub">Plans generated</span>
              </div>
              <div className="allocation-summary-card pending">
                <span className="summary-label">No Assistance</span>
                <span className="summary-main">
                  <span className="summary-number">{noAssistanceCount}</span>
                </span>
                <span className="summary-caption">Low vulnerability</span>
              </div>
              <div className="allocation-summary-card">
                <span className="summary-label">Total Budget Required</span>
                <span className="summary-main">
                  <span className="summary-number">M{allocationPlans.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}</span>
                </span>
                <span className="summary-caption">For all eligible households</span>
              </div>
            </div>
          )}
          {activeTab === 'allocate' && (
            <div className="allocation-plan-section">
              <h3>Allocate Aid ({allocationPlans.length} plans ready)</h3>
              <div className="plan-summary text-center mb-8">
                <div className="summary-item inline">
                  <span>Total Cost</span>
                  <span className="summary-value">M{allocationPlans.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}</span>
                </div>
              </div>
              {allocationPlans.map(plan => (
                <div key={plan.id} className="detail-row mb-4">
                  <div>
                    <strong>{plan.head} ({plan.hhId})</strong> - Score: {plan.compositeScore} - {plan.tier}
                  </div>
                  <div className="flex gap-2">
                    <strong>M{plan.totalCost.toLocaleString()}</strong>
                    <button 
                      onClick={() => allocate(plan)}
                      disabled={!budget || allocating}
                      className="btn-action"
                    >
                      {allocating ? 'Allocating...' : 'Allocate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


