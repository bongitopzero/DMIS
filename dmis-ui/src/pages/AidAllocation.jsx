import React, { useState, useEffect } from "react";
import { Plus, Eye, FileText } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import { assignDisasterIds, getDisasterId } from "../utils/locationUtils";
import "./AidAllocation.css";

export default function AidAllocation() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState("");
  const [currentDisaster, setCurrentDisaster] = useState(null);
  const [activeTab, setActiveTab] = useState("assess");
  const [households, setHouseholds] = useState([]);
  const [allocationPlans, setAllocationPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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

  useEffect(() => {
    fetchDisasters();
  }, []);

  useEffect(() => {
    if (selectedDisaster) {
      fetchHouseholds();
      const disaster = disasters.find((d) => d._id === selectedDisaster);
      setCurrentDisaster(disaster);
      setAllocationPlans([]);
    }
  }, [selectedDisaster, disasters]);

  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      
      // Get all disasters and filter to verified status only
      let allDisasters = res.data || [];
      const verifiedDisasters = allDisasters.filter((d) => d.status === "verified");
      
      // Assign sequential IDs based on creation date
      const disastersWithIds = assignDisasterIds(verifiedDisasters);
      
      setDisasters(disastersWithIds);
      if (disastersWithIds.length > 0) {
        setSelectedDisaster(disastersWithIds[0]._id);
      }
    } catch (err) {
      ToastManager.error("Failed to load disasters");
    }
  };

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/allocation/assessments/${selectedDisaster}`);
      const householdsData = res.data.assessments || res.data || [];
      setHouseholds(householdsData);
    } catch (err) {
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityLabel = (level) => {
    const severityMap = {
      1: "Minor",
      2: "Moderate",
      3: "Severe",
      4: "Catastrophic",
    };
    return severityMap[level] || "Unknown";
  };

  const getSeverityClass = (level) => {
    const classMap = {
      1: "minor",
      2: "moderate",
      3: "severe",
      4: "catastrophic",
    };
    return classMap[level] || "minor";
  };

  // ===== STEP 2: KEYWORD DETECTION =====
  const detectKeywordsInDescription = (description = "") => {
    const desc = (description || "").toLowerCase();
    
    return {
      hasChildrenUnder5: /\b(infant|baby|toddler|child under 5|young child|newborn)\b/.test(desc),
      hasDisabledMembers: /\b(disabled|wheelchair|bedridden|handicapped|disability)\b/.test(desc),
      hasNoWaterAccess: /\b(no water|water cut|no access to water|water supply damaged|no clean water)\b/.test(desc),
      hasInjuries: /\b(injured|hurt|wound|hospital|medical attention|casualty)\b/.test(desc),
      isUninhabitable: /\b(completely destroyed|fully destroyed|uninhabitable|no rooms|collapsed|total loss)\b/.test(desc),
      hasRoofDamage: /\b(roof blown|roof damaged|roof destroyed|roof off|no roof|roofless)\b/.test(desc),
    };
  };

  // ===== STEP 1: DISQUALIFICATION CHECK =====
  const checkDisqualification = (household, damageLevel, keywords, disasterType) => {
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    
    // Check if more than 50% of rooms are still habitable
    const habitable = damageLevel <= 2 || keywords.isUninhabitable === false || 
                      /\b(still habitable|rooms habitable|partially damaged)\b/.test((household.damageDescription || "").toLowerCase());
    
    // All four conditions must be true to disqualify
    const condition1 = age < 40;
    const condition2 = householdSize <= 4;
    const condition3 = monthlyIncome > 10000;
    const condition4 = habitable && damageLevel <= 2;
    
    return condition1 && condition2 && condition3 && condition4;
  };

  // ===== STEP 3: VULNERABILITY SCORE =====
  const calculateVulnerabilityScore = (household, keywords) => {
    let score = 0;

    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    if (age > 65) score += 2;

    if (keywords.hasChildrenUnder5) score += 2;

    const householdSize = parseInt(household.householdSize || 0);
    if (householdSize > 6) score += 2;

    const income = parseFloat(household.monthlyIncome || 0);
    if (income <= 3000) score += 3;
    else if (income <= 10000) score += 1;

    return score;
  };

  // ===== STEP 4: DAMAGE SCORE =====
  const calculateDamageScore = (damageLevel) => {
    const levelMap = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
    };
    return levelMap[damageLevel] || 1;
  };

  // ===== STEP 5: DETERMINE TIER =====
  const determineTier = (compositeScore) => {
    if (compositeScore >= 10) return "Priority";
    if (compositeScore >= 7) return "Extended";
    if (compositeScore >= 4) return "Basic";
    return "Minimal";
  };

  // ===== STEP 6: PACKAGE ELIGIBILITY =====
  const getEligiblePackages = (household, keywords, damageLevel, disasterType) => {
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const isDrought = disasterType.toLowerCase().includes("drought");
    const isWindRain = disasterType.toLowerCase().includes("rainfall") || 
                       disasterType.toLowerCase().includes("wind") ||
                       disasterType.toLowerCase().includes("strong wind") ||
                       disasterType.toLowerCase().includes("heavy rainfall");

    const packages = [];

    // Emergency Tent: isUninhabitable AND damage level 4
    if (keywords.isUninhabitable && damageLevel === 4) {
      packages.push({ name: "Emergency Tent", cost: 6500 });
    }

    // Reconstruction Grant: isUninhabitable AND damage level 4, Heavy rainfall/strong winds only
    if (keywords.isUninhabitable && damageLevel === 4 && isWindRain) {
      packages.push({ name: "Reconstruction Grant", cost: 75000 });
    }

    // Re-roofing Kit: hasRoofDamage AND damage level 2 or 3, Heavy rainfall/strong winds only
    if (keywords.hasRoofDamage && (damageLevel === 2 || damageLevel === 3) && isWindRain) {
      packages.push({ name: "Re-roofing Kit", cost: 18000 });
    }

    // Tarpaulin Kit: damage level >= 2, Heavy rainfall/strong winds only
    if (damageLevel >= 2 && isWindRain) {
      packages.push({ name: "Tarpaulin Kit", cost: 2000 });
    }

    // Food Parcel: income < M10,000 OR isUninhabitable
    if (monthlyIncome < 10000 || keywords.isUninhabitable) {
      packages.push({ name: "Food Parcel", cost: 1500 });
    }

    // Water Tank: Drought disasters only AND hasNoWaterAccess
    // For drought disasters, assume hasNoWaterAccess is true by default
    if (isDrought && (keywords.hasNoWaterAccess || !/(water|supply|access).*(ok|good|available|fine)/i.test(household.damageDescription || ""))) {
      packages.push({ name: "Water Tank", cost: 6000 });
    }

    // Blanket & Clothing: hasChildrenUnder5 OR age > 65 OR hasDisabledMembers
    if (keywords.hasChildrenUnder5 || age > 65 || keywords.hasDisabledMembers) {
      packages.push({ name: "Blanket & Clothing", cost: 1500 });
    }

    // Medical Aid: hasInjuries OR hasDisabledMembers OR hasChildrenUnder5 OR age > 65
    if (keywords.hasInjuries || keywords.hasDisabledMembers || keywords.hasChildrenUnder5 || age > 65) {
      packages.push({ name: "Medical Aid", cost: 1000 });
    }

    return packages;
  };

  // ===== STEP 1-7: COMPLETE ALLOCATION LOGIC =====
  const generateAllocationPlan = () => {
    try {
      setGeneratingPlan(true);

      const plans = households.map((household, idx) => {
        const damageLevel = household.damageSeverityLevel || 1;
        const damageDescription = household.damageDescription || "";
        const disasterType = household.disasterType || currentDisaster?.type || currentDisaster?.disasterType || "";

        // STEP 2: Detect keywords
        const keywords = detectKeywordsInDescription(damageDescription);

        // STEP 1: Check disqualification
        const isDisqualified = checkDisqualification(household, damageLevel, keywords, disasterType);

        if (isDisqualified) {
          return {
            id: household._id || idx,
            hhId: household.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
            head: household.headOfHousehold?.name || household.householdHeadName || "Unknown",
            district: currentDisaster?.district || "N/A",
            damage: getSeverityLabel(damageLevel),
            damageScore: calculateDamageScore(damageLevel),
            vulnerability: 0,
            compositeScore: 0,
            tier: "Not Eligible",
            packages: [],
            totalCost: 0,
            isDisqualified: true,
          };
        }

        // STEP 3: Calculate vulnerability score
        const vulnScore = calculateVulnerabilityScore(household, keywords);

        // STEP 4: Calculate damage score
        const damageScore = calculateDamageScore(damageLevel);

        // STEP 5: Calculate composite score and tier
        const compositeScore = vulnScore + damageScore;
        const tier = determineTier(compositeScore);

        // STEP 6: Get eligible packages
        const packages = getEligiblePackages(household, keywords, damageLevel, disasterType);

        const totalCost = packages.reduce((sum, pkg) => sum + pkg.cost, 0);

        return {
          id: household._id || idx,
          hhId: household.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
          head: household.headOfHousehold?.name || household.householdHeadName || "Unknown",
          district: currentDisaster?.district || "N/A",
          damage: getSeverityLabel(damageLevel),
          damageScore,
          vulnerability: vulnScore,
          compositeScore,
          tier,
          packages,
          totalCost,
          isDisqualified: false,
        };
      });

      // STEP 7: Sort - eligible first (by composite score descending), then disqualified at bottom
      const eligible = plans.filter(p => !p.isDisqualified).sort((a, b) => b.compositeScore - a.compositeScore);
      const disqualified = plans.filter(p => p.isDisqualified);
      const sortedPlans = [...eligible, ...disqualified];

      // Calculate summary statistics
      const summary = {
        totalAidNeeded: eligible.reduce((sum, p) => sum + p.totalCost, 0),
        eligibleCount: eligible.length,
        disqualifiedCount: disqualified.length,
        priorityCount: eligible.filter(p => p.tier === "Priority").length,
        extendedCount: eligible.filter(p => p.tier === "Extended").length,
        basicCount: eligible.filter(p => p.tier === "Basic").length,
        minimalCount: eligible.filter(p => p.tier === "Minimal").length,
      };

      setAllocationPlans(sortedPlans);
      
      const eligibleMsg = `${eligible.length} eligible household${eligible.length !== 1 ? "s" : ""}`;
      const disqualMsg = disqualified.length > 0 ? `, ${disqualified.length} disqualified` : "";
      
      ToastManager.success(
        `Allocation plan generated: ${eligibleMsg}${disqualMsg}`
      );
    } catch (err) {
      console.error("Error generating allocation plan:", err);
      ToastManager.error("Failed to generate allocation plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      ToastManager.error(
        err.response?.data?.message || "Failed to assess household"
      );
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

  return (
    <div className="aid-allocation">
      <div className="aid-allocation-content">

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
                  {d.disasterCode || d._id.substring(0, 8)} - {d.type} ({d.district})
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

        {/* TAB: Assess Household */}
        {activeTab === "assess" && (
          <div className="tab-content">
            {households.length === 0 ? (
              <div className="placeholder-section">
                <h3>Assessed Households</h3>
                <p>
                  Household assessment data from approved disasters will appear
                  here after coordinator approval
                </p>
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
                          <td className="font-medium">
                            {household.headOfHousehold?.name ||
                              household.householdHeadName}
                          </td>
                          <td>
                            {household.headOfHousehold?.gender ||
                              household.gender}
                          </td>
                          <td>
                            {household.headOfHousehold?.age || household.age}
                          </td>
                          <td>{household.householdSize}</td>
                          <td>
                            M{" "}
                            {parseFloat(
                              household.monthlyIncome
                            ).toLocaleString()}
                          </td>
                          <td>
                            <span
                              className={`income-badge ${getIncomeCategory(
                                household.monthlyIncome
                              ).toLowerCase()}`}
                            >
                              {getIncomeCategory(household.monthlyIncome)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`severity-badge ${getSeverityClass(
                                household.damageSeverityLevel
                              )}`}
                            >
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

        {/* TAB: Allocation Plan */}
        {activeTab === "plan" && (
          <div className="tab-content">
            {households.length === 0 ? (
              <div className="placeholder-section">
                <h3>Allocation Plan</h3>
                <p>
                  Select a disaster and assess households first to generate
                  allocation plans
                </p>
              </div>
            ) : (
              <div className="allocation-plan-section">
                <div className="plan-header">
                  <div>
                    <h3>
                      Aid Allocation Plan —{" "}
                      {currentDisaster?.disasterCode || currentDisaster?._id?.substring(0, 8) || "Selected Disaster"}
                    </h3>
                    <p className="plan-subtitle">
                      {households.length} households assessed
                    </p>
                  </div>
                  <button
                    className="btn-generate-plan"
                    onClick={generateAllocationPlan}
                    disabled={generatingPlan}
                  >
                    {generatingPlan
                      ? "Generating..."
                      : "Generate Allocation Plan"}
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
                          <th>Damage Score</th>
                          <th>Vuln. Score</th>
                          <th>Composite Score</th>
                          <th>Tier</th>
                          <th>Packages</th>
                          <th>Total Cost</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationPlans.map((plan) => (
                          <tr key={plan.id} style={{ 
                            backgroundColor: plan.isDisqualified ? '#fef2f2' : 'transparent',
                            opacity: plan.isDisqualified ? 0.7 : 1
                          }}>
                            <td className="font-mono">{plan.hhId}</td>
                            <td className="font-medium">{plan.head}</td>
                            <td>{plan.district}</td>
                            <td>{plan.damage}</td>
                            <td className="text-center">{plan.damageScore}</td>
                            <td className="text-center">
                              {plan.vulnerability}
                            </td>
                            <td className="text-center font-bold">
                              {plan.compositeScore}
                            </td>
                            <td>
                              <span className="tier-badge" style={{
                                backgroundColor: plan.isDisqualified ? '#fee2e2' : undefined,
                                color: plan.isDisqualified ? '#991b1b' : undefined
                              }}>
                                {plan.tier}
                              </span>
                            </td>
                            <td>
                              {plan.packages.length === 0 ? (
                                <span className="no-assistance">
                                  {plan.isDisqualified ? "Not Eligible" : "No assistance"}
                                </span>
                              ) : (
                                <div className="packages-list">
                                  {plan.packages.map((pkg, idx) => (
                                    <div key={idx} className="package-item">
                                      <span className="package-name">
                                        {pkg.name}
                                      </span>
                                      <span className="package-cost">
                                        M{pkg.cost.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="text-right font-bold">
                              {plan.totalCost === 0
                                ? "—"
                                : `M${plan.totalCost.toLocaleString()}`}
                            </td>
                            <td>
                              {!plan.isDisqualified && plan.tier !== "Not Eligible" && plan.packages.length > 0 && (
                                <button className="btn-action">
                                  ✓ Allocate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="plan-summary">
                      <div className="summary-item">
                        <span>Total Households Assessed:</span>
                        <span className="summary-value">
                          {allocationPlans.length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Eligible Households:</span>
                        <span className="summary-value">
                          {allocationPlans.filter(p => !p.isDisqualified).length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Disqualified Households:</span>
                        <span className="summary-value" style={{ color: '#991b1b' }}>
                          {allocationPlans.filter(p => p.isDisqualified).length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Total Budget Required (Eligible):</span>
                        <span className="summary-value">
                          M{allocationPlans
                            .filter(p => !p.isDisqualified)
                            .reduce((sum, p) => sum + p.totalCost, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                      <hr style={{ margin: "1rem 0", borderColor: "#e5e7eb" }} />
                      <div className="summary-item">
                        <span>Priority Tier:</span>
                        <span className="summary-value">
                          {allocationPlans.filter(p => p.tier === "Priority").length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Extended Tier:</span>
                        <span className="summary-value">
                          {allocationPlans.filter(p => p.tier === "Extended").length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Basic Tier:</span>
                        <span className="summary-value">
                          {allocationPlans.filter(p => p.tier === "Basic").length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Minimal Tier:</span>
                        <span className="summary-value">
                          {allocationPlans.filter(p => p.tier === "Minimal").length}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="placeholder-section">
                    <p>
                      Click "Generate Allocation Plan" to create an allocation
                      plan for the assessed households
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: Summary Dashboard */}
        {activeTab === "summary" && (
          <div className="tab-content">
            {allocationPlans.length === 0 ? (
              <div className="placeholder-section">
                <h3>Summary Dashboard</h3>
                <p>
                  Generate an allocation plan first to view the summary
                  dashboard
                </p>
              </div>
            ) : (
              <div className="summary-dashboard">
                <h3>
                  Allocation Summary —{" "}
                  {currentDisaster?.disasterCode || currentDisaster?._id?.substring(0, 8) || "Selected Disaster"}
                </h3>

                <div className="summary-cards">
                  <div className="summary-card">
                    <p className="card-label">Total Households</p>
                    <p className="card-value">{allocationPlans.length}</p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Eligible</p>
                    <p className="card-value">
                      {allocationPlans.filter(p => !p.isDisqualified).length}
                    </p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Not Eligible</p>
                    <p className="card-value" style={{ color: '#991b1b' }}>
                      {allocationPlans.filter(p => p.isDisqualified).length}
                    </p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Total Budget (Eligible)</p>
                    <p className="card-value">
                      M{allocationPlans
                        .filter(p => !p.isDisqualified)
                        .reduce((sum, p) => sum + p.totalCost, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="tier-breakdown">
                  <h4>Breakdown by Aid Tier</h4>
                  {[
                    "Priority",
                    "Extended",
                    "Basic",
                    "Minimal",
                  ].map((tier) => {
                    const count = allocationPlans.filter(
                      (p) => p.tier === tier
                    ).length;
                    if (count === 0) return null;
                    const cost = allocationPlans
                      .filter((p) => p.tier === tier)
                      .reduce((sum, p) => sum + p.totalCost, 0);
                    return (
                      <div key={tier} className="tier-row">
                        <span className="tier-name">{tier}</span>
                        <span className="tier-count">{count} households</span>
                        <span className="tier-cost">
                          {cost === 0 ? "—" : `M${cost.toLocaleString()}`}
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