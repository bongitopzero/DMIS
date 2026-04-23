import React, { useState, useEffect, useCallback } from "react";
import { Plus, Eye, FileText, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import { assignDisasterIds, getDisasterId } from "../utils/locationUtils";
import "./AidAllocation.css";
 
// Normalize any allocation record (backend or local) into one consistent shape
function normalizeAllocation(raw) {
  return {
    _id:           raw._id              || "",
    requestId:     raw.requestId        || "",
    householdId:   raw.householdId      || raw.householdAssessmentId || "",
    householdName: raw.householdName    || raw.householdHeadName     || "No name provided",
    district:      raw.district         || "N/A",
    disasterId:    raw.disasterId       || "",
    status:        raw.status           || "Proposed",
    packages: (raw.allocatedPackages || raw.packages || []).map((p) => ({
      name: p.packageName || p.name || "Package",
      cost: p.totalCost   || p.unitCost || p.cost || 0,
    })),
    totalCost:  raw.totalEstimatedCost ?? raw.totalCost ?? 0,
    isOverride: raw.isOverride          || raw.isOverridden || false,
    createdAt:  raw.createdAt           || raw.timestamp    || null,
  };
}
 
export default function AidAllocation() {
  const [disasters, setDisasters]                       = useState([]);
  const [selectedDisaster, setSelectedDisaster]         = useState("");
  const [currentDisaster, setCurrentDisaster]           = useState(null);
  const [activeTab, setActiveTab]                       = useState("assess");
  const [households, setHouseholds]                     = useState([]);
  const [allocationPlans, setAllocationPlans]           = useState([]);
  const [loading, setLoading]                           = useState(false);
  const [generatingPlan, setGeneratingPlan]             = useState(false);
  const [globalAllocations, setGlobalAllocations]       = useState([]);
  const [allocatedDisasterIds, setAllocatedDisasterIds] = useState(new Set());
  
  // Allocation Log Swimlane States
  const [expandedSections, setExpandedSections] = useState({
    pending: true,
    ready: true,
    complete: false
  });
 
  // ─── Boot ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchDisasters();
  fetchAllAllocations();
}, []);

// Disaster selection effect
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (selectedDisaster) {
    fetchHouseholds();
    const d = disasters.find((x) => x._id === selectedDisaster);
    setCurrentDisaster(d || null);
    setAllocationPlans([]);
  }
}, [selectedDisaster, disasters]);

