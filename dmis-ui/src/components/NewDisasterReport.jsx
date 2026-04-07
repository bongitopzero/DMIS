import React, { useState, useEffect } from "react";
import { FileText, Users, BarChart3, ChevronDown, ChevronUp, Plus, X, Eye, Save, Edit, Trash2 } from "lucide-react";
import API from "../api/axios";
import { ToastManager, ToastContainer } from "./Toast";
import "./NewDisasterReport.css";

function DeleteConfirmationModal({ show, disasterInfo, onConfirm, onCancel, isLoading }) {
  if (!show || !disasterInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onCancel}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626', margin: '0 0 0.5rem 0' }}>Delete Disaster Record</h2>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>Are you sure you want to delete this disaster record? This will delete the disaster record and all associated household assessments.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#991b1b')}
            onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#dc2626')}
          >
            {isLoading ? 'Deleting...' : 'Delete Disaster'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewDisasterReport() {
  const [activeTab, setActiveTab] = useState("header");
  const [households, setHouseholds] = useState([]);
  const [expandedHousehold, setExpandedHousehold] = useState(null);
  const [editingHouseholdIndex, setEditingHouseholdIndex] = useState(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [savedDisasters, setSavedDisasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDisaster, setExpandedDisaster] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetInfo, setDeleteTargetInfo] = useState(null);

  const [headerData, setHeaderData] = useState({
    disasterType: "",
    district: "",
    dateOfOccurrence: "",
    severityLevel: "",
    numberOfHouseholdsAffected: "",
  });

  const [householdForm, setHouseholdForm] = useState({
    householdId: "HH-001",
    headName: "",
    village: "",
    gender: "Male",
    age: "",
    householdSize: "",
    sourceOfIncome: "Low (≤ M3,000/mo)",
    damageDescription: "",
    damageSeverityLevel: 2,
  });

  const disasterTypes = [
    "Heavy Rainfall",
    "Strong Winds",
    "Drought",
  ];

  const districts = [
    "Maseru",
    "Leribe",
    "Berea",
    "Mafeteng",
    "Mohale's Hoek",
    "Quthing",
    "Qacha's Nek",
    "Butha-Buthe",
    "Thaba-Tseka",
    "Mokhotlong",
  ];

  const severityLevels = ["Low", "Moderate", "Critical"];

  const incomeCategories = [
    "Low (≤ M3,000/mo)",
    "Middle (M3,001–M10,000/mo)",
    "High (≥ M10,001/mo)",
  ];

  // Map income categories to representative numeric values for calculations
  const getIncomeFromCategory = (category) => {
    if (category.includes("Low")) return 2500; // Mid-range for Low
    if (category.includes("Middle")) return 6500; // Mid-range for Middle
    if (category.includes("High")) return 15000; // Mid-range for High
    return 3000; // Default to Low
  };

  // Map income category to display format
  const getIncomeCategoryDisplay = (category) => {
    if (!category) return "Low (≤ M3,000/mo)";
    if (category.includes("Low")) return "Low (≤ M3,000/mo)";
    if (category.includes("Middle")) return "Middle (M3,001–M10,000/mo)";
    if (category.includes("High")) return "High (≥ M10,001/mo)";
    return category; // Return as-is if already formatted
  };

  // Fetch saved disasters on component mount
  useEffect(() => {
    fetchSavedDisasters();
    
    // Subscribe to ToastManager
    const unsubscribe = ToastManager.subscribe((newToasts) => {
      setToasts(newToasts);
    });

    return unsubscribe;
  }, []);

  const fetchSavedDisasters = async () => {
    try {
      const res = await API.get("/disasters");
      let disasters = res.data || [];

      // Fetch household assessments for each disaster
      const disastersWithHouseholds = await Promise.all(
        disasters.map(async (disaster) => {
          try {
            // Fetch assessments for this disaster using path parameter
            const assessmentsRes = await API.get(`/allocation/assessments/${disaster._id}`);
            return {
              ...disaster,
              households: assessmentsRes.data.assessments || []
            };
          } catch (err) {
            console.warn(`Could not fetch assessments for disaster ${disaster._id}`);
            return {
              ...disaster,
              households: []
            };
          }
        })
      );

      setSavedDisasters(disastersWithHouseholds);
    } catch (err) {
      console.error("Error fetching disasters:", err);
      setSavedDisasters([]);
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleHouseholdChange = (e) => {
    const { name, value } = e.target;
    setHouseholdForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinueToHouseholds = () => {
    if (
      !headerData.disasterType ||
      !headerData.district ||
      !headerData.dateOfOccurrence ||
      !headerData.severityLevel ||
      !headerData.numberOfHouseholdsAffected
    ) {
      ToastManager.error("Please complete all header fields first");
      return;
    }
    setActiveTab("households");
  };

  const handleEditHousehold = (index) => {
    setEditingHouseholdIndex(index);
    const household = households[index];
    setHouseholdForm(household);
  };

  const handleUpdateHousehold = () => {
    if (!householdForm.headName || !householdForm.village || !householdForm.gender || !householdForm.age || !householdForm.householdSize || !householdForm.sourceOfIncome) {
      ToastManager.error("Please complete all required fields in the household form");
      return;
    }
    
    const updatedHouseholds = [...households];
    updatedHouseholds[editingHouseholdIndex] = householdForm;
    setHouseholds(updatedHouseholds);
    setEditingHouseholdIndex(null);
    setExpandedHousehold(null);
    
    // Reset form
    setHouseholdForm({
      householdId: `HH-${String(households.length + 1).padStart(3, "0")}`,
      headName: "",
      village: "",
      gender: "Male",
      age: "",
      householdSize: "",
      sourceOfIncome: "Low (≤ M3,000/mo)",
      damageDescription: "",
      damageSeverityLevel: 2,
    });
  };

  const handleCancelEditHousehold = () => {
    setEditingHouseholdIndex(null);
    setHouseholdForm({
      householdId: `HH-${String(households.length + 1).padStart(3, "0")}`,
      headName: "",
      village: "",
      gender: "Male",
      age: "",
      householdSize: "",
      sourceOfIncome: "Low (≤ M3,000/mo)",
      damageDescription: "",
      damageSeverityLevel: 2,
    });
  };

  const handleAddHousehold = () => {
    const newHousehold = {
      id: `HH-${String(households.length + 1).padStart(3, "0")}`,
      ...householdForm,
    };
    setHouseholds([...households, newHousehold]);
    setExpandedHousehold(households.length);
    
    // Reset form
    setHouseholdForm({
      householdId: `HH-${String(households.length + 2).padStart(3, "0")}`,
      headName: "",
      village: "",
      gender: "Male",
      age: "",
      householdSize: "",
      sourceOfIncome: "Low (≤ M3,000/mo)",
      damageDescription: "",
      damageSeverityLevel: 2,
    });
    ToastManager.success("Household added successfully");
  };

  const handleDeleteHousehold = (index) => {
    setHouseholds(households.filter((_, i) => i !== index));
    setExpandedHousehold(null);
  };

  const handleSaveAndNext = () => {
    if (!householdForm.headName || !householdForm.village || !householdForm.gender || !householdForm.age || !householdForm.householdSize || !householdForm.sourceOfIncome) {
      ToastManager.error("Please complete all required fields in the household form");
      return;
    }
    handleAddHousehold();
  };

  const handleSaveDisaster = async () => {
    if (households.length === 0) {
      ToastManager.error(
        `Please add at least 1 household before saving`
      );
      return;
    }
    if (households.length !== parseInt(headerData.numberOfHouseholdsAffected)) {
      ToastManager.error(
        `Please add all ${headerData.numberOfHouseholdsAffected} households before saving (${households.length}/${headerData.numberOfHouseholdsAffected})`
      );
      return;
    }
    // Duplicate check: query recent incidents to avoid double-reporting
    try {
      const incRes = await API.get("/incidents");
      const incidentsList = incRes.data || [];
      const normalize = (v) => (v || "").toString().toLowerCase().replace(/['\s-]/g, "").trim();
      const candidateType = headerData.disasterType.toLowerCase().replace(/\s+/g, "_");
      const candidateDistrict = normalize(headerData.district);
      const candidateDate = headerData.dateOfOccurrence ? new Date(headerData.dateOfOccurrence) : null;

      const similar = incidentsList.filter((it) => {
        try {
          const itType = (it.type || "").toString().toLowerCase().replace(/[\s-]+/g, "_");
          const itDistrict = normalize(it.district);
          const itDate = it.date ? new Date(it.date) : new Date(it.createdAt);
          const withinWindow = candidateDate && Math.abs(itDate - candidateDate) <= 1000 * 60 * 60 * 24 * 7; // 7 days
          return itDistrict === candidateDistrict && (itType === candidateType) && (withinWindow || !candidateDate);
        } catch (e) {
          return false;
        }
      });

      if (similar.length > 0) {
        const preview = similar.slice(0, 3).map(s => `${s.type} — ${s.district} — ${new Date(s.date || s.createdAt).toLocaleDateString()}`).join('\n');
        const proceed = window.confirm(`Similar incident(s) were reported recently:\n\n${preview}\n\nCreate this disaster anyway? Press Cancel to review.`);
        if (!proceed) return;
      }
    } catch (err) {
      console.debug('Duplicate check failed, continuing:', err?.message || err);
    }

    setLoading(true);
    try {
      // Step 1: Create the disaster (without households array - the backend doesn't support it)
      const disasterPayload = {
        type: headerData.disasterType.toLowerCase().replace(/\s+/g, "_"),
        district: headerData.district,
        affectedPopulation: `${households.length} households`,
        damages: "See household records",
        needs: "See household assessments",
        numberOfHouseholdsAffected: parseInt(headerData.numberOfHouseholdsAffected) || households.length,
        occurrenceDate: headerData.dateOfOccurrence,
      };

      console.log("💾 Creating disaster with payload:", disasterPayload);
      const disasterRes = await API.post("/disasters", disasterPayload);
      const disasterId = disasterRes.data._id;

      console.log("✅ Disaster created with ID:", disasterId);

      // Step 2: Save each household assessment
      let successCount = 0;
      for (let i = 0; i < households.length; i++) {
        const household = households[i];
        
        // Map disaster type from form to model format
        const disasterTypeMap = {
          "drought": "Drought",
          "heavy_rainfall": "Heavy Rainfall",
          "strong_winds": "Strong Winds"
        };
        const mappedDisasterType = disasterTypeMap[headerData.disasterType.toLowerCase().replace(/\s+/g, "_")] || "Drought";
        
        const householdPayload = {
          disasterId,
          householdId: (household.householdId || `HH-${String(i + 1).padStart(3, "0")}`).trim(),
          headOfHousehold: {
            name: (household.headName || "").trim(),
            age: parseInt(household.age) || 0,
            gender: household.gender || "Male",
          },
          householdSize: parseInt(household.householdSize) || 1,
          monthlyIncome: getIncomeFromCategory(household.sourceOfIncome || "Low"),
          incomeCategory:
            household.sourceOfIncome?.includes("Low")
              ? "Low"
              : household.sourceOfIncome?.includes("Middle")
                ? "Middle"
                : "High",
          disasterType: mappedDisasterType,
          damageDescription: (household.damageDescription || "").trim() || null,
          damageSeverityLevel: parseInt(household.damageSeverityLevel) || null,
          assessedBy: "Data Clerk",
          location: {
            village: (household.village || "").trim(),
            district: (headerData.district || "").trim(),
          },
        };

        // Validate required fields before sending
        if (!householdPayload.headOfHousehold.name) {
          ToastManager.error(`Household ${i + 1}: Head of household name is required`);
          setLoading(false);
          return;
        }
        if (!householdPayload.location.village) {
          ToastManager.error(`Household ${i + 1}: Village/location is required`);
          setLoading(false);
          return;
        }
        if (householdPayload.headOfHousehold.age < 1) {
          ToastManager.error(`Household ${i + 1}: Age must be at least 1`);
          setLoading(false);
          return;
        }
        if (householdPayload.householdSize < 1) {
          ToastManager.error(`Household ${i + 1}: Household size must be at least 1`);
          setLoading(false);
          return;
        }

        try {
          await API.post("/allocation/assessments", householdPayload);
          successCount++;
          console.log(`✅ Household ${i + 1} saved successfully`);
        } catch (err) {
          console.error(`Error saving household ${i + 1}:`, err);
          console.error(`Error details:`, {
            status: err.response?.status,
            message: err.response?.data?.message,
            error: err.response?.data?.error,
            details: err.response?.data?.details,
            validationErrors: err.response?.data?.validationErrors,
          });
          console.log("Failed payload:", householdPayload);
          
          // Show specific validation error or generic message
          const validationDetails = err.response?.data?.details || err.response?.data?.error;
          const errorMsg = validationDetails 
            ? `Household ${i + 1} validation error: ${validationDetails}`
            : `Failed to save household ${i + 1}: ${err.response?.data?.message || err.message}`;
          
          ToastManager.error(errorMsg);
        }
      }

      if (successCount === households.length) {
        ToastManager.success(
          `✅ Disaster and ${households.length} household(s) saved successfully!`
        );
      } else if (successCount > 0) {
        ToastManager.warning(
          `⚠️ ${successCount} out of ${households.length} households saved`
        );
      } else {
        ToastManager.warning(
          `Disaster saved but household assessments need to be verified`
        );
      }

      // Reset form
      setHeaderData({
        disasterType: "",
        district: "",
        dateOfOccurrence: "",
        severityLevel: "",
        numberOfHouseholdsAffected: "",
      });
      setHouseholds([]);
      setHouseholdForm({
        householdId: "HH-001",
        headName: "",
        village: "",
        gender: "Male",
        age: "",
        householdSize: "",
        sourceOfIncome: "Low (≤ M3,000/mo)",
        damageDescription: "",
        damageSeverityLevel: 2,
      });
      setActiveTab("summary");

      // Refresh disasters to show in summary
      await fetchSavedDisasters();
    } catch (err) {
      console.error("❌ Error saving disaster:", err);
      console.log("Full error:", err.response?.data);
      ToastManager.error(
        err.response?.data?.message || "Failed to save disaster. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDisaster = async (disasterId) => {
    setLoading(true);
    try {
      console.log("📤 Submitting disaster:", disasterId);
      
      // Update disaster status to "submitted" for coordinator approval
      const response = await API.put(`/disasters/${disasterId}`, {
        status: "submitted"
      });
      
      console.log("✅ Response:", response.data);
      
      // Immediately update local state to reflect the change without page refresh
      setSavedDisasters(prevDisasters => 
        prevDisasters.map(d => 
          d._id === disasterId ? { ...d, status: "submitted" } : d
        )
      );
      
      ToastManager.success("✅ Disaster report submitted successfully! Coordinator will review and approve.");
    } catch (err) {
      console.error("❌ Error submitting disaster:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to submit disaster report";
      ToastManager.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDisaster = (disasterId, disaster) => {
    setDeleteTargetId(disasterId);
    setDeleteTargetInfo(disaster);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      // Delete all household assessments for this disaster
      try {
        const assessmentsRes = await API.get(`/allocation/assessments/${deleteTargetId}`);
        const assessments = assessmentsRes.data.assessments || [];
        for (const assessment of assessments) {
          await API.delete(`/allocation/assessments/${assessment._id}`);
        }
      } catch (err) {
        console.warn("Could not delete assessments:", err.message);
      }

      // Delete the disaster
      await API.delete(`/disasters/${deleteTargetId}`);
      ToastManager.success("Disaster record deleted successfully");
      
      // Refresh the list
      await fetchSavedDisasters();
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetInfo(null);
    } catch (err) {
      console.error("❌ Error deleting disaster:", err);
      ToastManager.error("Failed to delete disaster record");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDisaster = (disaster) => {
    // Map disaster type back to form format
    const typeMap = {
      "drought": "Drought",
      "heavy_rainfall": "Heavy Rainfall",
      "strong_winds": "Strong Winds"
    };
    
    // Load disaster data into header form
    setHeaderData({
      disasterType: typeMap[disaster.type] || disaster.type,
      district: disaster.district,
      dateOfOccurrence: disaster.occurrenceDate ? new Date(disaster.occurrenceDate).toISOString().split('T')[0] : "",
      severityLevel: (disaster.severity || "low").charAt(0).toUpperCase() + (disaster.severity || "low").slice(1),
      numberOfHouseholdsAffected: disaster.numberOfHouseholdsAffected,
    });

    // Load households from disaster assessments
    if (Array.isArray(disaster.households) && disaster.households.length > 0) {
      const incomeMap = {
        "Low": "Low (≤ M3,000/mo)",
        "Middle": "Middle (M3,001–M10,000/mo)",
        "High": "High (≥ M10,001/mo)"
      };
      
      const loadedHouseholds = disaster.households.map((hh, idx) => ({
        householdId: hh.householdId || `HH-${String(idx + 1).padStart(3, "0")}`,
        headName: hh.headOfHousehold?.name || hh.headName || "",
        village: hh.location?.village || hh.village || "",
        gender: hh.headOfHousehold?.gender || "Male",
        age: hh.headOfHousehold?.age || "",
        householdSize: hh.householdSize || "",
        sourceOfIncome: incomeMap[hh.incomeCategory] || "Low (≤ M3,000/mo)",
        damageDescription: hh.damageDescription || "",
        damageSeverityLevel: hh.damageSeverityLevel || 2,
      }));
      setHouseholds(loadedHouseholds);
      
      // Reset household form for adding more
      setHouseholdForm({
        householdId: `HH-${String(loadedHouseholds.length + 1).padStart(3, "0")}`,
        headName: "",
        village: "",
        gender: "Male",
        age: "",
        householdSize: "",
        sourceOfIncome: "Low (≤ M3,000/mo)",
        damageDescription: "",
        damageSeverityLevel: 2,
      });
    }

    // Reset autoSaved to allow re-saving
    setAutoSaved(false);
    setExpandedDisaster(null);
    
    // Switch to header tab for editing
    setActiveTab("header");
    ToastManager.info("Edit mode - make your changes and save again");
  };

  const maxHouseholds = parseInt(headerData.numberOfHouseholdsAffected) || 16;
  const householdsProgress = (households.length / maxHouseholds) * 100;

  // Reset autosave flag when header changed (new disaster)
  useEffect(() => {
    setAutoSaved(false);
  }, [headerData.numberOfHouseholdsAffected, headerData.disasterType, headerData.district, headerData.dateOfOccurrence]);

  return (
    <div className="new-disaster-report p-6" style={{ margin: "0" }}>
      <ToastContainer toasts={toasts} onRemove={(id) => ToastManager.remove(id)} />
      <DeleteConfirmationModal 
        show={showDeleteConfirm} 
        disasterInfo={deleteTargetInfo} 
        onConfirm={confirmDelete} 
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={loading}
      />
      
      <p className="text-sm text-gray-500 mb-4">Record disaster header and individual household assessments</p>

      {/* Tabs */}
      <div className="report-tabs">
        <button
          className={`tab ${activeTab === "header" ? "active" : ""}`}
          onClick={() => setActiveTab("header")}
        >
          <FileText size={18} />
          <span>Disaster Header</span>
        </button>
        <button
          className={`tab ${activeTab === "households" ? "active" : ""}`}
          onClick={() => setActiveTab("households")}
        >
          <Users size={18} />
          <span>Households</span>
        </button>
        <button
          className={`tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("summary");
            fetchSavedDisasters();
          }}
        >
          <BarChart3 size={18} />
          <span>Summary</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "header" && (
          <div className="form-section">
            <h3>Disaster Information</h3>

            <div className="form-grid">
              <div className="form-group">
                <label className="required">Disaster Type</label>
                <select
                  name="disasterType"
                  value={headerData.disasterType}
                  onChange={handleHeaderChange}
                >
                  <option value="">Select type</option>
                  {disasterTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">District</label>
                <select
                  name="district"
                  value={headerData.district}
                  onChange={handleHeaderChange}
                >
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">Date of Occurrence</label>
                <input
                  type="date"
                  name="dateOfOccurrence"
                  value={headerData.dateOfOccurrence}
                  onChange={handleHeaderChange}
                />
              </div>

              <div className="form-group">
                <label className="required">Severity Level</label>
                <select
                  name="severityLevel"
                  value={headerData.severityLevel}
                  onChange={handleHeaderChange}
                >
                  <option value="">Select severity</option>
                  {severityLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">Number of Households Affected</label>
                <input
                  type="number"
                  name="numberOfHouseholdsAffected"
                  value={headerData.numberOfHouseholdsAffected}
                  onChange={handleHeaderChange}
                  placeholder="e.g. 3, 5, 10"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={handleContinueToHouseholds}>
                Continue to Households →
              </button>
            </div>
          </div>
        )}

        {activeTab === "households" && (
          <div className="households-section">
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-text">
                <span>{households.length} of {maxHouseholds} households recorded</span>
                <span className="progress-percent">{householdsProgress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${householdsProgress}%` }}
                />
              </div>
            </div>

            {/* Households List */}
            <div className="households-list">
              {households.length === 0 ? (
                <div className="empty-state" style={{ display: 'none' }}></div>
              ) : (
                households.map((household, index) => (
                  <div key={index} className="household-card">
                    <button
                      className="household-header-btn"
                      onClick={() =>
                        setExpandedHousehold(
                          expandedHousehold === index ? null : index
                        )
                      }
                    >
                      <span className="household-number">{index + 1}</span>
                      <span className="household-title">Household {index + 1}</span>
                      {expandedHousehold === index ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>

                    {expandedHousehold === index && (
                      <div className="household-content">
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Household ID</label>
                            <input
                              type="text"
                              value={household.householdId}
                              disabled
                              className="disabled-input"
                            />
                          </div>

                          <div className="form-group">
                            <label className="required">Head of Household Name</label>
                            <input
                              type="text"
                              value={editingHouseholdIndex === index ? householdForm.headName : household.headName}
                              onChange={(e) => {
                                if (editingHouseholdIndex === index) {
                                  setHouseholdForm({ ...householdForm, headName: e.target.value });
                                }
                              }}
                              placeholder="Full name"
                              style={editingHouseholdIndex === index ? { backgroundColor: '#fff', cursor: 'text' } : { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="required">Village / Location</label>
                            <input
                              type="text"
                              value={editingHouseholdIndex === index ? householdForm.village : household.village}
                              onChange={(e) => {
                                if (editingHouseholdIndex === index) {
                                  setHouseholdForm({ ...householdForm, village: e.target.value });
                                }
                              }}
                              placeholder="e.g. Ha Motala"
                              style={editingHouseholdIndex === index ? { backgroundColor: '#fff', cursor: 'text' } : { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="required">Gender</label>
                            {editingHouseholdIndex === index ? (
                              <select
                                value={householdForm.gender}
                                onChange={(e) => setHouseholdForm({ ...householdForm, gender: e.target.value })}
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <p className="value-display">{household.gender}</p>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="required">Age</label>
                            <input
                              type="text"
                              value={editingHouseholdIndex === index ? householdForm.age : household.age}
                              onChange={(e) => {
                                if (editingHouseholdIndex === index) {
                                  const numVal = e.target.value.replace(/[^0-9]/g, '');
                                  setHouseholdForm({ ...householdForm, age: numVal });
                                }
                              }}
                              placeholder="Enter age"
                              style={editingHouseholdIndex === index ? { backgroundColor: '#fff', cursor: 'text' } : { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="required">Household Size</label>
                            <input
                              type="text"
                              value={editingHouseholdIndex === index ? householdForm.householdSize : household.householdSize}
                              onChange={(e) => {
                                if (editingHouseholdIndex === index) {
                                  const numVal = e.target.value.replace(/[^0-9]/g, '');
                                  setHouseholdForm({ ...householdForm, householdSize: numVal });
                                }
                              }}
                              placeholder="Number of members"
                              style={editingHouseholdIndex === index ? { backgroundColor: '#fff', cursor: 'text' } : { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="required">Source of Income</label>
                            {editingHouseholdIndex === index ? (
                              <select
                                value={householdForm.sourceOfIncome}
                                onChange={(e) => setHouseholdForm({ ...householdForm, sourceOfIncome: e.target.value })}
                              >
                                {incomeCategories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="value-display">{household.sourceOfIncome}</p>
                            )}
                          </div>

                          <div className="form-group full-width">
                            <label>Damage Description</label>
                            <textarea
                              value={editingHouseholdIndex === index ? householdForm.damageDescription : household.damageDescription}
                              onChange={(e) => {
                                if (editingHouseholdIndex === index) {
                                  setHouseholdForm({ ...householdForm, damageDescription: e.target.value });
                                }
                              }}
                              placeholder="Brief description of damage"
                              rows="3"
                              style={editingHouseholdIndex === index ? { backgroundColor: '#fff', cursor: 'text' } : { backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#9ca3af' }}
                            />
                          </div>
                        </div>

                        {editingHouseholdIndex === index ? (
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                              className="btn-save-next"
                              onClick={handleUpdateHousehold}
                              style={{ flex: 1 }}
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={handleCancelEditHousehold}
                              style={{
                                flex: 1,
                                padding: '0.6rem 1rem',
                                backgroundColor: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '0.4rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditHousehold(index)}
                              title="Edit Household"
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: '1'
                              }}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteHousehold(index)}
                              title="Delete Household"
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: '1'
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Household Form */}
            {households.length < maxHouseholds && (
            <div className="new-household-form">
              <h4>Add New Household</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Household ID</label>
                  <input
                    type="text"
                    value={householdForm.householdId}
                    disabled
                    className="disabled-input"
                  />
                </div>

                <div className="form-group">
                  <label className="required">Head of Household Name</label>
                  <input
                    type="text"
                    name="headName"
                    value={householdForm.headName}
                    onChange={handleHouseholdChange}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Village / Location</label>
                  <input
                    type="text"
                    name="village"
                    value={householdForm.village}
                    onChange={handleHouseholdChange}
                    placeholder="e.g. Ha Motala"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Gender</label>
                  <select
                    name="gender"
                    value={householdForm.gender}
                    onChange={handleHouseholdChange}
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="required">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={householdForm.age}
                    onChange={handleHouseholdChange}
                    placeholder="Enter age"
                    min="0"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Household Size</label>
                  <input
                    type="number"
                    name="householdSize"
                    value={householdForm.householdSize}
                    onChange={handleHouseholdChange}
                    placeholder="Number of members"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required">Source of Income</label>
                  <select
                    name="sourceOfIncome"
                    value={householdForm.sourceOfIncome}
                    onChange={handleHouseholdChange}
                    required
                  >
                    {incomeCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Damage Description</label>
                  <textarea
                    name="damageDescription"
                    value={householdForm.damageDescription}
                    onChange={handleHouseholdChange}
                    placeholder="Brief description of damage"
                    rows="3"
                  />
                </div>
              </div>

              {households.length < maxHouseholds && (
                <button className="btn-save-next" onClick={handleSaveAndNext} disabled={loading}>
                  Save & Next Household
                </button>
              )}

              {households.length > 0 && households.length < parseInt(headerData.numberOfHouseholdsAffected) && (
                <div className="progress-info">
                  <p>Please add {parseInt(headerData.numberOfHouseholdsAffected) - households.length} more household(s) to proceed to saving ({households.length}/{headerData.numberOfHouseholdsAffected})</p>
                </div>
              )}
            </div>
            )}

            {households.length === parseInt(headerData.numberOfHouseholdsAffected) && households.length > 0 && (
              <div className="completion-section">
                <div className="completion-message">
                  <h4>✅ Ready to save</h4>
                  <p>All {households.length} households entered. Click below to save this disaster and its household assessments</p>
                </div>
                <button 
                  className="btn-save-disaster" 
                  onClick={handleSaveDisaster}
                  disabled={loading}
                >
                  <Save size={18} />
                  {loading ? "Saving..." : "Save Disaster & Households"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="summary-section">
            {savedDisasters.length === 0 ? (
              <div className="empty-summary">
                <p>No disasters recorded yet. Create a new disaster report to get started.</p>
              </div>
            ) : (
              <div className="disasters-summary-list">
                {savedDisasters.map((disaster) => {
                  return (
                    <div key={disaster._id} className="disaster-summary-card">
                      {/* Disaster Summary */}
                      <div className="disaster-summary-info">
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Disaster Summary</h4>
                        <div className="summary-info-grid">
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type:</span>
                            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginLeft: '0.5rem', textTransform: 'capitalize' }}>{disaster.type}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>District:</span>
                            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginLeft: '0.5rem' }}>{disaster.district}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date:</span>
                            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginLeft: '0.5rem' }}>{new Date(disaster.date || disaster.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Severity:</span>
                            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginLeft: '0.5rem', textTransform: 'capitalize' }}>{disaster.severity}</span>
                          </div>
                        </div>
                      </div>

                      {/* View Details and Submit Buttons Container */}
                      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: 'fit-content' }}>
                        {/* View Details Button */}
                        <button
                          className="btn-view"
                          onClick={() => setExpandedDisaster(expandedDisaster === disaster._id ? null : disaster._id)}
                          style={{ width: '14rem' }}
                        >
                          <Eye size={18} />
                          {expandedDisaster === disaster._id ? "Hide" : "View"} Details
                        </button>

                        {/* Submit for Approval Button */}
                        {disaster.status === "reported" && (
                          <button
                            className="btn-save-disaster"
                            onClick={() => handleSubmitDisaster(disaster._id)}
                            disabled={loading}
                            style={{ width: '14rem' }}
                          >
                            {loading ? "Submitting..." : "Submit Disaster Report"}
                          </button>
                        )}
                        {disaster.status !== "reported" && (
                          <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                            {disaster.status === "submitted" ? (
                              <div>
                                <p style={{ margin: '0 0 0.5rem 0' }}>
                                  ✅ <strong style={{ color: '#059669' }}>Submitted</strong> - Waiting for coordinator approval
                                </p>
                              </div>
                            ) : disaster.status === "verified" ? (
                              <div>
                                <p style={{ margin: '0 0 0.5rem 0' }}>
                                  ✓ <strong style={{ color: '#059669' }}>Verified & Approved</strong> - Ready for allocation
                                </p>
                              </div>
                            ) : (
                              <div>
                                Status: <strong style={{ textTransform: 'capitalize', color: '#1f2937' }}>{disaster.status}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expandable Details Section */}
                      {expandedDisaster === disaster._id && (
                        <div className="summary-details">
                          <h5 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>Disaster Header Details</h5>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <label>Disaster Type:</label>
                              <span style={{ textTransform: 'capitalize' }}>{disaster.type}</span>
                            </div>
                            <div className="detail-item">
                              <label>District:</label>
                              <span>{disaster.district}</span>
                            </div>
                            <div className="detail-item">
                              <label>Date of Occurrence:</label>
                              <span>{new Date(disaster.date || disaster.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="detail-item">
                              <label>Severity:</label>
                              <span className={`severity-badge ${disaster.severity}`}>
                                {disaster.severity}
                              </span>
                            </div>
                            <div className="detail-item">
                              <label>Households Affected:</label>
                              <span>{disaster.numberOfHouseholdsAffected || 0}</span>
                            </div>
                            <div className="detail-item">
                              <label>Status:</label>
                              <span className={`status-badge ${disaster.status}`}>
                                {disaster.status || "reported"}
                              </span>
                            </div>
                          </div>

                          <div className="households-breakdown">
                            <h5 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>📋 Household Assessment Breakdown</h5>
                            {Array.isArray(disaster.households) && disaster.households.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {disaster.households.map((hh, idx) => (
                                  <div key={idx} style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    backgroundColor: '#f9fafb'
                                  }}>
                                    <h6 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                                      Household {idx + 1}: {hh.householdId || `HH-${idx + 1}`}
                                    </h6>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(2, 1fr)',
                                      gap: '1rem',
                                      fontSize: '0.9rem'
                                    }}>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Household ID</label>
                                        <span style={{ color: '#1f2937' }}>{hh.householdId || `HH-${idx + 1}`}</span>
                                      </div>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Head of Household Name</label>
                                        <span style={{ color: '#1f2937' }}>{hh.headOfHousehold?.name || hh.headName || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Village / Location</label>
                                        <span style={{ color: '#1f2937' }}>{hh.location?.village || hh.village || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Gender</label>
                                        <span style={{ color: '#1f2937' }}>{hh.headOfHousehold?.gender || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Age</label>
                                        <span style={{ color: '#1f2937' }}>{hh.headOfHousehold?.age || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Household Size</label>
                                        <span style={{ color: '#1f2937' }}>{hh.householdSize || 'N/A'} people</span>
                                      </div>
                                      <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Income Category</label>
                                        <span style={{ color: '#1f2937' }}>{getIncomeCategoryDisplay(hh.incomeCategory) || 'N/A'}</span>
                                      </div>
                                      <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Damage Description</label>
                                        <span style={{ color: '#1f2937' }}>{hh.damageDescription || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0' }}>
                                  No household records available for this disaster.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Edit and Delete Buttons - Only for unreported disasters */}
                      {disaster.status === "reported" && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEditDisaster(disaster)}
                            disabled={loading}
                            title="Edit Disaster"
                            style={{
                              padding: '0.25rem',
                              backgroundColor: 'transparent',
                              color: '#000',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: '1',
                              opacity: loading ? 0.5 : 1
                            }}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteDisaster(disaster._id, disaster)}
                            disabled={loading}
                            title="Delete Disaster"
                            style={{
                              padding: '0.25rem',
                              backgroundColor: 'transparent',
                              color: '#000',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: '1',
                              opacity: loading ? 0.5 : 1
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
