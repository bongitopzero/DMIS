import React, { useState, useEffect } from "react";
import { FileText, Users, BarChart3, ChevronDown, ChevronUp, Plus, X, Eye, Save } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "./Toast";
import "./NewDisasterReport.css";

export default function NewDisasterReport() {
  const [activeTab, setActiveTab] = useState("header");
  const [households, setHouseholds] = useState([]);
  const [expandedHousehold, setExpandedHousehold] = useState(null);
  const [savedDisasters, setSavedDisasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDisaster, setExpandedDisaster] = useState(null);

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

  const severityLevels = ["Low", "Moderate", "High", "Critical"];

  const incomeCategories = [
    "Low (≤ M3,000/mo)",
    "Middle (M3,001–M10,000/mo)",
    "High (≥ M10,001/mo)",
  ];

  // Fetch saved disasters on component mount
  useEffect(() => {
    fetchSavedDisasters();
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
      ToastManager.error("Please fill in all required fields");
      return;
    }
    setActiveTab("households");
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
    });
    ToastManager.success("Household added successfully");
  };

  const handleDeleteHousehold = (index) => {
    setHouseholds(households.filter((_, i) => i !== index));
    setExpandedHousehold(null);
  };

  const handleSaveAndNext = () => {
    if (!householdForm.headName || !householdForm.age || !householdForm.householdSize) {
      ToastManager.error("Please fill in all required fields");
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

    setLoading(true);
    try {
      // Step 1: Create the disaster (without households array - the backend doesn't support it)
      const disasterPayload = {
        type: headerData.disasterType.toLowerCase().replace(/\s+/g, "_"),
        district: headerData.district,
        affectedPopulation: `${households.length} households`,
        damages: "See household records",
        needs: "See household assessments",
        severity: headerData.severityLevel.toLowerCase(),
        numberOfHouseholdsAffected: parseInt(headerData.numberOfHouseholdsAffected) || households.length,
        date: headerData.dateOfOccurrence,
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
          householdId: household.householdId || `HH-${String(i + 1).padStart(3, "0")}`,
          headOfHousehold: {
            name: household.headName,
            age: parseInt(household.age),
            gender: household.gender,
          },
          householdSize: parseInt(household.householdSize),
          childrenUnder5: 0,
          monthlyIncome: parseInt(
            household.sourceOfIncome?.match(/\d+/)?.[0] || 3000
          ),
          incomeCategory:
            household.sourceOfIncome.includes("Low")
              ? "Low"
              : household.sourceOfIncome.includes("Middle")
                ? "Middle"
                : "High",
          disasterType: mappedDisasterType,
          damageDescription: household.damageDescription,
          damageSeverityLevel: 2,
          assessedBy: "Data Clerk",
          damageDetails: {
            roofDamage: "Unknown",
            cropLossPercentage: 0,
            livestockLoss: 0,
            roomsAffected: 0,
            waterAccessImpacted: false,
          },
          recommendedAssistance: "To be determined",
          location: {
            village: household.village,
            district: headerData.district,
          },
        };

        try {
          await API.post("/allocation/assessments", householdPayload);
          successCount++;
          console.log(`✅ Household ${i + 1} saved successfully`);
        } catch (err) {
          console.error(`Error saving household ${i + 1}:`, err);
          console.log("Failed payload:", householdPayload);
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
      
      ToastManager.success("✅ Disaster report submitted successfully! Coordinator will review and approve.");
      
      // Refresh the saved disasters list
      await fetchSavedDisasters();
    } catch (err) {
      console.error("❌ Error submitting disaster:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to submit disaster report";
      ToastManager.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const maxHouseholds = parseInt(headerData.numberOfHouseholdsAffected) || 16;
  const householdsProgress = (households.length / maxHouseholds) * 100;

  return (
    <div className="new-disaster-report">
      {/* Header */}
      <div className="report-header">
        <h1>New Disaster Report</h1>
        <p>Record disaster header and individual household assessments</p>
      </div>

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
                <label>Disaster Type *</label>
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
                <label>District *</label>
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
                <label>Date of Occurrence *</label>
                <input
                  type="date"
                  name="dateOfOccurrence"
                  value={headerData.dateOfOccurrence}
                  onChange={handleHeaderChange}
                />
              </div>

              <div className="form-group">
                <label>Severity Level *</label>
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
                <label>Number of Households Affected *</label>
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
                            <label>Head of Household Name *</label>
                            <input
                              type="text"
                              value={household.headName}
                              disabled
                              placeholder="Full name"
                            />
                          </div>

                          <div className="form-group">
                            <label>Village / Location *</label>
                            <input
                              type="text"
                              value={household.village}
                              disabled
                              placeholder="e.g. Ha Motala"
                            />
                          </div>

                          <div className="form-group">
                            <label>Gender *</label>
                            <p className="value-display">{household.gender}</p>
                          </div>

                          <div className="form-group">
                            <label>Age *</label>
                            <p className="value-display">{household.age}</p>
                          </div>

                          <div className="form-group">
                            <label>Household Size *</label>
                            <p className="value-display">{household.householdSize}</p>
                          </div>

                          <div className="form-group">
                            <label>Source of Income *</label>
                            <p className="value-display">{household.sourceOfIncome}</p>
                          </div>

                          <div className="form-group full-width">
                            <label>Damage Description</label>
                            <p className="value-display">{household.damageDescription}</p>
                          </div>
                        </div>

                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteHousehold(index)}
                        >
                          <X size={18} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Household Form */}
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
                  <label>Head of Household Name *</label>
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
                  <label>Village / Location *</label>
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
                  <label>Gender *</label>
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
                  <label>Age *</label>
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
                  <label>Household Size *</label>
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
                  <label>Source of Income *</label>
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

              {households.length > 0 && (
                <div className="completion-section">
                  <div className="completion-message">
                    <h4>✅ Ready to save</h4>
                    <p>Click below to save this disaster and its household assessments</p>
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

                      {/* View Details Button */}
                      <button
                        className="btn-view"
                        onClick={() => setExpandedDisaster(expandedDisaster === disaster._id ? null : disaster._id)}
                        style={{ marginTop: '1.5rem' }}
                      >
                        <Eye size={18} />
                        {expandedDisaster === disaster._id ? "Hide" : "View"} Details
                      </button>

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
                                        <span style={{ color: '#1f2937' }}>{hh.incomeCategory || 'N/A'}</span>
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

                      {/* Submit for Approval Button */}
                      {disaster.status === "reported" && (
                        <button
                          className="btn-save-disaster"
                          onClick={() => handleSubmitDisaster(disaster._id)}
                          disabled={loading}
                          style={{ marginTop: '1.5rem' }}
                        >
                          {loading ? "Submitting..." : "Submit Disaster Report"}
                        </button>
                      )}
                      {disaster.status !== "reported" && (
                        <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
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