// Tab switch effect
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (activeTab === "summary") {
    fetchAllAllocations();
  }
}, [activeTab]);
 
  // ─── DATA FETCHING ────────────────────────────────────────────────────────
 
  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      const verified = (res.data || []).filter(
        (d) => d.status === "approved" || d.status === "verified"
      );
      const withIds = assignDisasterIds(verified);
      setDisasters(withIds);
    } catch {
      ToastManager.error("Failed to load disasters");
    }
  };
 
  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/allocation/assessments/${selectedDisaster}`);
      setHouseholds(res.data.assessments || res.data || []);
    } catch {
      setHouseholds([]);
    } finally {
      setLoading(false);
    }
  };
 
  const fetchAllAllocations = useCallback(async () => {
    try {
      let disasterList = disasters;
      if (disasterList.length === 0) {
        const res = await API.get("/disasters");
        disasterList = (res.data || []).filter(
          (d) => d.status === "approved" || d.status === "verified"
        );
      }
 
      const allNormalized = [];
      const allocatedIds  = new Set();
 
      await Promise.all(
        disasterList.map(async (d) => {
          try {
            const res      = await API.get(`/allocation/requests/${d._id}`);
            const requests = res.data?.requests || [];
            if (requests.length > 0) {
              allocatedIds.add(d._id);
              requests.forEach((r) =>
                allNormalized.push(
                  normalizeAllocation({ ...r, district: d.district || "N/A" })
                )
              );
            }
          } catch {
            // no allocations for this disaster yet — that is fine
          }
        })
      );
 
      setGlobalAllocations(allNormalized);
      setAllocatedDisasterIds(allocatedIds);
    } catch (err) {
      console.error("fetchAllAllocations error:", err.message);
    }
  }, [disasters]);
 
  // ─── ALLOCATION SCORING LOGIC ─────────────────────────────────────────────
 
  const getSeverityLabel = (level) =>
    ({ 1: "Minor", 2: "Moderate", 3: "Severe", 4: "Catastrophic" }[level] || "Unknown");
 
  const getSeverityClass = (level) =>
    ({ 1: "minor", 2: "moderate", 3: "severe", 4: "catastrophic" }[level] || "minor");
 
  const detectKeywordsInDescription = (description = "") => {
    const desc = (description || "").toLowerCase();
    return {
      hasChildrenUnder5:       ["infant", "baby", "toddler", "child under 5", "young child", "newborn"].some((kw) => desc.includes(kw)),
      hasDisabledMembers:      ["disabled", "wheelchair", "bedridden", "handicapped", "disability"].some((kw) => desc.includes(kw)),
      hasNoWaterAccess:        ["no water", "water cut", "no access to water", "water supply damaged", "no clean water"].some((kw) => desc.includes(kw)),
      hasInjuries:             ["injured", "hurt", "wound", "hospital", "medical attention", "casualty"].some((kw) => desc.includes(kw)),
      isUninhabitableKeywords: ["completely destroyed", "fully destroyed", "uninhabitable", "no rooms", "collapsed", "total loss"].some((kw) => desc.includes(kw)),
      hasRoofDamage:           ["roof blown", "roof damaged", "roof destroyed", "roof off", "no roof", "roofless"].some((kw) => desc.includes(kw)),
    };
  };
 
  const processDamageAndDisqualification = (household, selectedDamageLevel, keywords) => {
    const age           = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const desc          = (household.damageDescription || "").toLowerCase();
 
    let finalDamageLevel = selectedDamageLevel || 1;
    let isUninhabitable  = false;
 
    if (keywords.isUninhabitableKeywords) {
      finalDamageLevel = 4;
      isUninhabitable  = true;
    } else {
      isUninhabitable = finalDamageLevel === 4;
    }
 
    const isMoreThan50PercentHabitable =
      finalDamageLevel <= 2 ||
      desc.includes("still habitable") ||
      desc.includes("partially damaged") ||
      desc.includes("rooms habitable");
 
    const isDisqualified =
      age < 40 &&
      householdSize <= 4 &&
      monthlyIncome > 10000 &&
      isMoreThan50PercentHabitable;
 
    return { finalDamageLevel, isUninhabitable, isDisqualified };
  };
 
  const calculateVulnerabilityScore = (household, keywords) => {
    let score  = 0;
    const age    = parseInt(household.headOfHousehold?.age || household.age || 0);
    const size   = parseInt(household.householdSize || 0);
    const income = parseFloat(household.monthlyIncome || 0);
 
    if (age > 65)                   score += 2;
    if (keywords.hasChildrenUnder5) score += 2;
    if (size > 6)                   score += 2;
    if (income <= 3000)             score += 3;
    else if (income <= 10000)       score += 1;
 
    return score;
  };
 
  const calculateDamageScore   = (finalDamageLevel) => ({ 1: 1, 2: 2, 3: 3, 4: 4 }[finalDamageLevel] || 1);
 
  const determineTier = (compositeScore) => {
    if (compositeScore >= 10) return "Priority";
    if (compositeScore >= 7)  return "Extended";
    if (compositeScore >= 4)  return "Basic";
    return "Minimal";
  };
 
  /**
   * getEligiblePackages
   * Package costs calibrated against real October 2023 DMA expenditure records:
   *   Reconstruction Grant : LSL 130,000
   *   Re-roofing Kit       : LSL 35,000
   */
  const getEligiblePackages = (household, keywords, finalDamageLevel, isUninhabitable, disasterType) => {
    const age           = parseInt(household.headOfHousehold?.age || household.age || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const disasterLower = (disasterType || "").toLowerCase();
    const desc          = (household.damageDescription || "").toLowerCase();
 
    const isWindRain       = disasterLower.includes("rainfall") || disasterLower.includes("wind");
    const isDrought        = disasterLower.includes("drought");
    const isFullyDestroyed = desc.includes("completely destroyed") || desc.includes("fully destroyed");
 
    const hasMultipleHabitableRooms =
      desc.includes("still habitable") ||
      desc.includes("remaining rooms") ||
      desc.includes("rooms habitable");
 
    // No aid needed if house has habitable rooms and no injuries or disability
    const noAidNeeded =
      hasMultipleHabitableRooms &&
      !keywords.hasInjuries &&
      !keywords.hasDisabledMembers;
 
    if (noAidNeeded) return [];
 
    const pkgs = [];
 
    // Emergency Tent
    if (isUninhabitable && finalDamageLevel === 4) {
      pkgs.push({ name: "Emergency Tent", cost: 6500 });
    }
 
    // Reconstruction Grant — LSL 130,000 (real 2023 DMA figure)
    if (isFullyDestroyed && finalDamageLevel === 4 && isWindRain) {
      pkgs.push({ name: "Reconstruction Grant", cost: 130000 });
    }
 
    // Re-roofing Kit — LSL 35,000 (real 2023 DMA figure)
    if (keywords.hasRoofDamage && (finalDamageLevel === 2 || finalDamageLevel === 3) && isWindRain && !hasMultipleHabitableRooms) {
      pkgs.push({ name: "Re-roofing Kit", cost: 35000 });
    }
 
    // Tarpaulin Kit
    if (finalDamageLevel >= 2 && isWindRain && !hasMultipleHabitableRooms) {
      pkgs.push({ name: "Tarpaulin Kit", cost: 2000 });
    }
 
    // Food Parcel
    if (monthlyIncome < 10000 || isUninhabitable) {
      pkgs.push({ name: "Food Parcel", cost: 1500 });
    }
 
    // Water Tank — drought only
    if (isDrought && keywords.hasNoWaterAccess) {
      pkgs.push({ name: "Water Tank", cost: 6000 });
    }
 
    // Blanket & Clothing
    if (keywords.hasChildrenUnder5 || age > 65 || keywords.hasDisabledMembers) {
      pkgs.push({ name: "Blanket & Clothing", cost: 1500 });
    }
 
    // Medical Aid
    if (keywords.hasInjuries || keywords.hasDisabledMembers) {
      pkgs.push({ name: "Medical Aid", cost: 1000 });
    }
 
    return pkgs;
  };
 
  const getIneligibilityReason = (household, finalDamageLevel, keywords) => {
    const age           = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const desc          = (household.damageDescription || "").toLowerCase();
 
    const isMoreThan50PercentHabitable =
      finalDamageLevel <= 2 ||
      desc.includes("still habitable") ||
      desc.includes("partially damaged") ||
      desc.includes("rooms habitable");
 
    const reasons = [];
    if (age < 40)                     reasons.push("Age < 40");
    if (householdSize <= 4)           reasons.push("Household ≤ 4");
    if (monthlyIncome > 10000)        reasons.push("Income > M10,000");
    if (isMoreThan50PercentHabitable) reasons.push("> 50% rooms habitable");
 
    return reasons.length > 0 ? reasons.join("; ") : "Does not meet eligibility criteria";
  };
 
  // ─── PLAN GENERATION ──────────────────────────────────────────────────────
 
  const generateAllocationPlan = () => {
    try {
      setGeneratingPlan(true);
 
      const plans = households.map((hh, idx) => {
        const selectedDamageLevel = hh.damageSeverityLevel || 1;
        const disasterType        = hh.disasterType || currentDisaster?.type || currentDisaster?.disasterType || "";
        const keywords            = detectKeywordsInDescription(hh.damageDescription || "");
 
        const { finalDamageLevel, isUninhabitable, isDisqualified } =
          processDamageAndDisqualification(hh, selectedDamageLevel, keywords);
 
        if (isDisqualified) {
          return {
            id:                  hh._id || idx,
            hhId:                hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
            head:                hh.headOfHousehold?.name || hh.householdHeadName || "No name provided",
            district:            currentDisaster?.district || "N/A",
            damage:              getSeverityLabel(finalDamageLevel),
            damageScore:         calculateDamageScore(finalDamageLevel),
            vulnerability:       0,
            compositeScore:      0,
            tier:                "Not Eligible",
            ineligibilityReason: getIneligibilityReason(hh, finalDamageLevel, keywords),
            packages:            [],
            totalCost:           0,
            isDisqualified:      true,
          };
        }
 
        const vulnScore      = calculateVulnerabilityScore(hh, keywords);
        const damageScore    = calculateDamageScore(finalDamageLevel);
        const compositeScore = vulnScore + damageScore;
        const tier           = determineTier(compositeScore);
        const packages       = getEligiblePackages(hh, keywords, finalDamageLevel, isUninhabitable, disasterType);
 
        return {
          id:             hh._id || idx,
          hhId:           hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
          head:           hh.headOfHousehold?.name || hh.householdHeadName || "No name provided",
          district:       currentDisaster?.district || "N/A",
          damage:         getSeverityLabel(finalDamageLevel),
          damageScore,
          vulnerability:  vulnScore,
          compositeScore,
          tier,
          packages,
          totalCost:      packages.reduce((s, p) => s + p.cost, 0),
          isDisqualified: false,
        };
      });
 
      const eligible     = plans.filter((p) => !p.isDisqualified).sort((a, b) => b.compositeScore - a.compositeScore);
      const disqualified = plans.filter((p) => p.isDisqualified);
 
      setAllocationPlans([...eligible, ...disqualified]);
 
      const totalAidRequired = eligible.reduce((sum, p) => sum + p.totalCost, 0);
      const tiers = {
        Priority: eligible.filter((p) => p.tier === "Priority").length,
        Extended: eligible.filter((p) => p.tier === "Extended").length,
        Basic:    eligible.filter((p) => p.tier === "Basic").length,
        Minimal:  eligible.filter((p) => p.tier === "Minimal").length,
      };
 
      ToastManager.success(
        `Plan generated: ${eligible.length} eligible (Priority: ${tiers.Priority}, Extended: ${tiers.Extended}, Basic: ${tiers.Basic}, Minimal: ${tiers.Minimal}), ${disqualified.length} disqualified. Total: M${totalAidRequired.toLocaleString()}`
      );
    } catch (err) {
      console.error("Error generating plan:", err);
      ToastManager.error("Failed to generate allocation plan");
    } finally {
      setGeneratingPlan(false);
    }
  };
 
 
  // ─── ALLOCATE PLAN ────────────────────────────────────────────────────────
 
  const handleAllocatePlan = async () => {
    if (allocatedDisasterIds.has(selectedDisaster)) {
      ToastManager.info("This disaster has already been allocated.");
      return;
    }
 
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId   = userData?.user?._id || userData?.user?.id || userData?._id || userData?.id;
    const userRole = userData?.user?.role || userData?.role;
 
    const allowed = ["Finance Officer", "Coordinator", "Administrator"];
    if (!allowed.includes(userRole)) {
      ToastManager.error(`Role "${userRole}" cannot allocate.`);
      return;
    }
 
    const eligiblePlans = allocationPlans.filter((p) => !p.isDisqualified && p.packages.length > 0);
 
    if (eligiblePlans.length === 0) {
      try {
        await API.post("/allocation/allocate", {
          disasterId:       selectedDisaster,
          noEligibleMarker: true,
        });
        await fetchAllAllocations();
        ToastManager.success("Disaster assessment approved. No eligible households for aid identified.");
        return;
      } catch (err) {
        console.error("Failed to approve ineligible disaster:", err.response?.data?.message || err.message);
        ToastManager.error(err.response?.data?.message || "Failed to approve disaster assessment");
        return;
      }
    }
 
    let successCount = 0;
 
    for (const plan of eligiblePlans) {
      try {
        await API.post("/allocation/allocate", {
          disasterId:            selectedDisaster,
          householdAssessmentId: plan.id,
          householdId:           plan.hhId,
          householdHeadName:     plan.head,
          packages:              plan.packages,
          totalCost:             plan.totalCost,
          compositeScore:        plan.compositeScore,
          damageScore:           plan.damageScore,
          vulnerability:         plan.vulnerability,
          tier:                  plan.tier,
          allocatedBy:           userId,
          timestamp:             new Date().toISOString(),
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to allocate ${plan.head}:`, err.response?.data?.message || err.message);
      }
    }
 
    if (successCount > 0) {
      await fetchAllAllocations();
      if (successCount === eligiblePlans.length) {
        ToastManager.success(
          `All ${successCount} households allocated and approved. Ready for disbursement.`
        );
      } else {
        ToastManager.warning(`${successCount}/${eligiblePlans.length} households allocated.`);
      }
    } else {
      ToastManager.error("Allocation failed. Check console for details.");
    }
  };

  // ─── DISBURSE ALLOCATION ──────────────────────────────────────────────────

  const handleDisburse = async (allocationId) => {
    try {
      const disbursementData = {
        disbursedDate: new Date(),
        disbursementMethod: 'Bank Transfer',
      };

      await API.put(`/allocation/requests/${allocationId}/disburse`, {
        disbursementData,
        useReserve: false,
      });

      await fetchAllAllocations();
      ToastManager.success("Allocation disbursed successfully");
    } catch (err) {
      console.error('Failed to disburse allocation:', err);
      ToastManager.error(err.response?.data?.message || "Failed to disburse allocation");
    }
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────
 
  const getIncomeCategory = (income) => {
    const n = parseFloat(income) || 0;
    if (n <= 3000)  return "Low";
    if (n <= 10000) return "Middle";
    return "High";
  };
 
  const isCurrentAllocated = allocatedDisasterIds.has(selectedDisaster);
 
  // ─── SUMMARY COMPUTED VALUES ──────────────────────────────────────────────
 
  const totalBudget   = globalAllocations.reduce((s, a) => s + a.totalCost, 0);
  const totalPackages = globalAllocations.reduce((s, a) => s + a.packages.length, 0);
  const numDisasters  = allocatedDisasterIds.size;
 
  const byDistrict = {};
  globalAllocations.forEach((a) => {
    const d       = a.district || "Unknown";
    byDistrict[d] = (byDistrict[d] || 0) + a.totalCost;
  });
  const districtEntries = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]);
 
  const packageCounts = {};
  globalAllocations.forEach((a) =>
    a.packages.forEach((p) => {
      packageCounts[p.name] = (packageCounts[p.name] || 0) + 1;
    })
  );
  const totalPkgCount  = Object.values(packageCounts).reduce((s, v) => s + v, 0);
  const packageEntries = Object.entries(packageCounts)
    .map(([name, count]) => ({ name, count, pct: totalPkgCount ? ((count / totalPkgCount) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count);
 
 
  // ─── RENDER ───────────────────────────────────────────────────────────────
 
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
              <option value="">Select a disaster…</option>
              {disasters
                .filter((d) => !allocatedDisasterIds.has(d._id))
                .map((d) => (
                  <option key={d._id} value={d._id}>
                    {getDisasterId(d, disasters)} – {d.type} ({d.district})
                  </option>
                ))}
            </select>
          </div>
          <div className="household-count">
            {households.length}{" "}
            {currentDisaster?.numberOfHouseholdsAffected
              ? `of ${currentDisaster.numberOfHouseholdsAffected}`
              : ""}{" "}
            household(s) assessed
          </div>
        </div>
 
        {/* Tabs */}
        <div className="tabs-section">
          <button className={`tab-btn ${activeTab === "assess" ? "active" : ""}`} onClick={() => setActiveTab("assess")}>
            <Plus size={18} /> Assess Household
          </button>
          <button className={`tab-btn ${activeTab === "plan" ? "active" : ""}`} onClick={() => setActiveTab("plan")}>
            <FileText size={18} /> Allocation Plan
          </button>
          <button className={`tab-btn ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
            <Eye size={18} /> Summary Dashboard
          </button>
        </div>
 
        {/* ── TAB: Assess Household ──────────────────────────────────────── */}
        {activeTab === "assess" && (
          <div className="tab-content">
            {households.length === 0 ? (
              <div className="placeholder-section">
                <h3>Assessed Households</h3>
                <p>No household assessments found for this disaster.</p>
              </div>
            ) : (
              <div className="households-table-section">
                <h3>Assessed Households from Approved Disaster</h3>
                <div className="households-table-wrapper">
                  <table className="households-table">
                    <thead>
                      <tr>
                        <th>Household Head</th><th>Gender</th><th>Age</th>
                        <th>Size</th><th>Income Category</th><th>Damage Severity</th>
                        <th>Damage Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {households.map((hh, idx) => (
                        <tr key={hh._id || idx}>
                          <td className="font-medium">{hh.headOfHousehold?.name || hh.householdHeadName}</td>
                          <td>{hh.headOfHousehold?.gender || hh.gender}</td>
                          <td>{hh.headOfHousehold?.age || hh.age}</td>
                          <td>{hh.householdSize}</td>
                          <td>
                            <span className={`income-badge ${getIncomeCategory(hh.monthlyIncome).toLowerCase()}`}>
                              {getIncomeCategory(hh.monthlyIncome)}
                            </span>
                          </td>
                          <td>
                            <span className={`severity-badge ${getSeverityClass(hh.damageSeverityLevel)}`}>
                              {getSeverityLabel(hh.damageSeverityLevel)}
                            </span>
                          </td>
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
 
        {/* ── TAB: Allocation Plan ───────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div className="tab-content">
            <div className="allocation-plan-section">
              <div className="plan-header">
                <div>
                  <h3>
                    Aid Allocation Plan —{" "}
                    {currentDisaster?.disasterCode || selectedDisaster?.substring(0, 8) || "Selected Disaster"}
                  </h3>
                  <p className="plan-subtitle">{households.length} households assessed</p>
                </div>
                {allocationPlans.length === 0 && (
                  <button
                    className="btn-generate-plan"
                    onClick={generateAllocationPlan}
                    disabled={generatingPlan || households.length === 0}
                  >
                    {generatingPlan ? "Generating…" : "Generate Allocation Plan"}
                  </button>
                )}
              </div>
 
              {households.length === 0 ? (
                <div className="placeholder-section">
                  <p>Select a disaster and assess households first.</p>
                </div>
              ) : allocationPlans.length > 0 ? (
                <div className="allocation-table-wrapper">
                  <table className="allocation-table">
                    <thead>
                      <tr>
                        <th>HH ID</th><th>Head</th><th>District</th><th>Damage</th>
                        <th>Damage Score</th><th>Vuln. Score</th><th>Composite</th>
                        <th>Packages</th><th>Eligibility Note</th><th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationPlans.map((plan) => {
                        const rawHH = households.find((h) => h._id === plan.id) || {};
                        const kw    = detectKeywordsInDescription(rawHH.damageDescription || "");
                        return (
                          <tr
                            key={plan.id}
                            style={{
                              backgroundColor: plan.isDisqualified ? "#fef2f2" : "transparent",
                              opacity:         plan.isDisqualified ? 0.7 : 1,
                            }}
                          >
                            <td className="font-mono">{plan.hhId}</td>
                            <td className="font-medium">{plan.head}</td>
                            <td>{plan.district}</td>
                            <td>{plan.damage}</td>
                            <td className="text-center">{plan.damageScore}</td>
                            <td className="text-center">{plan.vulnerability}</td>
                            <td className="text-center font-bold">{plan.compositeScore}</td>
                            <td>
                              {plan.packages.length === 0 ? (
                                <div className="ineligible-info">
                                  <span className="ineligible-badge">Not Eligible</span>
                                </div>
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
                            <td className="eligibility-note" style={{ textAlign: "center" }}>
                              {plan.isDisqualified ? (
                                <span className="note-ineligible">
                                  {getIneligibilityReason(rawHH, plan.damageScore, kw)}
                                </span>
                              ) : (
                                <span className="note-eligible">—</span>
                              )}
                            </td>
                            <td className="text-right font-bold">
                              {plan.totalCost === 0 ? "—" : `M${plan.totalCost.toLocaleString()}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
 
                  <div className="allocate-plan-footer">
                    {isCurrentAllocated ? (
                      <div className="already-allocated-badge">
                        ✓ Allocation Plan Complete — Requests submitted for Finance Officer approval
                      </div>
                    ) : (
                      <button className="btn-allocate-plan" onClick={handleAllocatePlan}>
                        Allocate Plan & Mark Assessed
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="placeholder-section">
                  <p>Click "Generate Allocation Plan" to create a plan for the assessed households.</p>
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* ── TAB: Summary Dashboard ─────────────────────────────────────── */}
        {activeTab === "summary" && (
          <div className="tab-content">
            {globalAllocations.length === 0 ? (
              <div className="placeholder-section">
                <h3>Summary Dashboard</h3>
                <p>No allocations have been made yet. Allocate a disaster plan to see data here.</p>
              </div>
            ) : (
              <div className="summary-dashboard">
 
                {/* KPI Cards */}
                <div className="summary-cards">
                  <div className="summary-card">
                    <p className="card-label">Total Budget Allocated</p>
                    <p className="card-value">M{totalBudget.toLocaleString()}</p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Packages Distributed</p>
                    <p className="card-value">{totalPackages}</p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Disasters Allocated</p>
                    <p className="card-value">{numDisasters}</p>
                  </div>
                  <div className="summary-card">
                    <p className="card-label">Households Supported</p>
                    <p className="card-value">{globalAllocations.length}</p>
                  </div>
                </div>
 
                {/* Charts */}
                <div className="charts-row">
                  <div className="chart-card">
                    <h4>Budget by District</h4>
                    <div className="chart-container">
                      {districtEntries.length === 0 ? (
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>No data</p>
                      ) : (() => {
                        const count     = districtEntries.length;
                        const maxVal    = Math.max(...districtEntries.map((e) => e[1])) || 1;
                        const chartW    = Math.max(520, 80 + count * 60);
                        const chartH    = 220;
                        const padL      = 60;
                        const padB      = 40;
                        const plotW     = chartW - padL - 10;
                        const plotH     = chartH - padB - 10;
                        const bw        = Math.floor(plotW / count) - 12;
                        const gap       = Math.floor((plotW - bw * count) / (count + 1));
                        return (
                          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="bar-chart-svg" style={{ overflow: "visible" }}>
                            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                              const y = 10 + (1 - frac) * plotH;
                              return (
                                <g key={i}>
                                  <line x1={padL} y1={y} x2={chartW - 10} y2={y} className="grid-line" />
                                  <text x={padL - 6} y={y + 4} textAnchor="end" className="axis-label" fontSize="11">
                                    M{Math.round(maxVal * frac)}
                                  </text>
                                </g>
                              );
                            })}
                            <line x1={padL} y1="10" x2={padL} y2={10 + plotH} className="axis-line" />
                            <line x1={padL} y1={10 + plotH} x2={chartW - 10} y2={10 + plotH} className="axis-line" />
                            {districtEntries.map(([label, val], idx) => {
                              const bx = padL + gap + idx * (bw + gap);
                              const bh = Math.max(2, (val / maxVal) * plotH);
                              const by = 10 + plotH - bh;
                              return (
                                <g key={idx}>
                                  <rect x={bx} y={by} width={bw} height={bh} fill="#1f3b5c" rx="3" className="bar" />
                                  <text x={bx + bw / 2} y={10 + plotH + 14} textAnchor="middle" className="axis-label" fontSize="10">
                                    {label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
 
                  <div className="chart-card">
                    <h4>Packages Distributed</h4>
                    <div className="chart-container">
                      {packageEntries.length === 0 ? (
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>No data</p>
                      ) : (() => {
                        const colors = ["#1f3b5c", "#2f8f83", "#6c9bcf", "#8bc4a0", "#e8a87c", "#c084a0", "#a3c4f3"];
                        const cx = 120, cy = 130, r = 90;
                        let angle = -90;
                        const slices = packageEntries.map((entry, idx) => {
                          const sweep = (entry.count / totalPkgCount) * 360;
                          const start = angle;
                          const end   = angle + sweep;
                          angle       = end;
                          const toRad = (d) => (d * Math.PI) / 180;
                          return {
                            ...entry,
                            sx: cx + r * Math.cos(toRad(start)), sy: cy + r * Math.sin(toRad(start)),
                            ex: cx + r * Math.cos(toRad(end)),   ey: cy + r * Math.sin(toRad(end)),
                            sweep, color: colors[idx % colors.length],
                          };
                        });
                        const legendX = 240, legendStartY = 30, rowH = 22;
                        const svgH = Math.max(270, legendStartY + packageEntries.length * rowH + 20);
                        return (
                          <svg width="100%" viewBox={`0 0 460 ${svgH}`} className="pie-chart-svg">
                            {slices.map((sl, i) => (
                              <path key={i}
                                d={`M${cx},${cy} L${sl.sx},${sl.sy} A${r},${r} 0 ${sl.sweep > 180 ? 1 : 0} 1 ${sl.ex},${sl.ey} Z`}
                                fill={sl.color} stroke="white" strokeWidth="2" className="pie-slice"
                              />
                            ))}
                            {slices.map((sl, i) => (
                              <g key={`leg-${i}`}>
                                <rect x={legendX} y={legendStartY + i * rowH} width="12" height="12" rx="2" fill={sl.color} />
                                <text x={legendX + 18} y={legendStartY + i * rowH + 10} className="pie-label" fontSize="11" fill="var(--color-text-primary)">
                                  {sl.name} ({sl.pct}%)
                                </text>
                              </g>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>
 
                {/* Disaster Allocation Log — Swimlane Sections */}
<div className="status-panel-card">
  <div className="panel-header">
    <h3 className="panel-title">Disaster Allocation Log</h3>
    <div className="allocation-counters">
      <span className="counter pending-counter">
        Pending {globalAllocations.filter(a => a.status === "Proposed").length}
      </span>
      <span className="counter ready-counter">
        To Disburse {globalAllocations.filter(a => a.status !== "Proposed" && a.status !== "Disbursed").length}
      </span>
      <span className="counter complete-counter">
        Complete {globalAllocations.filter(a => a.status === "Disbursed").length}
      </span>
    </div>
  </div>

  {/* Pending Approval Section */}
  <div className="swimlane-section pending-section">
    <button
      className="swimlane-header"
      onClick={() => setExpandedSections({ ...expandedSections, pending: !expandedSections.pending })}
    >
      <div className="header-content">
        <span className="section-title">Pending Approval</span>
        <span className="section-count">
          {globalAllocations.filter(a => a.status === "Proposed").length}
        </span>
      </div>
      {expandedSections.pending ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {expandedSections.pending && (
      <div className="swimlane-content">
        <table className="allocation-table">
          <thead>
            <tr>
              <th>Disaster</th>
              <th>Household</th>
              <th>Packages</th>
              <th>Allocation Amount</th>
              <th>Date Allocated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {globalAllocations
              .filter(a => a.status === "Proposed")
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((alloc, i) => {
                const disaster = disasters.find((d) => d._id === alloc.disasterId);
                const label = disaster
                  ? `${getDisasterId(disaster, disasters)} – ${disaster.type} (${disaster.district})`
                  : alloc.disasterId || "—";
                return (
                  <tr key={i} className="row-pending">
                    <td className="cell-name">{label}</td>
                    <td>{alloc.householdName}</td>
                    <td>{alloc.packages.length}</td>
                    <td className="cell-cost">M{alloc.totalCost.toLocaleString()}</td>
                    <td className="cell-date">
                      {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="cell-actions">
                      <span style={{ color: "#d97706", fontSize: "0.8rem", fontWeight: "600" }}>⏳ Pending</span>
                    </td>
                  </tr>
                );
              })}
            {globalAllocations.filter(a => a.status === "Proposed").length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                  No pending allocations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>

  {/* Ready to Disburse Section */}
  <div className="swimlane-section ready-section">
    <button
      className="swimlane-header"
      onClick={() => setExpandedSections({ ...expandedSections, ready: !expandedSections.ready })}
    >
      <div className="header-content">
        <span className="section-title">Ready to Disburse</span>
        <span className="section-count">
          {globalAllocations.filter(a => a.status !== "Proposed" && a.status !== "Disbursed").length}
        </span>
      </div>
      {expandedSections.ready ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {expandedSections.ready && (
      <div className="swimlane-content">
        <table className="allocation-table">
          <thead>
            <tr>
              <th>Disaster</th>
              <th>Household</th>
              <th>Packages</th>
              <th>Allocation Amount</th>
              <th>Date Allocated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {globalAllocations
              .filter(a => a.status !== "Proposed" && a.status !== "Disbursed")
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((alloc, i) => {
                const disaster = disasters.find((d) => d._id === alloc.disasterId);
                const label = disaster
                  ? `${getDisasterId(disaster, disasters)} – ${disaster.type} (${disaster.district})`
                  : alloc.disasterId || "—";
                return (
                  <tr key={i} className="row-ready">
                    <td className="cell-name">{label}</td>
                    <td>{alloc.householdName}</td>
                    <td>{alloc.packages.length}</td>
                    <td className="cell-cost">M{alloc.totalCost.toLocaleString()}</td>
                    <td className="cell-date">
                      {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn-action btn-disburse"
                        onClick={() => handleDisburse(alloc._id)}
                      >
                        Disburse
                      </button>
                    </td>
                  </tr>
                );
              })}
            {globalAllocations.filter(a => a.status !== "Proposed" && a.status !== "Disbursed").length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                  No allocations ready to disburse
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>

  {/* Complete Section */}
  <div className="swimlane-section complete-section">
    <button
      className="swimlane-header"
      onClick={() => setExpandedSections({ ...expandedSections, complete: !expandedSections.complete })}
    >
      <div className="header-content">
        <span className="section-title">Complete</span>
        <span className="section-count">
          {globalAllocations.filter(a => a.status === "Disbursed").length}
        </span>
      </div>
      {expandedSections.complete ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    {expandedSections.complete && (
      <div className="swimlane-content">
        <table className="allocation-table">
          <thead>
            <tr>
              <th>Disaster</th>
              <th>Household</th>
              <th>Packages</th>
              <th>Allocation Amount</th>
              <th>Date Allocated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {globalAllocations
              .filter(a => a.status === "Disbursed")
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((alloc, i) => {
                const disaster = disasters.find((d) => d._id === alloc.disasterId);
                const label = disaster
                  ? `${getDisasterId(disaster, disasters)} – ${disaster.type} (${disaster.district})`
                  : alloc.disasterId || "—";
                return (
                  <tr key={i} className="row-complete">
                    <td className="cell-name">{label}</td>
                    <td>{alloc.householdName}</td>
                    <td>{alloc.packages.length}</td>
                    <td className="cell-cost">M{alloc.totalCost.toLocaleString()}</td>
                    <td className="cell-date">
                      {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="cell-actions">
                      <span className="status-complete">✓ Complete</span>
                    </td>
                  </tr>
                );
              })}
            {globalAllocations.filter(a => a.status === "Disbursed").length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                  No completed allocations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}