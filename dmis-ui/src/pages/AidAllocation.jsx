import React, { useState, useEffect, useCallback } from "react";
import { Plus, Eye, FileText, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import { assignDisasterIds, getDisasterId } from "../utils/locationUtils";
import "./AidAllocation.css";

// Normalize any allocation record (backend or local) into one consistent shape
function normalizeAllocation(raw) {
  return {
    _id:            raw._id              || "",
    requestId:      raw.requestId        || "",
    householdId:    raw.householdId      || raw.householdAssessmentId || "",
    householdName:  raw.householdName    || raw.householdHeadName     || "No name provided",
    district:       raw.district         || "N/A",
    disasterId:     raw.disasterId       || "",
    status:         raw.status           || "Proposed", // NEW: Include status for workflow
    // packages: always an array of { name, cost }
    packages: (raw.allocatedPackages || raw.packages || []).map((p) => ({
      name: p.packageName || p.name || "Package",
      cost: p.totalCost   || p.unitCost || p.cost || 0,
    })),
    // totalCost: always a number
    totalCost:      raw.totalEstimatedCost ?? raw.totalCost ?? 0,
    isOverride:     raw.isOverride        || raw.isOverridden || false,
    createdAt:      raw.createdAt         || raw.timestamp    || null,
  };
}

export default function AidAllocation() {
  const [disasters, setDisasters]                   = useState([]);
  const [selectedDisaster, setSelectedDisaster]     = useState("");
  const [currentDisaster, setCurrentDisaster]       = useState(null);
  const [activeTab, setActiveTab]                   = useState("assess");
  const [households, setHouseholds]                 = useState([]);
  const [allocationPlans, setAllocationPlans]       = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [generatingPlan, setGeneratingPlan]         = useState(false);
  const [overriddenHouseholds, setOverriddenHouseholds] = useState({});
  // Global normalized allocations — persisted across tab switches and re-fetched on mount
  const [globalAllocations, setGlobalAllocations]   = useState([]);
  // Set of disaster IDs that already have at least one allocation in the backend
  const [allocatedDisasterIds, setAllocatedDisasterIds] = useState(new Set());
  // Toggle states for summary dashboard sections
  const [showDisbursedDetails, setShowDisbursedDetails] = useState(false);
  const [showPendingDetails, setShowPendingDetails]     = useState(false);
  const [showDisasterLogDetails, setShowDisasterLogDetails] = useState(false);

  // ─── Boot: fetch disasters + all existing allocations ────────────────────
  useEffect(() => {
    fetchDisasters();
    fetchAllAllocations();
  }, []);

  // ─── When selected disaster changes, reload households & plan ─────────────
  useEffect(() => {
    if (selectedDisaster) {
      fetchHouseholds();
      const d = disasters.find((x) => x._id === selectedDisaster);
      setCurrentDisaster(d || null);
      setAllocationPlans([]);
      setOverriddenHouseholds({});
    }
  }, [selectedDisaster, disasters]);

  // ─── Refresh summary whenever the summary tab is opened ──────────────────
  useEffect(() => {
    if (activeTab === "summary") {
      fetchAllAllocations();
    }
  }, [activeTab]);

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────

  const fetchDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      const verified = (res.data || []).filter(
        (d) => d.status === "approved" || d.status === "verified"
      );
      const withIds = assignDisasterIds(verified);
      setDisasters(withIds);
      // Do NOT auto-select first disaster - user should manually select
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

  /**
   * Fetch ALL allocation requests across every disaster and normalize them.
   * We iterate over all known disasters; if the backend has a cross-disaster
   * endpoint you can simplify this to a single call.
   */
  const fetchAllAllocations = useCallback(async () => {
    try {
      // Fetch the disaster list if we haven't yet (e.g. on initial boot)
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
            const res = await API.get(`/allocation/requests/${d._id}`);
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
            // individual disaster may have no allocations — that's fine
          }
        })
      );

      setGlobalAllocations(allNormalized);
      setAllocatedDisasterIds(allocatedIds);
    } catch (err) {
      console.error("fetchAllAllocations error:", err.message);
    }
  }, [disasters]);

  // ─────────────────────────────────────────────────────────────────────────
  // ALLOCATION SCORING LOGIC - STRENGTHENED ENGINE
  // ─────────────────────────────────────────────────────────────────────────

  const getSeverityLabel = (level) =>
    ({ 1: "Minor", 2: "Moderate", 3: "Severe", 4: "Catastrophic" }[level] || "Unknown");

  const getSeverityClass = (level) =>
    ({ 1: "minor", 2: "moderate", 3: "severe", 4: "catastrophic" }[level] || "minor");

  /**
   * STEP 2: Robust keyword detection using includes() with lowercase normalization
   */
  const detectKeywordsInDescription = (description = "") => {
    const desc = (description || "").toLowerCase();
    
    const hasChildrenUnder5 = ["infant", "baby", "toddler", "child under 5", "young child", "newborn"]
      .some(kw => desc.includes(kw));
    
    const hasDisabledMembers = ["disabled", "wheelchair", "bedridden", "handicapped", "disability"]
      .some(kw => desc.includes(kw));
    
    const hasNoWaterAccess = ["no water", "water cut", "no access to water", "water supply damaged", "no clean water"]
      .some(kw => desc.includes(kw));
    
    const hasInjuries = ["injured", "hurt", "wound", "hospital", "medical attention", "casualty"]
      .some(kw => desc.includes(kw));
    
    const isUninhabitableKeywords = ["completely destroyed", "fully destroyed", "uninhabitable", "no rooms", "collapsed", "total loss"]
      .some(kw => desc.includes(kw));
    
    const hasRoofDamage = ["roof blown", "roof damaged", "roof destroyed", "roof off", "no roof", "roofless"]
      .some(kw => desc.includes(kw));
    
    return {
      hasChildrenUnder5,
      hasDisabledMembers,
      hasNoWaterAccess,
      hasInjuries,
      isUninhabitableKeywords,
      hasRoofDamage,
    };
  };

  /**
   * STEP 3 & 4: Override damage level and check disqualification
   * Returns { finalDamageLevel, isUninhabitable, isDisqualified }
   */
  const processDamageAndDisqualification = (household, selectedDamageLevel, keywords) => {
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const desc = (household.damageDescription || "").toLowerCase();

    // STEP 3: Override damage level if uninhabitable keywords found
    let finalDamageLevel = selectedDamageLevel || 1;
    let isUninhabitable = false;

    if (keywords.isUninhabitableKeywords) {
      finalDamageLevel = 4;
      isUninhabitable = true;
    } else {
      isUninhabitable = (finalDamageLevel === 4);
    }

    // STEP 4: Check disqualification (BEFORE any other logic)
    // Disqualified if ALL conditions are true:
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

  /**
   * STEP 5: Calculate vulnerability score
   * Only called if NOT disqualified
   */
  const calculateVulnerabilityScore = (household, keywords) => {
    let score = 0;
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const income = parseFloat(household.monthlyIncome || 0);

    if (age > 65) score += 2;
    if (keywords.hasChildrenUnder5) score += 2;
    if (householdSize > 6) score += 2;
    if (income <= 3000) score += 3;
    else if (income <= 10000) score += 1;

    return score;
  };

  /**
   * STEP 6: Calculate damage score based on FINAL damage level
   */
  const calculateDamageScore = (finalDamageLevel) => {
    const scores = { 1: 1, 2: 2, 3: 3, 4: 4 };
    return scores[finalDamageLevel] || 1;
  };

  /**
   * STEP 7: Determine tier from composite score
   */
  const determineTier = (compositeScore) => {
    if (compositeScore >= 10) return "Priority";
    if (compositeScore >= 7) return "Extended";
    if (compositeScore >= 4) return "Basic";
    return "Minimal";
  };

  /**
   * STEP 8: Get eligible packages - STRICT enforcement, NO exceptions
   * Also includes logic to prevent unnecessary aid allocation
   */
  const getEligiblePackages = (household, keywords, finalDamageLevel, isUninhabitable, disasterType) => {
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const disasterLower = (disasterType || "").toLowerCase();
    const desc = (household.damageDescription || "").toLowerCase();
    
    const isWindRain = disasterLower.includes("rainfall") || disasterLower.includes("wind");
    const isDrought = disasterLower.includes("drought");
    
    /**
     * SECTION 1: Extract room information from damage description
     * Detect if fully destroyed vs partially damaged with habitable rooms
     */
    const isFullyDestroyed = desc.includes("completely destroyed") || desc.includes("fully destroyed");
    const isPartiallyDamaged = desc.includes("partially") || desc.includes("some rooms");
    const hasMultipleHabitableRooms = desc.includes("still habitable") || 
                                      desc.includes("remaining rooms") || 
                                      desc.includes("rooms habitable");
    
    /**
     * SECTION 2: Check "No Aid Needed" condition
     * Aid is not needed if: house still habitable AND no injuries AND no disability
     * These households should receive no assistance
     */
    const noAidNeeded = hasMultipleHabitableRooms && 
                        !keywords.hasInjuries && 
                        !keywords.hasDisabledMembers;
    
    if (noAidNeeded) {
      // Return empty package list - no aid required
      return [];
    }
    
    const pkgs = [];

    // Emergency Tent: ONLY if isUninhabitable AND damageLevel === 4
    if (isUninhabitable && finalDamageLevel === 4) {
      pkgs.push({ name: "Emergency Tent", cost: 6500 });
    }

    /**
     * SECTION 3: Fixed Reconstruction Grant Logic
     * ONLY give when house is truly uninhabitable (completely destroyed)
     * Do NOT give when homes are partially damaged with habitable rooms
     */
    if (isFullyDestroyed && finalDamageLevel === 4 && isWindRain) {
      pkgs.push({ name: "Reconstruction Grant", cost: 75000 });
    }

    // Re-roofing Kit: ONLY if hasRoofDamage AND (damageLevel 2 or 3) AND (Heavy Rainfall OR Strong Winds)
    // BUT NOT if multiple rooms still habitable
    if (keywords.hasRoofDamage && (finalDamageLevel === 2 || finalDamageLevel === 3) && isWindRain && !hasMultipleHabitableRooms) {
      pkgs.push({ name: "Re-roofing Kit", cost: 18000 });
    }

    // Tarpaulin Kit: ONLY if damageLevel >= 2 AND (Heavy Rainfall OR Strong Winds)
    // BUT NOT if multiple rooms still habitable
    if (finalDamageLevel >= 2 && isWindRain && !hasMultipleHabitableRooms) {
      pkgs.push({ name: "Tarpaulin Kit", cost: 2000 });
    }

    // Food Parcel: ONLY if income < 10000 OR isUninhabitable
    if (monthlyIncome < 10000 || isUninhabitable) {
      pkgs.push({ name: "Food Parcel", cost: 1500 });
    }

    // Water Tank: ONLY if Drought AND hasNoWaterAccess
    if (isDrought && keywords.hasNoWaterAccess) {
      pkgs.push({ name: "Water Tank", cost: 6000 });
    }

    // Blanket & Clothing: ONLY if hasChildrenUnder5 OR age > 65 OR hasDisabledMembers
    if (keywords.hasChildrenUnder5 || age > 65 || keywords.hasDisabledMembers) {
      pkgs.push({ name: "Blanket & Clothing", cost: 1500 });
    }

    // Medical Aid: ONLY if hasInjuries OR hasDisabledMembers (actual medical needs)
    if (keywords.hasInjuries || keywords.hasDisabledMembers) {
      pkgs.push({ name: "Medical Aid", cost: 1000 });
    }

    return pkgs;
  };

  const getIneligibilityReason = (household, finalDamageLevel, keywords) => {
    const age = parseInt(household.headOfHousehold?.age || household.age || 0);
    const householdSize = parseInt(household.householdSize || 0);
    const monthlyIncome = parseFloat(household.monthlyIncome || 0);
    const desc = (household.damageDescription || "").toLowerCase();
    
    const isMoreThan50PercentHabitable = 
      finalDamageLevel <= 2 || 
      desc.includes("still habitable") || 
      desc.includes("partially damaged") ||
      desc.includes("rooms habitable");

    const reasons = [];
    if (age < 40) reasons.push("Age < 40");
    if (householdSize <= 4) reasons.push("Household ≤ 4");
    if (monthlyIncome > 10000) reasons.push("Income > M10,000");
    if (isMoreThan50PercentHabitable) reasons.push("> 50% rooms habitable");
    
    return reasons.length > 0 ? reasons.join("; ") : "Does not meet eligibility criteria";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PLAN GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  const generateAllocationPlan = () => {
    try {
      setGeneratingPlan(true);
      setOverriddenHouseholds({});

      const plans = households.map((hh, idx) => {
        const selectedDamageLevel = hh.damageSeverityLevel || 1;
        const disasterType = hh.disasterType || currentDisaster?.type || currentDisaster?.disasterType || "";
        const keywords = detectKeywordsInDescription(hh.damageDescription || "");
        
        // STEP 3 & 4: Process damage level override and check disqualification
        const { finalDamageLevel, isUninhabitable, isDisqualified } = 
          processDamageAndDisqualification(hh, selectedDamageLevel, keywords);

        if (isDisqualified) {
          const ineligReason = getIneligibilityReason(hh, finalDamageLevel, keywords);
          return {
            id: hh._id || idx, 
            hhId: hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
            head: hh.headOfHousehold?.name || hh.householdHeadName || "No name provided",
            district: currentDisaster?.district || "N/A",
            damage: getSeverityLabel(finalDamageLevel), 
            damageScore: calculateDamageScore(finalDamageLevel),
            vulnerability: 0, 
            compositeScore: 0, 
            tier: "Not Eligible",
            ineligibilityReason: ineligReason,
            packages: [], 
            totalCost: 0, 
            isDisqualified: true,
          };
        }

        // STEP 5-7: Calculate scores and determine tier
        const vulnScore = calculateVulnerabilityScore(hh, keywords);
        const damageScore = calculateDamageScore(finalDamageLevel);
        const compositeScore = vulnScore + damageScore;
        const tier = determineTier(compositeScore);

        // STEP 8: Get eligible packages (strict enforcement)
        const packages = getEligiblePackages(hh, keywords, finalDamageLevel, isUninhabitable, disasterType);

        return {
          id: hh._id || idx, 
          hhId: hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
          head: hh.headOfHousehold?.name || hh.householdHeadName || "No name provided",
          district: currentDisaster?.district || "N/A",
          damage: getSeverityLabel(finalDamageLevel), 
          damageScore,
          vulnerability: vulnScore, 
          compositeScore, 
          tier,
          packages, 
          totalCost: packages.reduce((s, p) => s + p.cost, 0),
          isDisqualified: false,
        };
      });

      // STEP 9: Sort and separate
      const eligible = plans.filter((p) => !p.isDisqualified).sort((a, b) => b.compositeScore - a.compositeScore);
      const disqualified = plans.filter((p) => p.isDisqualified);
      
      setAllocationPlans([...eligible, ...disqualified]);

      // STEP 10: Summary calculation
      const totalAidRequired = eligible.reduce((sum, p) => sum + p.totalCost, 0);
      const tiers = {
        Priority: eligible.filter(p => p.tier === "Priority").length,
        Extended: eligible.filter(p => p.tier === "Extended").length,
        Basic: eligible.filter(p => p.tier === "Basic").length,
        Minimal: eligible.filter(p => p.tier === "Minimal").length,
      };

      ToastManager.success(
        `Plan generated: ${eligible.length} eligible (Priority: ${tiers.Priority}, Extended: ${tiers.Extended}, Basic: ${tiers.Basic}, Minimal: ${tiers.Minimal}), ${disqualified.length} disqualified. Total aid needed: M${totalAidRequired}`
      );
    } catch (err) {
      console.error("Error generating plan:", err);
      ToastManager.error("Failed to generate allocation plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // OVERRIDE
  // ─────────────────────────────────────────────────────────────────────────

  const handleOverride = (planId, household) => {
    setOverriddenHouseholds((prev) => ({ ...prev, [planId]: true }));
    setAllocationPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        
        const selectedDamageLevel = household.damageSeverityLevel || 1;
        const disasterType = household.disasterType || currentDisaster?.type || "";
        const keywords = detectKeywordsInDescription(household.damageDescription || "");
        
        // Process with damage override
        const { finalDamageLevel, isUninhabitable } = 
          processDamageAndDisqualification(household, selectedDamageLevel, keywords);
        
        // Calculate scores
        const vulnScore = calculateVulnerabilityScore(household, keywords);
        const damageScore = calculateDamageScore(finalDamageLevel);
        const compositeScore = vulnScore + damageScore;
        const tier = determineTier(compositeScore);
        
        // Get packages
        const packages = getEligiblePackages(household, keywords, finalDamageLevel, isUninhabitable, disasterType);
        
        return {
          ...plan, 
          isDisqualified: false, 
          vulnerability: vulnScore,
          damage: getSeverityLabel(finalDamageLevel),
          damageScore,
          compositeScore, 
          tier,
          packages, 
          totalCost: packages.reduce((s, p) => s + p.cost, 0), 
          overridden: true,
        };
      })
    );
    ToastManager.success("Household eligibility overridden");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ALLOCATE PLAN  (the main action)
  // ─────────────────────────────────────────────────────────────────────────

  const handleAllocatePlan = async () => {
    if (allocatedDisasterIds.has(selectedDisaster)) {
      ToastManager.info("This disaster has already been allocated.");
      return;
    }

    const userData  = JSON.parse(localStorage.getItem("user") || "{}");
    const userId    = userData?.user?._id || userData?.user?.id || userData?._id || userData?.id;
    const userRole  = userData?.user?.role || userData?.role;

    const allowed = ["Finance Officer", "Coordinator", "Administrator"];
    if (!allowed.includes(userRole)) {
      ToastManager.error(`Role "${userRole}" cannot allocate.`);
      return;
    }

    const eligiblePlans = allocationPlans.filter((p) => !p.isDisqualified && p.packages.length > 0);
    
    // NEW: Handle case where there are NO eligible households
    if (eligiblePlans.length === 0) {
      try {
        // Call existing allocation endpoint with a marker flag so the disaster is recorded as assessed
        await API.post("/allocation/allocate", {
          disasterId: selectedDisaster,
          noEligibleMarker: true,
        });

        // Refresh allocations to show the marker record
        await fetchAllAllocations();

        ToastManager.success(
          "Disaster assessment approved. No eligible households for aid identified."
        );
        return;
      } catch (err) {
        console.error("Failed to approve ineligible disaster:", err.response?.data?.message || err.message);
        ToastManager.error(
          err.response?.data?.message || "Failed to approve disaster assessment"
        );
        return;
      }
    }

    // ORIGINAL: Handle case where there ARE eligible households
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
          isOverridden:          overriddenHouseholds[plan.id] || false,
          status:                "Approved",
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to allocate ${plan.head}:`, err.response?.data?.message || err.message);
      }
    }

    if (successCount > 0) {
      // Refresh the global allocation state from the backend so the
      // summary dashboard reflects the true persisted data.
      await fetchAllAllocations();

      if (successCount === eligiblePlans.length) {
        ToastManager.success(`All ${successCount} households allocated!`);
      } else {
        ToastManager.warning(`${successCount}/${eligiblePlans.length} households allocated.`);
      }
    } else {
      ToastManager.error("Allocation failed. Check console for details.");
    }
  };

  const handleDisburseAllocation = async (allocationId) => {
  try {
    // Step 1: Auto-approve (handles Proposed → Approved silently)
    try {
      await API.put(`/allocation/requests/${allocationId}/approve`, {
        justification: "Approved for disbursement",
      });
    } catch {
      // Already approved — continue
    }

    // Step 2: Disburse
    await API.put(`/allocation/requests/${allocationId}/disburse`, {
      disbursementData: {
        disbursedDate: new Date(),
        disbursementMethod: "Bank Transfer",
      },
      useReserve: false,
    });

    await fetchAllAllocations();
    ToastManager.success("Allocation disbursed successfully");

  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message;

    if (status === 402 && err.response?.data?.prompt) {
      const confirm = window.confirm(
        `Insufficient funds in primary envelope.\n\nWould you like to use the Strategic Reserve instead?`
      );
      if (confirm) {
        try {
          await API.put(`/allocation/requests/${allocationId}/disburse`, {
            disbursementData: {
              disbursedDate: new Date(),
              disbursementMethod: "Bank Transfer",
            },
            useReserve: true,
          });
          await fetchAllAllocations();
          ToastManager.success("Disbursed from Strategic Reserve");
        } catch (reserveErr) {
          ToastManager.error(reserveErr.response?.data?.message || "Reserve disbursement failed");
        }
      }
    } else {
      ToastManager.error(message || "Failed to disburse allocation");
    }
  }
};

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const getIncomeCategory = (income) => {
    const n = parseFloat(income) || 0;
    if (n <= 3000)  return "Low";
    if (n <= 10000) return "Middle";
    return "High";
  };

  // Disasters available for new allocation (not yet allocated)
  const unallocatedDisasters = disasters.filter((d) => !allocatedDisasterIds.has(d._id));
  const isCurrentAllocated   = allocatedDisasterIds.has(selectedDisaster);

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY DASHBOARD COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const totalBudget       = globalAllocations.reduce((s, a) => s + a.totalCost, 0);
  const totalPackages     = globalAllocations.reduce((s, a) => s + a.packages.length, 0);
  const numDisasters      = allocatedDisasterIds.size;

  // Per-district totals for bar chart
  const byDistrict = {};
  globalAllocations.forEach((a) => {
    const district = a.district || "Unknown";
    byDistrict[district] = (byDistrict[district] || 0) + a.totalCost;
  });
  const districtEntries = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]);

  // Per-package-type counts for pie chart
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

  // Per-disaster summary rows for the table
  const disasterRows = disasters
    .filter((d) => allocatedDisasterIds.has(d._id))
    .map((d) => {
      const allocs = globalAllocations.filter((a) => a.disasterId === d._id);
      return {
        label:      `${getDisasterId(d, disasters)} – ${d.type} (${d.district})`,
        households: allocs.length,
        packages:   allocs.reduce((s, a) => s + a.packages.length, 0),
        totalCost:  allocs.reduce((s, a) => s + a.totalCost, 0),
        date:       allocs.length > 0 ? allocs[allocs.length - 1].createdAt : null,
      };
    });

  // Filter allocations by disbursement status
  const disbursedAllocations = globalAllocations.filter(a => a.status === "Disbursed");
  const pendingAllocations = globalAllocations
    .filter(a => a.status === "Proposed" || a.status === "Approved")
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

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

        {/* ── TAB: Assess Household ─────────────────────────────────────── */}
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

        {/* ── TAB: Allocation Plan ──────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div className="tab-content">
            <div className="allocation-plan-section">
              <div className="plan-header">
                <div>
                  <h3>Aid Allocation Plan — {currentDisaster?.disasterCode || selectedDisaster?.substring(0, 8) || "Selected Disaster"}</h3>
                  <p className="plan-subtitle">{households.length} households assessed</p>
                </div>
                {allocationPlans.length === 0 ? (
                  <button
                    className="btn-generate-plan"
                    onClick={generateAllocationPlan}
                    disabled={generatingPlan || households.length === 0}
                  >
                    {generatingPlan ? "Generating…" : "Generate Allocation Plan"}
                  </button>
                ) : null}
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
                          <tr key={plan.id} style={{ backgroundColor: plan.isDisqualified ? "#fef2f2" : "transparent", opacity: plan.isDisqualified ? 0.7 : 1 }}>
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

                  {allocationPlans && allocationPlans.length > 0 && (
                    <div className="allocate-plan-footer">
                      {isCurrentAllocated ? (
                        <div className="already-allocated-badge">
                          ✓ Allocation Plan Complete
                        </div>
                      ) : (
                        <button className="btn-allocate-plan" onClick={handleAllocatePlan}>
                          Allocate Plan & Mark Assessed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="placeholder-section">
                  <p>Click "Generate Allocation Plan" to create a plan for the assessed households.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Summary Dashboard ────────────────────────────────────── */}
        {activeTab === "summary" && (
          <div className="tab-content">
            {globalAllocations.length === 0 ? (
              <div className="placeholder-section">
                <h3>Summary Dashboard</h3>
                <p>No allocations have been made yet. Allocate a disaster plan to see data here.</p>
              </div>
            ) : (
              <div className="summary-dashboard">

                {/* Top KPI Cards */}
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

                {/* Charts Row */}
                <div className="charts-row">
                  {/* Bar chart: allocation per district */}
                  <div className="chart-card">
                    <h4>Budget by District</h4>
                    <div className="chart-container">
                      {districtEntries.length === 0 ? (
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>No data</p>
                      ) : (() => {
                        const entries = districtEntries;
                        const count   = entries.length;
                        const maxVal  = Math.max(...entries.map((e) => e[1])) || 1;
                        const minChartW = 520;
                        const chartW  = Math.max(minChartW, 80 + count * 60);
                        const chartH  = 220;
                        const padL    = 60;
                        const padB    = 40;
                        const plotW   = chartW - padL - 10;
                        const plotH   = chartH - padB - 10;
                        const bw      = Math.floor(plotW / count) - 12;
                        const gap     = Math.floor((plotW - bw * count) / (count + 1));
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
                            {entries.map(([label, val], idx) => {
                              const bx   = padL + gap + idx * (bw + gap);
                              const bh   = Math.max(2, (val / maxVal) * plotH);
                              const by   = 10 + plotH - bh;
                              const lx   = bx + bw / 2;
                              return (
                                <g key={idx}>
                                  <rect x={bx} y={by} width={bw} height={bh} fill="#1f3b5c" rx="3" className="bar" />
                                  <text x={lx} y={10 + plotH + 14} textAnchor="middle" className="axis-label" fontSize="10">
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

                  {/* Pie chart: package distribution */}
                  <div className="chart-card">
                    <h4>Packages Distributed</h4>
                    <div className="chart-container">
                      {packageEntries.length === 0 ? (
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>No data</p>
                      ) : (() => {
                        const colors = ["#1f3b5c", "#2f8f83", "#6c9bcf", "#8bc4a0", "#e8a87c", "#c084a0", "#a3c4f3"];
                        // Fixed layout: pie on the left, legend on the right
                        const cx = 120, cy = 130, r = 90;
                        let angle = -90;
                        const slices = packageEntries.map((entry, idx) => {
                          const sweep = (entry.count / totalPkgCount) * 360;
                          const start = angle;
                          const end   = angle + sweep;
                          angle       = end;
                          const mid   = (start + end) / 2;
                          const toRad = (d) => (d * Math.PI) / 180;
                          return {
                            ...entry,
                            sx: cx + r * Math.cos(toRad(start)),
                            sy: cy + r * Math.sin(toRad(start)),
                            ex: cx + r * Math.cos(toRad(end)),
                            ey: cy + r * Math.sin(toRad(end)),
                            sweep,
                            color: colors[idx % colors.length],
                          };
                        });
                        const legendX = 240;
                        const legendStartY = 30;
                        const rowH = 22;
                        const svgH = Math.max(270, legendStartY + packageEntries.length * rowH + 20);
                        return (
                          <svg width="100%" viewBox={`0 0 460 ${svgH}`} className="pie-chart-svg">
                            {slices.map((sl, i) => {
                              const large = sl.sweep > 180 ? 1 : 0;
                              return (
                                <path
                                  key={i}
                                  d={`M${cx},${cy} L${sl.sx},${sl.sy} A${r},${r} 0 ${large} 1 ${sl.ex},${sl.ey} Z`}
                                  fill={sl.color} stroke="white" strokeWidth="2" className="pie-slice"
                                />
                              );
                            })}
                            {slices.map((sl, i) => (
                              <g key={`leg-${i}`}>
                                <rect x={legendX} y={legendStartY + i * rowH} width="12" height="12" rx="2" fill={sl.color} />
                                <text
                                  x={legendX + 18}
                                  y={legendStartY + i * rowH + 10}
                                  className="pie-label"
                                  fontSize="11"
                                  fill="var(--color-text-primary)"
                                >
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

                {/* Disaster allocation log */}
                <div className="status-panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title">Disaster Allocation Log</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="status-badge plan-allocated">
                        {numDisasters} disaster{numDisasters !== 1 ? "s" : ""} allocated
                      </span>
                      <button
                        className="btn-toggle-details"
                        onClick={() => setShowDisasterLogDetails(!showDisasterLogDetails)}
                        title={showDisasterLogDetails ? "Hide details" : "Show details"}
                      >
                        {showDisasterLogDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {showDisasterLogDetails && (
                    <div className="panel-list">
                      <table className="allocation-table">
                        <thead>
                          <tr>
                            <th>Disaster</th>
                            <th>Households</th>
                            <th>Packages</th>
                            <th>Allocation Amount</th>
                            <th>Date Allocated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disasterRows.map((row, i) => (
                            <tr key={i} className="row-allocated">
                              <td className="cell-name">{row.label}</td>
                              <td>{row.households}</td>
                              <td>{row.packages}</td>
                              <td className="cell-cost">M{row.totalCost.toLocaleString()}</td>
                              <td className="cell-date">
                                {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Disbursed Allocations */}
                <div className="status-panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title">Disbursed Allocations</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="status-badge plan-allocated">
                        {disbursedAllocations.length} disbursed
                      </span>
                      <button
                        className="btn-toggle-details"
                        onClick={() => setShowDisbursedDetails(!showDisbursedDetails)}
                        title={showDisbursedDetails ? "Hide details" : "Show details"}
                      >
                        {showDisbursedDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {showDisbursedDetails && (
                    <div className="panel-list">
                      <table className="allocation-table">
                        <thead>
                          <tr>
                            <th>Household</th>
                            <th>District</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disbursedAllocations.map((alloc, i) => (
                            <tr key={i} className={`row-status status-${alloc.status?.toLowerCase().replace(/ /g, '-')}`}>
                              <td className="cell-name">{alloc.householdName}</td>
                              <td>{alloc.district}</td>
                              <td className="cell-cost">M{alloc.totalCost.toLocaleString()}</td>
                              <td>
                                <span className={`status-badge status-badge-${alloc.status?.toLowerCase().replace(/ /g, '-')}`}>
                                  {alloc.status}
                                </span>
                              </td>
                              <td className="cell-date">
                                {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                              </td>
                              <td className="cell-actions">
                                <span className="status-complete">✓ Complete</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {disbursedAllocations.length === 0 && (
                        <p style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                          No disbursed allocations yet
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Yet to be Disbursed */}
                <div className="status-panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title">Yet to be Disbursed</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="status-badge plan-allocated">
                        {pendingAllocations.length} pending
                      </span>
                      <button
                        className="btn-toggle-details"
                        onClick={() => setShowPendingDetails(!showPendingDetails)}
                        title={showPendingDetails ? "Hide details" : "Show details"}
                      >
                        {showPendingDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {showPendingDetails && (
                    <div className="panel-list">
                      <table className="allocation-table">
                        <thead>
                          <tr>
                            <th>Household</th>
                            <th>District</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingAllocations.map((alloc, i) => (
                            <tr key={i} className={`row-status status-${alloc.status?.toLowerCase().replace(/ /g, '-')}`}>
                              <td className="cell-name">{alloc.householdName}</td>
                              <td>{alloc.district}</td>
                              <td className="cell-cost">M{alloc.totalCost.toLocaleString()}</td>
                              <td>
                                <span className={`status-badge status-badge-${alloc.status?.toLowerCase().replace(/ /g, '-')}`}>
                                  {alloc.status === "Approved" ? "Ready to Disburse" : alloc.status || "Proposed"}
                                </span>
                              </td>
                              <td className="cell-date">
                                {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : "—"}
                              </td>
                              <td className="cell-actions">
                                <button 
                                  className="btn-action btn-disburse"
                                  title="Disburse this allocation"
                                  onClick={() => handleDisburseAllocation(alloc._id)}
                                >
                                  Disburse
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {pendingAllocations.length === 0 && (
                        <p style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                          No pending allocations
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}