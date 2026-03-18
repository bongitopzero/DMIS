import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Eye, FileText, X, CheckCircle, Send } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./AidAllocation.css";

export default function AidAllocation() {
  const [searchParams] = useSearchParams();
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [currentDisaster, setCurrentDisaster] = useState(null);
  const [activeTab, setActiveTab] = useState("assess");
  const [households, setHouseholds] = useState([]);
  const [allocationPlans, setAllocationPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  
  // Allocation flow states
  const [allocationRequests, setAllocationRequests] = useState([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [allocatingLoading, setAllocatingLoading] = useState(false);
  const [allocationNotes, setAllocationNotes] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    householdHeadName: "",
    gender: "Female",
    age: "",
    householdSize: "",
    monthlyIncome: "",
    district: "Maseru",
    damageSeverity: "Minor",
    damageDescription: "",
  });

  // Fetch disasters on mount
  useEffect(() => {
    fetchDisasters();
  }, []);

  // Fetch households when disaster changes
  useEffect(() => {
    if (selectedDisaster) {
      fetchHouseholds();
      // Set the current disaster data
      const disaster = disasters.find(d => d._id === selectedDisaster);
      setCurrentDisaster(disaster);
      setAllocationPlans([]); // Reset plans when disaster changes
    }
  }, [selectedDisaster, disasters]);

  const fetchDisasters = async () => {
    try {
      console.log("📋 Fetching disasters...");
      const res = await API.get("/disasters");
      console.log("✅ Disasters loaded:", res.data.length);
      // Filter only approved/verified disasters
      const approvedDisasters = res.data.filter(d => d.status === "verified");
      console.log("✅ Verified disasters:", approvedDisasters.length);
      setDisasters(approvedDisasters);
      
      // Check if disasterId is in URL params
      const disasterIdParam = searchParams.get("disasterId");
      if (disasterIdParam && approvedDisasters.find(d => d._id === disasterIdParam)) {
        setSelectedDisaster(disasterIdParam);
      } else if (approvedDisasters.length > 0) {
        setSelectedDisaster(approvedDisasters[0]._id);
      }
    } catch (err) {
      console.error("Error fetching disasters:", err);
      ToastManager.error("Failed to load disasters");
    }
  };

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      console.log("📋 Fetching households for disaster:", selectedDisaster);
      const res = await API.get(`/allocation/assessments/${selectedDisaster}`);
      console.log("📊 API Response:", res.data);
      // API returns { count, assessments } - extract the assessments array
      const householdsData = res.data.assessments || res.data || [];
      console.log("✅ Households loaded:", householdsData.length);
      setHouseholds(householdsData);
    } catch (err) {
      console.error("❌ Error fetching households:", err);
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  // Map damage severity level to label
  const getSeverityLabel = (level) => {
    const severityMap = {
      1: 'Minor',
      2: 'Moderate',
      3: 'Severe',
      4: 'Catastrophic'
    };
    return severityMap[level] || 'Unknown';
  };

  const getSeverityClass = (level) => {
    const classMap = {
      1: 'minor',
      2: 'moderate',
      3: 'severe',
      4: 'catastrophic'
    };
    return classMap[level] || 'minor';
  };

  // Calculate vulnerability score (1-10)
  const calculateVulnerabilityScore = (household) => {
    let score = 0;
    
    // Income vulnerability (0-4 points)
    if (household.monthlyIncome <= 2000) score += 4;
    else if (household.monthlyIncome <= 3000) score += 3;
    else if (household.monthlyIncome <= 5000) score += 2;
    else score += 1;
    
    // Household size with children (0-3 points)
    const childrenUnder5 = household.childrenUnder5 || 0;
    if (childrenUnder5 >= 2) score += 3;
    else if (childrenUnder5 === 1) score += 2;
    
    // Household size (0-3 points)
    if (household.householdSize >= 7) score += 3;
    else if (household.householdSize >= 5) score += 2;
    else score += 1;
    
    return Math.min(10, score);
  };

  // Get assistance packages based on damage and vulnerability
  const getAssistancePackages = (household) => {
    const severityLevel = household.damageSeverityLevel || 1;
    const packages = [];
    let totalCost = 0;

    // Base packages by severity
    if (severityLevel >= 3) {
      packages.push({ name: 'Food Parcel', cost: 1500 });
      packages.push({ name: 'Tent', cost: 1500 });
      totalCost += 3000;
    } else if (severityLevel === 2) {
      packages.push({ name: 'Food Parcel', cost: 1500 });
      totalCost += 1500;
    }

    // Additional packages by disaster type
    if (household.disasterType === 'Drought') {
      packages.push({ name: 'Water Tank', cost: 800 });
      totalCost += 800;
    } else if (household.disasterType === 'Heavy Rainfall') {
      packages.push({ name: 'Roofing Kit', cost: 2000 });
      totalCost += 2000;
    }

    // Vulnerability bonus
    const vulnScore = calculateVulnerabilityScore(household);
    if (vulnScore >= 8) {
      packages.push({ name: 'Cash Transfer', cost: 1000 });
      totalCost += 1000;
    } else if (vulnScore >= 6) {
      packages.push({ name: 'School Supplies', cost: 500 });
      totalCost += 500;
    }

    return { packages, totalCost };
  };

  // Derived map: assessmentId -> planned total cost (from Allocation Plan logic)
  const plannedCostByAssessmentId = useMemo(() => {
    const map = {};
    (households || []).forEach((h) => {
      const id = h?._id?.toString?.() || h?._id;
      if (!id) return;
      map[id] = getAssistancePackages(h).totalCost || 0;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [households]);

  const getPlannedCostForRequest = (request) => {
    const assessmentId =
      request?.householdAssessmentId?.toString?.() || request?.householdAssessmentId;
    if (assessmentId && plannedCostByAssessmentId[assessmentId] !== undefined) {
      return plannedCostByAssessmentId[assessmentId];
    }
    return request?.totalEstimatedCost || 0;
  };

  // Generate allocation plan
  const generateAllocationPlan = () => {
    try {
      setGeneratingPlan(true);
      
      const plans = households.map((household, idx) => {
        const existingRequest = allocationRequests.find(
          (req) =>
            req.householdAssessmentId?.toString?.() === household._id?.toString?.() ||
            req.householdAssessmentId === household._id
        );

        const vulnScore = calculateVulnerabilityScore(household);
        const damageScore = (household.damageSeverityLevel || 1) * 2;
        const totalScore = Math.min(10, Math.round((vulnScore + damageScore) / 2));
        const { packages, totalCost } = getAssistancePackages(household);

        return {
          id: household._id || idx,
          hhId: household.householdId || `HH-${idx}`,
          head: household.headOfHousehold?.name || 'Unknown',
          district: currentDisaster?.district || 'N/A',
          damage: getSeverityLabel(household.damageSeverityLevel),
          vulnerability: vulnScore,
          score: totalScore,
          packages,
          totalCost,
          isAllocated: !!existingRequest,
          requestMongoId: existingRequest?._id || null,
          requestId: existingRequest?.requestId || null,
        };
      });

      setAllocationPlans(plans);
      ToastManager.success(`Generated allocation plan for ${plans.length} households`);
    } catch (err) {
      console.error('Error generating plan:', err);
      ToastManager.error('Failed to generate allocation plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Handle allocation button click - open allocation modal
  const handleAllocateClick = async (plan) => {
    try {
      // Find corresponding household assessment
      const household = households.find(h => h._id === plan.id);
      if (!household) {
        ToastManager.error("Household not found");
        return;
      }
      
      setSelectedPlan({ ...plan, assessmentId: household._id });
      setShowAllocationModal(true);
    } catch (err) {
      console.error("Error preparing allocation:", err);
      ToastManager.error("Failed to prepare allocation");
    }
  };

  // Get the actual cost for a plan - either from allocation request or fallback to plan cost
  const getActualPlanCost = (plan) => {
    // If plan is linked to a request, prefer the request's total (source of truth after creation)
    const request =
      allocationRequests.find((r) => r._id === plan.requestMongoId) ||
      allocationRequests.find((r) => r.requestId === plan.requestId);
    if (request) return request.totalEstimatedCost || 0;

    // Fallback to plan's actualCost or original totalCost
    return plan.actualCost !== undefined ? plan.actualCost : plan.totalCost;
  };

  // Handle create allocation request
  const handleCreateAllocationRequest = async () => {
    if (!selectedPlan) return;

    setAllocatingLoading(true);
    try {
      const response = await API.post("/allocation/create-request", {
        assessmentId: selectedPlan.assessmentId,
        disasterId: selectedDisaster,
        override: false,
        notes: allocationNotes,
      });

      ToastManager.success(`Allocation request created: ${response.data.requestId}`);
      setShowAllocationModal(false);
      setAllocationNotes("");
      setSelectedPlan(null);

      // Always refresh allocation requests and audit logs from backend
      await fetchAllocationRequests();
      await fetchAuditLogs();
    } catch (err) {
      console.error("Error creating allocation request:", err);
      ToastManager.error(err.response?.data?.message || "Failed to create allocation request");
    } finally {
      setAllocatingLoading(false);
    }
  };

  // Handle approval of allocation request
  const handleApproveAllocation = async (requestId) => {
    try {
      setAllocatingLoading(true);
      await API.put(`/allocation/requests/${requestId}/approve`, {
        justification: "Approved for disbursement",
      });

      ToastManager.success("Allocation approved successfully");
      await fetchAllocationRequests();
      await fetchAuditLogs();
    } catch (err) {
      console.error("Error approving allocation:", err);
      ToastManager.error(err.response?.data?.message || "Failed to approve allocation");
    } finally {
      setAllocatingLoading(false);
    }
  };

  // Handle disbursement of allocation
  const handleDisburseAllocation = async (requestId) => {
    try {
      setAllocatingLoading(true);
      await API.put(`/allocation/requests/${requestId}/disburse`, {
        disbursementData: {
          disbursedDate: new Date(),
          disbursementMethod: "Bank Transfer",
        },
      });

      ToastManager.success("Allocation disbursed successfully and expenses recorded");
      await fetchAllocationRequests();
      await fetchAuditLogs();
    } catch (err) {
      console.error("Error disbursing allocation:", err);
      ToastManager.error(err.response?.data?.message || "Failed to disburse allocation");
    } finally {
      setAllocatingLoading(false);
    }
  };

  // Fetch audit logs for this disaster's allocations
  const fetchAuditLogs = async () => {
    try {
      if (!selectedDisaster) return;
      const response = await API.get(`/financial/auditlogs/${selectedDisaster}`);
      // Filter only allocation-related logs
      const allocationLogs = response.data.filter(log =>
        log.entityType?.includes('Allocation') || log.action?.includes('ALLOCATION')
      );
      setAuditLogs(allocationLogs);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
  };

  // Fetch allocation requests for selected disaster
  const fetchAllocationRequests = async () => {
    try {
      if (!selectedDisaster) return;
      const response = await API.get(`/allocation/requests/${selectedDisaster}`);
      setAllocationRequests(response.data.requests || []);
      fetchAuditLogs();
    } catch (err) {
      console.error("Error fetching allocation requests:", err);
    }
  };

  // Fetch data when disaster changes
  useEffect(() => {
    if (selectedDisaster) {
      fetchAllocationRequests();
    }
  }, [selectedDisaster]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.householdHeadName.trim()) {
      ToastManager.error("Household head name is required");
      return;
    }
    if (!formData.age) {
      ToastManager.error("Age is required");
      return;
    }
    if (!formData.householdSize) {
      ToastManager.error("Household size is required");
      return;
    }
    if (!formData.monthlyIncome) {
      ToastManager.error("Monthly income is required");
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await API.post("/api/household-assessments", {
        disasterId: selectedDisaster,
        householdHeadName: formData.householdHeadName,
        gender: formData.gender,
        age: parseInt(formData.age),
        householdSize: parseInt(formData.householdSize),
        monthlyIncome: parseFloat(formData.monthlyIncome),
        district: formData.district,
        damageSeverity: formData.damageSeverity,
        damageDescription: formData.damageDescription,
        createdBy: user.user?.id,
      });

      ToastManager.success("Household assessed successfully");
      setFormData({
        householdHeadName: "",
        gender: "Female",
        age: "",
        householdSize: "",
        monthlyIncome: "",
        district: "Maseru",
        damageSeverity: "Minor",
        damageDescription: "",
      });
      fetchHouseholds();
    } catch (err) {
      console.error("Error creating household assessment:", err);
      ToastManager.error(err.response?.data?.message || "Failed to assess household");
    } finally {
      setLoading(false);
    }
  };

  const getIncomeCategory = (income) => {
    const inc = parseFloat(income) || 0;
    if (inc <= 3000) return "Low";
    if (inc <= 10000) return "Middle";
    return "High";
  };

  const selectedDisasterData = disasters.find((d) => d._id === selectedDisaster);

  return (
    <div className="aid-allocation">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Aid Allocation</h1>
          <p className="subtitle">Household assessment, scoring, and transparent aid package allocation</p>
        </div>
      </div>

      {/* Disaster Selector */}
      <div className="disaster-selector-section">
        <div className="selector-content">
          <label>Disaster:</label>
          <select
            value={selectedDisaster}
            onChange={(e) => setSelectedDisaster(e.target.value)}
            className="disaster-select"
          >
            <option value="">Select an approved disaster...</option>
            {disasters.map((d) => (
              <option key={d._id} value={d._id}>
                {d.disasterCode || `D-${d._id.slice(-4)}`} — {d.type} ({d.district})
              </option>
            ))}
          </select>
        </div>
        <div className="household-count">
          <span>
            {households.length}{" "}
            {currentDisaster?.numberOfHouseholdsAffected
              ? `of ${currentDisaster.numberOfHouseholdsAffected}`
              : ""}{" "}
            household(s) assessed
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-section">
        <button
          className={`tab-btn ${activeTab === "assess" ? "active" : ""}`}
          onClick={() => setActiveTab("assess")}
        >
          <Plus size={18} />
          Assess Household
        </button>
        <button
          className={`tab-btn ${activeTab === "plan" ? "active" : ""}`}
          onClick={() => setActiveTab("plan")}
        >
          <FileText size={18} />
          Allocation Plan
        </button>
        <button
          className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          <Eye size={18} />
          Summary Dashboard
        </button>
      </div>

      {/* Content */}
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
                      <th>Household Head</th>
                      <th>Gender</th>
                      <th>Age</th>
                      <th>Size</th>
                      <th>Monthly Income</th>
                      <th>Income Category</th>
                      <th>Damage Severity</th>
                      <th>Damage Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {households.map((household, idx) => (
                      <tr key={household._id || idx}>
                        <td className="font-medium">{household.headOfHousehold?.name || household.householdHeadName}</td>
                        <td>{household.headOfHousehold?.gender || household.gender}</td>
                        <td>{household.headOfHousehold?.age || household.age}</td>
                        <td>{household.householdSize}</td>
                        <td>M {parseFloat(household.monthlyIncome).toLocaleString()}</td>
                        <td>
                          <span className={`income-badge ${household.incomeCategory?.toLowerCase() || (household.monthlyIncome <= 3000 ? 'low' : household.monthlyIncome <= 10000 ? 'middle' : 'high')}`}>
                            {household.incomeCategory || (household.monthlyIncome <= 3000 ? 'Low' : household.monthlyIncome <= 10000 ? 'Middle' : 'High')}
                          </span>
                        </td>
                        <td>
                          <span className={`severity-badge ${getSeverityClass(household.damageSeverityLevel)}`}>
                            {getSeverityLabel(household.damageSeverityLevel)}
                          </span>
                        </td>
                        <td>{household.damageDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "plan" && (
        <div className="tab-content">
          {households.length === 0 ? (
            <div className="placeholder-section">
              <h3>Allocation Plan</h3>
              <p>Select a disaster and assess households first to generate allocation plans</p>
            </div>
          ) : (
            <div className="allocation-plan-section">
              <div className="plan-header">
                <div>
                  <h3>Aid Allocation Plan — {currentDisaster?.disasterCode}</h3>
                  <p className="plan-subtitle">{households.length} households assessed</p>
                </div>
                <button 
                  className="btn-generate-plan"
                  onClick={generateAllocationPlan}
                  disabled={generatingPlan}
                >
                  {generatingPlan ? 'Generating...' : 'Generate Allocation Plan'}
                </button>
              </div>

              {allocationPlans.length > 0 ? (
                <div className="allocation-table-wrapper">
                  <table className="allocation-table">
                    <thead>
                      <tr>
                        <th>HH ID</th>
                        <th>Head</th>
                        <th>District</th>
                        <th>Damage</th>
                        <th>Vuln.</th>
                        <th>Score</th>
                        <th>Packages</th>
                        <th>Total Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationPlans.map((plan) => (
                        <tr key={plan.id}>
                          <td className="font-mono">{plan.hhId}</td>
                          <td className="font-medium">{plan.head}</td>
                          <td>{plan.district}</td>
                          <td>{plan.damage}</td>
                          <td className="text-center">{plan.vulnerability}</td>
                          <td className="text-center font-bold">{plan.score}</td>
                          <td>
                            <div className="packages-list">
                              {(plan.allocatedPackages || plan.packages).map((pkg, idx) => (
                                <div key={idx} className="package-item">
                                  <span className="package-name">{pkg.packageName || pkg.name}</span>
                                  <span className="package-cost">M{(pkg.unitCost || pkg.cost).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="text-right font-bold">M{getActualPlanCost(plan).toLocaleString()}</td>
                          <td>
                            {plan.isAllocated ? (
                              <span className="status-complete" title={`Request: ${plan.requestId}`}>✓ Allocated</span>
                            ) : (
                              <button 
                                className="btn-action" 
                                title="Create Allocation Request"
                                onClick={() => handleAllocateClick(plan)}
                                disabled={allocatingLoading}
                              >
                                {allocatingLoading ? '⏳ Processing...' : '✓ Allocate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="plan-summary">
                    <div className="summary-item">
                      <span>Total Households:</span>
                      <span className="summary-value">{allocationPlans.length}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Budget Required:</span>
                      <span className="summary-value">M{allocationPlans.reduce((sum, p) => sum + getActualPlanCost(p), 0).toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span>Average Score:</span>
                      <span className="summary-value">{(allocationPlans.reduce((sum, p) => sum + p.score, 0) / allocationPlans.length).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="placeholder-section">
                  <p>Click "Generate Allocation Plan" to create an allocation plan for the assessed households</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="tab-content">
          <div className="allocation-requests-section">
            <h3>Allocation Requests & Audit Trail</h3>

            {/* Summary metrics separating allocated vs pending */}
            {allocationRequests.length > 0 && (
              <div className="allocation-summary-grid">
                {(() => {
                  const pendingStatuses = ['Proposed', 'Pending Approval'];
                  const allocatedStatuses = ['Approved', 'Disbursed'];

                  const pending = allocationRequests.filter((r) =>
                    pendingStatuses.includes(r.status)
                  );
                  const allocated = allocationRequests.filter((r) =>
                    allocatedStatuses.includes(r.status)
                  );

                  const pendingTotal = pending.reduce(
                    (sum, r) => sum + getPlannedCostForRequest(r),
                    0
                  );
                  const allocatedTotal = allocated.reduce(
                    (sum, r) => sum + getPlannedCostForRequest(r),
                    0
                  );

                  return (
                    <>
                      <div className="allocation-summary-card pending">
                        <div className="summary-label">To Be Allocated</div>
                        <div className="summary-main">
                          <span className="summary-number">{pending.length}</span>
                          <span className="summary-caption">households</span>
                        </div>
                        <div className="summary-sub">
                          Pending amount:{" "}
                          <strong>M{pendingTotal.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="allocation-summary-card allocated">
                        <div className="summary-label">Allocated / Disbursed</div>
                        <div className="summary-main">
                          <span className="summary-number">{allocated.length}</span>
                          <span className="summary-caption">households</span>
                        </div>
                        <div className="summary-sub">
                          Total allocated:{" "}
                          <strong>M{allocatedTotal.toLocaleString()}</strong>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            {allocationRequests.length === 0 ? (
              <div className="placeholder-section">
                <p>No allocation requests yet. Create allocations from the Allocation Plan tab.</p>
              </div>
            ) : (
              <div className="allocation-requests-table">
                <table>
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Household</th>
                      <th>Total Cost</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationRequests.map((request) => (
                      <tr key={request._id}>
                        <td className="font-mono">{request.requestId}</td>
                        <td>{request.householdId}</td>
                        <td>M{getPlannedCostForRequest(request).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge status-${request.status?.toLowerCase()}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="action-buttons">
                          {request.status === 'Proposed' && (
                            <button
                              className="btn-small btn-approve"
                              onClick={() => handleApproveAllocation(request._id)}
                              disabled={allocatingLoading}
                            >
                              Approve
                            </button>
                          )}
                          {request.status === 'Approved' && (
                            <button
                              className="btn-small btn-disburse"
                              onClick={() => handleDisburseAllocation(request._id)}
                              disabled={allocatingLoading}
                            >
                              Disburse
                            </button>
                          )}
                          {request.status === 'Disbursed' && (
                            <span className="status-complete">✓ Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {auditLogs.length > 0 && (
              <div className="audit-logs-section">
                <h4>Financial Audit Trail</h4>
                <div className="audit-logs-list">
                  {auditLogs.slice(0, 10).map((log, idx) => (
                    <div key={idx} className="audit-log-entry">
                      <div className="log-header">
                        <span className="log-action">{log.action}</span>
                        <span className="log-date">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      {log.details && (
                        <div className="log-details">{JSON.stringify(log.details).substring(0, 100)}...</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocationModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowAllocationModal(false)}>
          <div className="modal-content allocation-modal">
            <div className="modal-header">
              <h4>Create Allocation Request</h4>
              <button
                className="btn-close"
                onClick={() => setShowAllocationModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="plan-details">
                <div className="detail-row">
                  <label>Household:</label>
                  <span>{selectedPlan.head} ({selectedPlan.hhId})</span>
                </div>
                <div className="detail-row">
                  <label>Allocation Score:</label>
                  <span>{selectedPlan.score}/10</span>
                </div>
                <div className="detail-row">
                  <label>Vulnerability:</label>
                  <span>{selectedPlan.vulnerability}/10</span>
                </div>
                <div className="detail-row">
                  <label>Damage Level:</label>
                  <span>{selectedPlan.damage}</span>
                </div>
                <div className="detail-row">
                  <label>Total Cost:</label>
                  <span className="cost-value">M{selectedPlan.totalCost.toLocaleString()}</span>
                </div>

                <div className="packages-section">
                  <label>Packages:</label>
                  <div className="packages-detail">
                    {selectedPlan.packages.map((pkg, idx) => (
                      <div key={idx} className="package-detail-item">
                        <span>{pkg.name}</span>
                        <span>M{pkg.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (Optional):</label>
                  <textarea
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    placeholder="Add notes about this allocation..."
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAllocationModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateAllocationRequest}
                disabled={allocatingLoading}
              >
                {allocatingLoading ? 'Creating...' : 'Create Allocation Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

