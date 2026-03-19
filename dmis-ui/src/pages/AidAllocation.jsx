import React, { useState, useEffect } from "react";
import { Plus, Eye, FileText } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
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
      const approvedDisasters = res.data.filter((d) => d.status === "verified");
      setDisasters(approvedDisasters);
      if (approvedDisasters.length > 0) {
        setSelectedDisaster(approvedDisasters[0]._id);
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

  // ===== SCORING ENGINE =====

  const calculateVulnerabilityScore = (household) => {
    let score = 0;

    const age = household.headOfHousehold?.age || household.age || 0;
    if (parseInt(age) > 65) score += 2;

    const childrenUnder5 = household.childrenUnder5 || 0;
    if (parseInt(childrenUnder5) > 0) score += 2;

    const householdSize = household.householdSize || 0;
    if (parseInt(householdSize) > 6) score += 2;

    const income = parseFloat(household.monthlyIncome) || 0;
    if (income <= 3000) score += 3;
    else if (income <= 10000) score += 1;

    return score;
  };

  const getAssistancePackages = (household) => {
    const damageScore = household.damageSeverityLevel || 1;
    const vulnScore = calculateVulnerabilityScore(household);
    const compositeScore = damageScore + vulnScore;
    const disasterType =
      household.disasterType ||
      currentDisaster?.type ||
      currentDisaster?.disasterType ||
      "";
    const income = parseFloat(household.monthlyIncome) || 0;
    const householdSize = parseInt(household.householdSize) || 1;

    // No assistance provision
    if (
      compositeScore <= 2 &&
      damageScore === 1 &&
      income > 10000 &&
      householdSize <= 3
    ) {
      return {
        packages: [],
        totalCost: 0,
        tier: "No Assistance Required",
        compositeScore,
      };
    }

    let tier = "";
    let packages = [];
    const isDrought = disasterType.toLowerCase().includes("drought");

    if (isDrought) {
      // Drought — one water tank and one food parcel per household
      if (compositeScore >= 10) {
        tier = "Priority Support";
        packages = [
          { name: "Water Tank (5,000L)", cost: 6000 },
          { name: "Food Parcel", cost: 1500 },
        ];
      } else if (compositeScore >= 7) {
        tier = "Extended Support";
        packages = [
          { name: "Water Tank (5,000L)", cost: 6000 },
          { name: "Food Parcel", cost: 1500 },
        ];
      } else if (compositeScore >= 4) {
        tier = "Basic Support";
        packages = [
          { name: "Water Tank (5,000L)", cost: 6000 },
          { name: "Food Parcel", cost: 1500 },
        ];
      } else {
        tier = "Minimal Support";
        packages = [
          { name: "Food Parcel", cost: 1500 },
        ];
      }
    } else {
      // Strong Winds and Heavy Rainfall
      if (compositeScore >= 10) {
        tier = "Priority Reconstruction + Livelihood";
        packages = [
          { name: "Reconstruction Grant", cost: 75000 },
          { name: "Emergency Tent", cost: 6500 },
          { name: "Tarpaulin Kit", cost: 2000 },
          { name: "Food Parcel", cost: 1500 },
          { name: "Blanket & Clothing Pack", cost: 1500 },
          { name: "Medical Aid Kit", cost: 1000 },
        ];
      } else if (compositeScore >= 7) {
        tier = "Tent + Reconstruction + Food";
        packages = [
          { name: "Emergency Tent", cost: 6500 },
          { name: "Re-roofing Kit", cost: 18000 },
          { name: "Tarpaulin Kit", cost: 2000 },
          { name: "Food Parcel", cost: 1500 },
          { name: "Blanket & Clothing Pack", cost: 1500 },
        ];
      } else if (compositeScore >= 4) {
        tier = "Shelter + Food";
        packages = [
          { name: "Tarpaulin Kit", cost: 2000 },
          { name: "Emergency Tent", cost: 6500 },
          { name: "Food Parcel", cost: 1500 },
          { name: "Medical Aid Kit", cost: 1000 },
        ];
      } else {
        tier = "Basic Support";
        packages = [
          { name: "Tarpaulin Kit", cost: 2000 },
          { name: "Food Parcel", cost: 1500 },
          { name: "Blanket & Clothing Pack", cost: 1500 },
          { name: "Medical Aid Kit", cost: 1000 },
        ];
      }
    }

    const totalCost = packages.reduce((sum, pkg) => sum + pkg.cost, 0);
    return { packages, totalCost, tier, compositeScore };
  };

  const generateAllocationPlan = () => {
    try {
      setGeneratingPlan(true);

      const plans = households.map((household, idx) => {
        const damageScore = household.damageSeverityLevel || 1;
        const vulnScore = calculateVulnerabilityScore(household);
        const compositeScore = damageScore + vulnScore;
        const { packages, totalCost, tier } = getAssistancePackages(household);

        return {
          id: household._id || idx,
          hhId:
            household.householdId ||
            `HH-${String(idx + 1).padStart(3, "0")}`,
          head:
            household.headOfHousehold?.name ||
            household.householdHeadName ||
            "Unknown",
          district: currentDisaster?.district || "N/A",
          damage: getSeverityLabel(damageScore),
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
      ToastManager.success(
        `Allocation plan generated for ${plans.length} households`
      );
    } catch (err) {
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
                  {d.disasterCode || `D-${d._id.slice(-4)}`} — {d.type} (
                  {d.district})
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
                      {currentDisaster?.disasterCode || "Selected Disaster"}
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
                          <tr key={plan.id}>
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
                              <span className="tier-badge">{plan.tier}</span>
                            </td>
                            <td>
                              {plan.packages.length === 0 ? (
                                <span className="no-assistance">
                                  No assistance required
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
                              {plan.tier !== "No Assistance Required" && (
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
                        <span>Total Households:</span>
                        <span className="summary-value">
                          {allocationPlans.length}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Households Receiving Aid:</span>
                        <span className="summary-value">
                          {
                            allocationPlans.filter(
                              (p) => p.tier !== "No Assistance Required"
                            ).length
                          }
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Total Budget Required:</span>
                        <span className="summary-value">
                          M
                          {allocationPlans
                            .reduce((sum, p) => sum + p.totalCost, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Average Composite Score:</span>
                        <span className="summary-value">
                          {(
                            allocationPlans.reduce(
                              (sum, p) => sum + p.compositeScore,
                              0
                            ) / allocationPlans.length
                          ).toFixed(1)}
                        </span>
                      </div>
                      <div className="summary-item">
                        <span>Highest Priority Household:</span>
                        <span className="summary-value">
                          {allocationPlans[0]?.head} (Score:{" "}
                          {allocationPlans[0]?.compositeScore})
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
                  {currentDisaster?.disasterCode || "Selected Disaster"}
                </h3>

                <div className="summary-cards">
                  <div className="summary-card">
                    <p className="card-label">Total Households</p>
                    <p className="card-value">{allocationPlans.length}</p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Receiving Aid</p>
                    <p className="card-value">
                      {
                        allocationPlans.filter(
                          (p) => p.tier !== "No Assistance Required"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Total Budget Required</p>
                    <p className="card-value">
                      M
                      {allocationPlans
                        .reduce((sum, p) => sum + p.totalCost, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">No Assistance Required</p>
                    <p className="card-value">
                      {
                        allocationPlans.filter(
                          (p) => p.tier === "No Assistance Required"
                        ).length
                      }
                    </p>
                  </div>
                </div>

                <div className="tier-breakdown">
                  <h4>Breakdown by Aid Tier</h4>
                  {[
                    "Priority Reconstruction + Livelihood",
                    "Tent + Reconstruction + Food",
                    "Shelter + Food",
                    "Basic Support",
                    "Priority Support",
                    "Extended Support",
                    "Minimal Support",
                    "No Assistance Required",
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