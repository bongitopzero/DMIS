import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Edit2, Trash2, AlertTriangle, Cloud, Wind } from "lucide-react";
import API from "../api/axios";
import "./DisasterEvents.css";

export default function DisasterEvents({ mode = "dashboard" }) {
  const navigate = useNavigate();
  const [disasters, setDisasters] = useState([]);
  const [filteredDisasters, setFilteredDisasters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("current");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingDisaster, setVerifyingDisaster] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDisaster, setViewingDisaster] = useState(null);
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.user?.role || "";
  const isCoordinator = userRole === "Coordinator";
  const isClerk = userRole === "Data Clerk";
  
  const [formData, setFormData] = useState({
    incidentTitle: "",
    disasterCategory: "",
    financialYear: "",
    occurrenceDate: "",
    occurrenceTime: "",
    reportDate: "",
    approvalStatus: "pending",
    type: "drought",
    district: "",
    region: "",
    location: "",
    village: "",
    areaClassification: "",
    affectedPopulation: "",
    households: "",
    totalAffectedPopulation: "",
    malePopulation: "",
    femalePopulation: "",
    childrenCount: "",
    elderlyCount: "",
    disabledCount: "",
    childHeadedHouseholds: "",
    femaleHeadedHouseholds: "",
    vulnerableHouseholds: "",
    damages: "",
    schoolsDamaged: "",
    clinicsDamaged: "",
    roadsDamagedKm: "",
    bridgesDamaged: "",
    waterSystemsAffected: "",
    electricityDamage: "",
    publicBuildingsDamaged: "",
    infrastructureRepairCost: "",
    photosUrls: "",
    needs: [],
    severity: "medium",
    status: "reported",
  });
  const [customNeed, setCustomNeed] = useState("");

  const disasterTypes = [
    { value: "drought", label: "Drought" },
    { value: "heavy_rainfall", label: "Heavy Rainfall" },
    { value: "strong_winds", label: "Strong Winds" },
  ];

  const disasterNeeds = {
    drought: [
      "Water",
      "Food",
      "Medical Supplies",
      "Livestock Feed",
      "Seeds",
      "Shelter",
      "Cash Assistance",
    ],
    heavy_rainfall: [
      "Shelter",
      "Food",
      "Medical Supplies",
      "Cleaning Supplies",
      "Emergency Repairs",
      "Blankets",
      "Sanitation Kits",
    ],
    strong_winds: [
      "Shelter",
      "Emergency Repairs",
      "Medical Supplies",
      "Food",
      "Building Materials",
      "Temporary Housing",
      "Tarps/Roofing",
    ],
  };

  const severityLevels = [
    { value: "low", label: "Low Severity" },
    { value: "medium", label: "Moderate Severity" },
    { value: "high", label: "High Severity" },
  ];
  const statuses = [
    { value: "reported", label: "Reported" },
    { value: "verified", label: "Verified" },
    { value: "closed", label: "Closed" },
  ];

  const disasterCategoryOptions = [
    "Flood",
    "Drought",
    "Storm",
    "Landslide",
    "Fire",
    "Epidemic",
    "Other",
  ];


  // Districts organized by region
  const districtsByRegion = {
    "Lowlands": ["Maseru", "Mafeteng", "Mohale's Hoek", "Quthing"],
    "Foothills": ["Berea", "Leribe", "Butha-Buthe"],
    "Highlands": ["Mokhotlong", "Qacha's Nek", "Thaba-Tseka"]
  };

  // Population intervals
  const populationIntervals = [
    { value: "0-50", label: "0 - 50 people" },
    { value: "51-100", label: "51 - 100 people" },
    { value: "101-250", label: "101 - 250 people" },
    { value: "251-500", label: "251 - 500 people" },
    { value: "501-1000", label: "501 - 1,000 people" },
    { value: "1001-2500", label: "1,001 - 2,500 people" },
    { value: "2501-5000", label: "2,501 - 5,000 people" },
    { value: "5000+", label: "5,000+ people" },
  ];

  // Household intervals
  const householdIntervals = [
    { value: "0-10", label: "0 - 10 households" },
    { value: "11-25", label: "11 - 25 households" },
    { value: "26-50", label: "26 - 50 households" },
    { value: "51-100", label: "51 - 100 households" },
    { value: "101-250", label: "101 - 250 households" },
    { value: "251-500", label: "251 - 500 households" },
    { value: "500+", label: "500+ households" },
  ];

  // Fetch disasters on mount
  useEffect(() => {
    fetchDisasters();
  }, [yearFilter]);

  useEffect(() => {
    if (mode === "register") {
      openAddModal(false);
    }
  }, [mode]);

  // Filter disasters when search or filters change
  useEffect(() => {
    let result = disasters;

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (d) =>
          d.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((d) => d.type === typeFilter);
    }

    // Severity filter
    if (severityFilter !== "all") {
      result = result.filter((d) => d.severity === severityFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }

    setFilteredDisasters(result);
  }, [disasters, searchTerm, typeFilter, severityFilter, statusFilter]);

  const fetchDisasters = async () => {
    setError("");
    try {
      const query = yearFilter === "all" ? "?year=all" : "";
      const res = await API.get(`/disasters${query}`);
      setDisasters(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load disasters");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNeedsChange = (need) => {
    setFormData((prev) => {
      const currentNeeds = Array.isArray(prev.needs) ? prev.needs : [];
      const isSelected = currentNeeds.includes(need);
      const updatedNeeds = isSelected
        ? currentNeeds.filter((n) => n !== need)
        : [...currentNeeds, need];
      return { ...prev, needs: updatedNeeds };
    });
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const openAddModal = (openInModal = false) => {
    setEditingId(null);
    setCustomNeed("");
    setFormData({
      incidentTitle: "",
      disasterCategory: "",
      financialYear: "",
      occurrenceDate: "",
      occurrenceTime: "",
      reportDate: "",
      approvalStatus: "pending",
      type: "drought",
      district: "",
      region: "",
      location: "",
      village: "",
      areaClassification: "",
      affectedPopulation: "",
      households: "",
      totalAffectedPopulation: "",
      malePopulation: "",
      femalePopulation: "",
      childrenCount: "",
      elderlyCount: "",
      disabledCount: "",
      childHeadedHouseholds: "",
      femaleHeadedHouseholds: "",
      vulnerableHouseholds: "",
      damages: "",
      schoolsDamaged: "",
      clinicsDamaged: "",
      roadsDamagedKm: "",
      bridgesDamaged: "",
      waterSystemsAffected: "",
      electricityDamage: "",
      publicBuildingsDamaged: "",
      infrastructureRepairCost: "",
      photosUrls: "",
      needs: [],
      severity: "medium",
      status: "reported", // Always start as "reported"
    });
    setShowModal(openInModal);
  };

  const openEditModal = (disaster) => {
    setEditingId(disaster._id);
    // Convert needs string to array
    const needsArray = disaster.needs
      ? typeof disaster.needs === "string"
        ? disaster.needs.split(",").map((n) => n.trim())
        : disaster.needs
      : [];
    
    // Check if there's a custom need (not in the standard list for this type)
    const standardNeeds = disasterNeeds[disaster.type] || [];
    const customNeeds = needsArray.filter((n) => !standardNeeds.includes(n));
    const finalCustomNeed = customNeeds.length > 0 ? customNeeds[0] : "";
    
    // If there's a custom need, add "Other" to the needs array
    if (finalCustomNeed) {
      if (!needsArray.includes("Other")) {
        needsArray.push("Other");
      }
    }
    
    setCustomNeed(finalCustomNeed);
    setFormData({
      incidentTitle: disaster.incidentTitle || "",
      disasterCategory: disaster.disasterCategory || "",
      financialYear: disaster.financialYear || "",
      occurrenceDate: disaster.occurrenceDate ? new Date(disaster.occurrenceDate).toISOString().slice(0, 10) : "",
      occurrenceTime: disaster.occurrenceTime || "",
      reportDate: disaster.reportDate ? new Date(disaster.reportDate).toISOString().slice(0, 10) : "",
      approvalStatus: disaster.approvalStatus || "pending",
      type: disaster.type,
      district: disaster.district,
      region: disaster.region || "",
      location: disaster.location || "",
      village: disaster.village || "",
      areaClassification: disaster.areaClassification || "",
      affectedPopulation: disaster.affectedPopulation?.toString() || "",
      households: disaster.households?.toString() || "",
      totalAffectedPopulation: disaster.totalAffectedPopulation?.toString() || "",
      malePopulation: disaster.malePopulation?.toString() || "",
      femalePopulation: disaster.femalePopulation?.toString() || "",
      childrenCount: disaster.childrenCount?.toString() || "",
      elderlyCount: disaster.elderlyCount?.toString() || "",
      disabledCount: disaster.disabledCount?.toString() || "",
      childHeadedHouseholds: disaster.childHeadedHouseholds?.toString() || "",
      femaleHeadedHouseholds: disaster.femaleHeadedHouseholds?.toString() || "",
      vulnerableHouseholds: disaster.vulnerableHouseholds?.toString() || "",
      damages: disaster.damages || "",
      schoolsDamaged: disaster.schoolsDamaged?.toString() || "",
      clinicsDamaged: disaster.clinicsDamaged?.toString() || "",
      roadsDamagedKm: disaster.roadsDamagedKm?.toString() || "",
      bridgesDamaged: disaster.bridgesDamaged?.toString() || "",
      waterSystemsAffected: disaster.waterSystemsAffected?.toString() || "",
      electricityDamage: disaster.electricityDamage?.toString() || "",
      publicBuildingsDamaged: disaster.publicBuildingsDamaged?.toString() || "",
      infrastructureRepairCost: disaster.infrastructureRepairCost?.toString() || "",
      photosUrls: Array.isArray(disaster.photosUrls) ? disaster.photosUrls.join(", ") : "",
      needs: needsArray,
      severity: disaster.severity,
      status: disaster.status || "reported",
    });
    setShowModal(true);
  };

  const openViewModal = (disaster) => {
    setViewingDisaster(disaster);
    setShowViewModal(true);
  };

  const handleSaveDisaster = async () => {
    setError("");
    setSuccess("");

    const {
      incidentTitle,
      disasterCategory,
      financialYear,
      occurrenceDate,
      reportDate,
      district,
      region,
      areaClassification,
      affectedPopulation,
      totalAffectedPopulation,
      damages,
      needs,
    } = formData;

    if (
      !incidentTitle ||
      !disasterCategory ||
      !financialYear ||
      !occurrenceDate ||
      !reportDate ||
      !district ||
      !region ||
      !areaClassification ||
      !affectedPopulation ||
      !totalAffectedPopulation ||
      !damages ||
      !needs ||
      needs.length === 0
    ) {
      setError("Please fill in all required fields and select at least one need");
      return;
    }

    const photosUrls = formData.photosUrls
      ? formData.photosUrls.split(",").map((url) => url.trim()).filter(Boolean)
      : [];

    try {
      // Build the final needs array
      let finalNeeds = needs.filter((n) => n !== "Other");
      if (needs.includes("Other") && customNeed.trim()) {
        finalNeeds.push(customNeed.trim());
      }

      const payload = {
        ...formData,
        needs: Array.isArray(finalNeeds) ? finalNeeds.join(", ") : finalNeeds,
        households: formData.households || "0-10",
        affectedHouses: toNumber(formData.affectedHouses),
        damageCost: toNumber(formData.damageCost),
        photosUrls,
        totalAffectedPopulation: toNumber(formData.totalAffectedPopulation),
        malePopulation: toNumber(formData.malePopulation),
        femalePopulation: toNumber(formData.femalePopulation),
        childrenCount: toNumber(formData.childrenCount),
        elderlyCount: toNumber(formData.elderlyCount),
        disabledCount: toNumber(formData.disabledCount),
        childHeadedHouseholds: toNumber(formData.childHeadedHouseholds),
        femaleHeadedHouseholds: toNumber(formData.femaleHeadedHouseholds),
        vulnerableHouseholds: toNumber(formData.vulnerableHouseholds),
        schoolsDamaged: toNumber(formData.schoolsDamaged),
        clinicsDamaged: toNumber(formData.clinicsDamaged),
        roadsDamagedKm: toNumber(formData.roadsDamagedKm),
        bridgesDamaged: toNumber(formData.bridgesDamaged),
        waterSystemsAffected: toNumber(formData.waterSystemsAffected),
        electricityDamage: toNumber(formData.electricityDamage),
        publicBuildingsDamaged: toNumber(formData.publicBuildingsDamaged),
        infrastructureRepairCost: toNumber(formData.infrastructureRepairCost),
      };

      // Data Clerks cannot change status - always keep as "reported" for new incidents
      if (isClerk && !editingId) {
        payload.status = "reported";
      }
      // Data Clerks editing should not change status
      if (isClerk && editingId) {
        delete payload.status; // Don't send status in update
      }

      console.log("Submitting disaster data:", payload);

      if (editingId) {
        await API.put(`/disasters/${editingId}`, payload);
        setSuccess("Disaster updated successfully!");
      } else {
        const response = await API.post("/disasters", payload);
        console.log("Disaster created:", response.data);
        setSuccess("Disaster registered successfully!");
      }

      setShowModal(false);
      setCustomNeed("");
      fetchDisasters();
    } catch (err) {
      console.error("Error submitting disaster:", err.response?.data || err);
      setError(err.response?.data?.message || err.response?.data?.error || "Operation failed");
    }
  };

  const handleDeleteDisaster = async (id) => {
    if (window.confirm("Are you sure you want to delete this disaster?")) {
      try {
        await API.delete(`/disasters/${id}`);
        setSuccess("Disaster deleted successfully!");
        fetchDisasters();
      } catch (err) {
        console.error("Error deleting disaster:", err.response?.data || err);
        setError(err.response?.data?.message || "Failed to delete disaster");
      }
    }
  };

  const getDisasterIcon = (type) => {
    switch (type) {
      case "drought":
        return <AlertTriangle className="w-6 h-6" />;
      case "heavy_rainfall":
        return <Cloud className="w-6 h-6" />;
      case "strong_winds":
        return <Wind className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getDisasterColor = (type) => {
    switch (type) {
      case "drought":
        return { border: "#DC2626", bg: "#FEE2E2", icon: "#991B1B" };
      case "heavy_rainfall":
        return { border: "#F59E0B", bg: "#FEF3C7", icon: "#92400E" };
      case "strong_winds":
        return { border: "#16A34A", bg: "#DCFCE7", icon: "#166534" };
      default:
        return { border: "#6B7280", bg: "#F3F4F6", icon: "#374151" };
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      high: { label: "High Severity", bg: "#DC2626", color: "white" },
      medium: { label: "Moderate Severity", bg: "#F59E0B", color: "white" },
      low: { label: "Low Severity", bg: "#16A34A", color: "white" },
    };
    return badges[severity] || badges.medium;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: "#DC2626",      // Red
      medium: "#F59E0B",    // Yellow/Orange
      low: "#16A34A",       // Green
    };
    return colors[severity] || "#6B7280";
  };

  const getStatusBadge = (status) => {
    const badges = {
      reported: { label: "Reported", bg: "#F59E0B", color: "white" },
      verified: { label: "Verified", bg: "#3B82F6", color: "white" },
      responding: { label: "Verified", bg: "#3B82F6", color: "white" },
      closed: { label: "Closed", bg: "#10B981", color: "white" },
    };
    return badges[status] || badges.reported;
  };

  const handleVerifyIncident = (disaster) => {
    setVerifyingDisaster(disaster);
    setVerificationNotes("");
    setShowVerifyModal(true);
  };

  const handleStatusUpdate = async (disasterId, newStatus) => {
    try {
      const res = await API.put(`/disasters/${disasterId}`, { status: newStatus });
      const updated = res.data;
      if (updated?._id) {
        setDisasters((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
      }
      setSuccess(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
      setTimeout(() => setError(""), 5000);
    }
  };

  const confirmVerification = async () => {
    if (!verifyingDisaster) return;
    
    try {
      const res = await API.put(`/disasters/${verifyingDisaster._id}`, {
        status: "closed",
        verificationNotes,
        verifiedBy: currentUser?.user?.id,
        verifiedAt: new Date().toISOString(),
      });
      const updated = res.data;
      if (updated?._id) {
        setDisasters((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
      }
      setSuccess("Incident verified and closed successfully");
      setShowVerifyModal(false);
      setVerifyingDisaster(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify incident");
      setTimeout(() => setError(""), 5000);
    }
  };

  const canEditStatus = (currentStatus) => {
    if (!isCoordinator) return false;
    // Coordinator can update status following the workflow
    return true;
  };

  const getNextStatus = (currentStatus) => {
    const workflow = {
      reported: null,
      verified: "closed",
      closed: null,
    };
    return workflow[currentStatus];
  };

  const renderDisasterForm = (inline = false) => (
    <div
      className="modal-content"
      onClick={inline ? undefined : (e) => e.stopPropagation()}
      style={inline ? { maxWidth: "1100px", margin: "0 auto" } : undefined}
    >
      <div className="modal-header">
        <h2 className="modal-title">{editingId ? "Edit Disaster" : "Register New Disaster"}</h2>
        {!inline && (
          <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="modal-body">
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600 }}>Disaster Identification Fields</h3>

        {/* Row 1: Type, Severity, and Status */}
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Disaster Type <span className="required-asterisk">*</span></label>
            <select name="type" value={formData.type} onChange={handleInputChange}>
              {disasterTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Severity Level <span className="required-asterisk">*</span></label>
            <select name="severity" value={formData.severity} onChange={handleInputChange}>
              {severityLevels.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {/* Status - Only for Coordinator */}
          {isCoordinator && (
            <div className="form-group">
              <label>Status <span className="required-asterisk">*</span></label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                {statuses.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Show status for Data Clerk but disabled */}
          {isClerk && (
            <div className="form-group">
              <label>Status (Read-only) <span className="required-asterisk">*</span></label>
              <input 
                type="text" 
                value={statuses.find(s => s.value === formData.status)?.label || "Reported"}
                disabled
                style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
              />
            </div>
          )}
        </div>

        {/* Incident Identification */}
        <div className="form-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Incident Title <span className="required-asterisk">*</span></label>
            <input
              type="text"
              name="incidentTitle"
              value={formData.incidentTitle}
              onChange={handleInputChange}
              placeholder="e.g., March 2024 Flooding - Maseru"
            />
          </div>
          <div className="form-group">
            <label>Disaster Category <span className="required-asterisk">*</span></label>
            <select name="disasterCategory" value={formData.disasterCategory} onChange={handleInputChange}>
              <option value="">Select category</option>
              {disasterCategoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Financial Year <span className="required-asterisk">*</span></label>
            <input
              type="text"
              name="financialYear"
              value={formData.financialYear}
              onChange={handleInputChange}
              placeholder="e.g., 2024/2025"
            />
          </div>
        </div>

        {/* Occurrence & Reporting */}
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Occurrence Date <span className="required-asterisk">*</span></label>
            <input
              type="date"
              name="occurrenceDate"
              value={formData.occurrenceDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Occurrence Time</label>
            <input
              type="time"
              name="occurrenceTime"
              value={formData.occurrenceTime}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Report Date <span className="required-asterisk">*</span></label>
            <input
              type="date"
              name="reportDate"
              value={formData.reportDate}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Approval Status */}
        {isCoordinator && (
          <div className="form-row">
            <div className="form-group">
              <label>Approval Status</label>
              <select name="approvalStatus" value={formData.approvalStatus} onChange={handleInputChange}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
        {isClerk && (
          <div className="form-row">
            <div className="form-group">
              <label>Approval Status (Read-only)</label>
              <input
                type="text"
                value={formData.approvalStatus || "pending"}
                disabled
                style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
              />
            </div>
          </div>
        )}

        {/* District with Sections */}
        <div className="form-row">
          <div className="form-group">
            <label>District (by Region) <span className="required-asterisk">*</span></label>
            <select name="district" value={formData.district} onChange={handleInputChange}>
              <option value="">Select district</option>
              {Object.entries(districtsByRegion).map(([region, districts]) => (
                <optgroup key={region} label={region}>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>District Region/Area <span className="required-asterisk">*</span></label>
            <select 
              name="region" 
              value={formData.region} 
              onChange={handleInputChange}
              disabled={!formData.district}
            >
              <option value="">Select region</option>
              <option value="North Area">North Area</option>
              <option value="South Area">South Area</option>
              <option value="East Area">East Area</option>
              <option value="West Area">West Area</option>
            </select>
            {!formData.district && (
              <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>Select district first</small>
            )}
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="form-group">
            <label>Area Classification <span className="required-asterisk">*</span></label>
            <select name="areaClassification" value={formData.areaClassification} onChange={handleInputChange}>
              <option value="">Select classification</option>
              <option value="rural">Rural</option>
              <option value="urban">Urban</option>
              <option value="peri-urban">Peri-Urban</option>
            </select>
          </div>
          <div className="form-group">
            <label>Village</label>
            <input
              type="text"
              name="village"
              value={formData.village}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Location Name */}
        <div className="form-group">
          <label>Location Name</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
          />
        </div>

        <h3 style={{ margin: "24px 0 12px", fontSize: "16px", fontWeight: 600 }}>Household Damage Fields</h3>

        {/* Row 2: Affected Population and Households with Intervals */}
        <div className="form-row">
          <div className="form-group">
            <label>Affected Population <span className="required-asterisk">*</span></label>
            <select
              name="affectedPopulation"
              value={formData.affectedPopulation}
              onChange={handleInputChange}
            >
              <option value="">Select population range</option>
              {populationIntervals.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Affected Households <span className="required-asterisk">*</span></label>
            <select
              name="households"
              value={formData.households}
              onChange={handleInputChange}
            >
              <option value="">Select household range</option>
              {householdIntervals.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Population Breakdown */}
        <div className="form-row">
          <div className="form-group">
            <label>Affected Population (Exact Number) <span className="required-asterisk">*</span></label>
            <input
              type="number"
              name="totalAffectedPopulation"
              value={formData.totalAffectedPopulation}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Male Population</label>
            <input
              type="number"
              name="malePopulation"
              value={formData.malePopulation}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Female Population</label>
            <input
              type="number"
              name="femalePopulation"
              value={formData.femalePopulation}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Children Count</label>
            <input
              type="number"
              name="childrenCount"
              value={formData.childrenCount}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Elderly Count</label>
            <input
              type="number"
              name="elderlyCount"
              value={formData.elderlyCount}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Persons with Disabilities</label>
            <input
              type="number"
              name="disabledCount"
              value={formData.disabledCount}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Vulnerable Households</label>
            <input
              type="number"
              name="vulnerableHouseholds"
              value={formData.vulnerableHouseholds}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="form-group">
            <label>Child-Headed Households</label>
            <input
              type="number"
              name="childHeadedHouseholds"
              value={formData.childHeadedHouseholds}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Female-Headed Households</label>
            <input
              type="number"
              name="femaleHeadedHouseholds"
              value={formData.femaleHeadedHouseholds}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        {/* Row 3: Exact Numbers for Affected Houses and Damage Cost */}
        <div className="form-row">
          <div className="form-group">
            <label>Affected Houses (Exact Number) <span className="required-asterisk">*</span></label>
            <input
              type="number"
              name="affectedHouses"
              value={formData.affectedHouses || ""}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        {/* Damages Description */}
        <div className="form-group">
          <label>Damages Description</label>
          <textarea
            name="damages"
            value={formData.damages}
            onChange={handleInputChange}
            rows="4"
            style={{ fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        <h3 style={{ margin: "24px 0 12px", fontSize: "16px", fontWeight: 600 }}>Infrastructure Damage Fields</h3>

        {/* Infrastructure Impact */}
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Schools Damaged</label>
            <input
              type="number"
              name="schoolsDamaged"
              value={formData.schoolsDamaged}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Clinics Damaged</label>
            <input
              type="number"
              name="clinicsDamaged"
              value={formData.clinicsDamaged}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Roads Damaged (km)</label>
            <input
              type="number"
              name="roadsDamagedKm"
              value={formData.roadsDamagedKm}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-group">
            <label>Bridges Damaged</label>
            <input
              type="number"
              name="bridgesDamaged"
              value={formData.bridgesDamaged}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Water Systems Affected</label>
            <input
              type="number"
              name="waterSystemsAffected"
              value={formData.waterSystemsAffected}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Electricity Damage (sites)</label>
            <input
              type="number"
              name="electricityDamage"
              value={formData.electricityDamage}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="form-group">
            <label>Public Buildings Damaged</label>
            <input
              type="number"
              name="publicBuildingsDamaged"
              value={formData.publicBuildingsDamaged}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Infrastructure Repair Cost (override)</label>
            <input
              type="number"
              name="infrastructureRepairCost"
              value={formData.infrastructureRepairCost}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        {/* Immediate Needs */}
        <div className="form-group">
          <label>Immediate Needs <span className="required-asterisk">*</span></label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            padding: "12px",
            backgroundColor: "#f9fafb",
            borderRadius: "4px",
            border: "1px solid #e5e7eb"
          }}>
            {disasterNeeds[formData.type]?.map((need) => (
              <label key={need} style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px"
              }}>
                <input
                  type="checkbox"
                  checked={Array.isArray(formData.needs) && formData.needs.includes(need)}
                  onChange={() => handleNeedsChange(need)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer"
                  }}
                />
                {need}
              </label>
            ))}
            {/* Other Option */}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px"
            }}>
              <input
                type="checkbox"
                checked={Array.isArray(formData.needs) && formData.needs.includes("Other")}
                onChange={() => handleNeedsChange("Other")}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer"
                }}
              />
              Other
            </label>
          </div>
          {/* Custom Need Input */}
          {Array.isArray(formData.needs) && formData.needs.includes("Other") && (
            <input
              type="text"
              value={customNeed}
              onChange={(e) => setCustomNeed(e.target.value)}
              style={{
                marginTop: "8px",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: "inherit",
                width: "100%",
                boxSizing: "border-box"
              }}
            />
          )}
        </div>

        {/* Photos */}
        <div className="form-row" style={{ gridTemplateColumns: "1fr" }}>
          <div className="form-group">
            <label>Photos URLs (comma-separated)</label>
            <input
              type="text"
              name="photosUrls"
              value={formData.photosUrls}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="modal-actions">
        {inline ? (
          <button
            className="btn-cancel"
            onClick={() => {
              openAddModal(false);
              if (mode === "register") {
                navigate("/disaster-events");
              }
            }}
          >
            Back to Dashboard
          </button>
        ) : (
          <button className="btn-cancel" onClick={() => setShowModal(false)}>
            Cancel
          </button>
        )}
        <button className="btn-save" onClick={handleSaveDisaster}>
          {editingId ? "Update Disaster" : "Register Disaster"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="disaster-events">
      {/* Filters & Controls */}
      {mode === "dashboard" && (
        <div className="filters-section">
          <div className="search-box">
            <Search className="w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="filter-select">
              <option value="current">Current Year</option>
              <option value="all">All Years</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
              <option value="all">All Types</option>
              {disasterTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="filter-select">
              <option value="all">All Severity</option>
              {severityLevels.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All Status</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Register Form */}
      {mode === "register" && (
        <div style={{ marginBottom: "24px" }}>
          {renderDisasterForm(true)}
        </div>
      )}

      {/* Disasters Grid */}
      {mode === "dashboard" && (
        <div className="disasters-grid">
          {filteredDisasters.length === 0 ? (
            <div className="no-disasters">No disasters found</div>
          ) : (
            filteredDisasters.map((disaster) => {
              const colors = getDisasterColor(disaster.type);
              const severity = getSeverityBadge(disaster.severity);
              const severityColor = getSeverityColor(disaster.severity);
              const status = getStatusBadge(disaster.status || "active");

              return (
                <div key={disaster._id} className="disaster-card">
                <div className="card-top-border" style={{ borderTopColor: severityColor }}></div>

                <div className="card-header">
                  <div className="card-icon" style={{ backgroundColor: colors.bg, color: colors.icon }}>
                    {getDisasterIcon(disaster.type)}
                  </div>
                  <div>
                    <div className="card-title-row">
                      <h3 className="card-title">{disaster.type.replace(/_/g, " ")}</h3>
                      {isCoordinator && disaster.status === "reported" && (
                        <button
                          className="action-btn verify-btn"
                          onClick={() => handleVerifyIncident(disaster)}
                          title="Verify Incident"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    <p className="card-location">
                      {disaster.district}
                      {disaster.region && <span> - {disaster.region}</span>}
                    </p>
                  </div>
                </div>

                <div className="card-details">
                  <div className="detail-item">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{disaster.location || "Location not recorded"}</span>
                  </div>

                  <div className="detail-item">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{disaster.affectedPopulation || "N/A"} affected ({disaster.households || "N/A"} households)</span>
                  </div>

                  {disaster.affectedHouses > 0 && (
                    <div className="detail-item">
                      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span>{disaster.affectedHouses} houses damaged</span>
                    </div>
                  )}

                  {disaster.damageCost > 0 && (
                    <div className="detail-item">
                      <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span>M {disaster.damageCost.toLocaleString()} damage cost</span>
                    </div>
                  )}

                  <div className="detail-item">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>Reported: {new Date(disaster.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="badge-group">
                    {disaster.status !== "closed" && (
                      <span className="severity-badge" style={{ backgroundColor: severity.bg, color: severity.color }}>
                        {severity.label}
                      </span>
                    )}
                  </div>
                  <div className="action-icons">
                    <button className="action-btn" onClick={() => openViewModal(disaster)} title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {isCoordinator && (
                      <button className="action-btn" onClick={() => openEditModal(disaster)} title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {isClerk && disaster.status === "reported" && (
                      <button className="action-btn" onClick={() => openEditModal(disaster)} title="Edit (Reported Only)">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {isCoordinator && (
                      <button className="action-btn delete-btn" onClick={() => handleDeleteDisaster(disaster._id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          {renderDisasterForm(false)}
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && verifyingDisaster && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Verify & Close Incident</h2>
              <button className="modal-close" onClick={() => setShowVerifyModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: "1rem" }}>
                <strong>Incident Details:</strong>
                <p>Type: {verifyingDisaster.type.replace(/_/g, " ")}</p>
                <p>District: {verifyingDisaster.district}</p>
                <p>Location: {verifyingDisaster.location}</p>
                <p>Affected Population: {verifyingDisaster.affectedPopulation}</p>
              </div>

              <div style={{
                background: "#ECFDF3",
                border: "1px solid #BBF7D0",
                borderRadius: "6px",
                padding: "10px",
                color: "#166534",
                fontSize: "13px"
              }}>
                After verification, this incident will be marked as closed.
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Verification Notes</label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows="4"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                background: "#EFF6FF", 
                border: "1px solid #BFDBFE", 
                borderRadius: "6px", 
                padding: "12px",
                marginTop: "1rem"
              }}>
                <strong style={{ color: "#1E40AF" }}>Verification Checklist:</strong>
                <ul style={{ marginTop: "8px", paddingLeft: "20px", color: "#1E3A8A" }}>
                  <li>✓ GIS location verified</li>
                  <li>✓ Ministry submission cross-checked</li>
                  <li>✓ Severity assessment validated</li>
                  <li>✓ Affected population confirmed</li>
                  <li>✓ No duplicate incidents found</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowVerifyModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={confirmVerification}>
                Verify & Close Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingDisaster && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Disaster Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Type and Status Row */}
              <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="view-field">
                  <label className="view-label">Disaster Type</label>
                  <div className="view-value">{viewingDisaster.type.replace(/_/g, " ").toUpperCase()}</div>
                </div>
                <div className="view-field">
                  <label className="view-label">Severity</label>
                  <div className="view-value">
                    <span className="severity-badge" style={{ 
                      backgroundColor: getSeverityBadge(viewingDisaster.severity).bg, 
                      color: getSeverityBadge(viewingDisaster.severity).color 
                    }}>
                      {getSeverityBadge(viewingDisaster.severity).label}
                    </span>
                  </div>
                </div>
                <div className="view-field">
                  <label className="view-label">Status</label>
                  <div className="view-value">
                    <span className="status-badge" style={{ 
                      backgroundColor: getStatusBadge(viewingDisaster.status || "active").bg, 
                      color: getStatusBadge(viewingDisaster.status || "active").color 
                    }}>
                      {getStatusBadge(viewingDisaster.status || "active").label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identification */}
              <div className="view-section">
                <h3 className="view-section-title">Incident Identification</h3>
                <div className="form-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Incident Title</label>
                    <div className="view-value">{viewingDisaster.incidentTitle || "N/A"}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Disaster Category</label>
                    <div className="view-value">{viewingDisaster.disasterCategory || "N/A"}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Financial Year</label>
                    <div className="view-value">{viewingDisaster.financialYear || "N/A"}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Occurrence Date</label>
                    <div className="view-value">
                      {viewingDisaster.occurrenceDate ? new Date(viewingDisaster.occurrenceDate).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Occurrence Time</label>
                    <div className="view-value">{viewingDisaster.occurrenceTime || "N/A"}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Report Date</label>
                    <div className="view-value">
                      {viewingDisaster.reportDate ? new Date(viewingDisaster.reportDate).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="view-field">
                    <label className="view-label">Approval Status</label>
                    <div className="view-value">{viewingDisaster.approvalStatus || "pending"}</div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="view-section">
                <h3 className="view-section-title">Location Information</h3>
                <div className="form-row">
                  <div className="view-field">
                    <label className="view-label">District</label>
                    <div className="view-value">{viewingDisaster.district}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Region/Area</label>
                    <div className="view-value">{viewingDisaster.region || "N/A"}</div>
                  </div>
                </div>
                <div className="view-field">
                  <label className="view-label">Location</label>
                  <div className="view-value">{viewingDisaster.location || "N/A"}</div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Area Classification</label>
                    <div className="view-value">{viewingDisaster.areaClassification || "N/A"}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Village</label>
                    <div className="view-value">{viewingDisaster.village || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Impact Information */}
              <div className="view-section">
                <h3 className="view-section-title">Impact Information</h3>
                <div className="form-row">
                  <div className="view-field">
                    <label className="view-label">Affected Population</label>
                    <div className="view-value">{viewingDisaster.affectedPopulation || "N/A"}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Affected Households</label>
                    <div className="view-value">{viewingDisaster.households || "N/A"}</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="view-field">
                    <label className="view-label">Affected Population (Exact Number)</label>
                    <div className="view-value">{viewingDisaster.totalAffectedPopulation || 0}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Male Population</label>
                    <div className="view-value">{viewingDisaster.malePopulation || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Female Population</label>
                    <div className="view-value">{viewingDisaster.femalePopulation || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Children Count</label>
                    <div className="view-value">{viewingDisaster.childrenCount || 0}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Elderly Count</label>
                    <div className="view-value">{viewingDisaster.elderlyCount || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Persons with Disabilities</label>
                    <div className="view-value">{viewingDisaster.disabledCount || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Vulnerable Households</label>
                    <div className="view-value">{viewingDisaster.vulnerableHouseholds || 0}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Child-Headed Households</label>
                    <div className="view-value">{viewingDisaster.childHeadedHouseholds || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Female-Headed Households</label>
                    <div className="view-value">{viewingDisaster.femaleHeadedHouseholds || 0}</div>
                  </div>
                </div>
                {viewingDisaster.affectedHouses > 0 && (
                  <div className="form-row">
                    <div className="view-field">
                      <label className="view-label">Affected Houses</label>
                      <div className="view-value">{viewingDisaster.affectedHouses}</div>
                    </div>
                    {viewingDisaster.damageCost > 0 && (
                      <div className="view-field">
                        <label className="view-label">Damage Cost</label>
                        <div className="view-value">M {viewingDisaster.damageCost.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Infrastructure Impact */}
              <div className="view-section">
                <h3 className="view-section-title">Infrastructure Impact</h3>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Schools Damaged</label>
                    <div className="view-value">{viewingDisaster.schoolsDamaged || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Clinics Damaged</label>
                    <div className="view-value">{viewingDisaster.clinicsDamaged || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Roads Damaged (km)</label>
                    <div className="view-value">{viewingDisaster.roadsDamagedKm || 0}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Bridges Damaged</label>
                    <div className="view-value">{viewingDisaster.bridgesDamaged || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Water Systems Affected</label>
                    <div className="view-value">{viewingDisaster.waterSystemsAffected || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Electricity Damage</label>
                    <div className="view-value">{viewingDisaster.electricityDamage || 0}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Public Buildings Damaged</label>
                    <div className="view-value">{viewingDisaster.publicBuildingsDamaged || 0}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Infrastructure Repair Cost</label>
                    <div className="view-value">
                      {viewingDisaster.infrastructureRepairCost ? `M ${Number(viewingDisaster.infrastructureRepairCost).toLocaleString()}` : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Damages Description */}
              <div className="view-section">
                <h3 className="view-section-title">Damages Description</h3>
                <div className="view-value" style={{ whiteSpace: "pre-wrap" }}>
                  {viewingDisaster.damages || "No description provided"}
                </div>
              </div>

              {/* Immediate Needs */}
              <div className="view-section">
                <h3 className="view-section-title">Immediate Needs</h3>
                <div className="view-value">
                  {viewingDisaster.needs ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {(typeof viewingDisaster.needs === "string" 
                        ? viewingDisaster.needs.split(",").map(n => n.trim())
                        : viewingDisaster.needs
                      ).map((need, idx) => (
                        <span key={idx} style={{
                          padding: "4px 12px",
                          backgroundColor: "#EFF6FF",
                          color: "#1E40AF",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}>
                          {need}
                        </span>
                      ))}
                    </div>
                  ) : "No needs specified"}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="view-section">
                <h3 className="view-section-title">Financial Summary</h3>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Household Repair Cost</label>
                    <div className="view-value">M {Number(viewingDisaster.totalHouseholdRepairCost || 0).toLocaleString()}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Reconstruction Cost</label>
                    <div className="view-value">M {Number(viewingDisaster.totalReconstructionCost || 0).toLocaleString()}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Infrastructure Cost</label>
                    <div className="view-value">M {Number(viewingDisaster.totalInfrastructureCost || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Relief Assistance</label>
                    <div className="view-value">M {Number(viewingDisaster.reliefAssistanceCost || 0).toLocaleString()}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Logistics</label>
                    <div className="view-value">M {Number(viewingDisaster.logisticsCost || 0).toLocaleString()}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Contingency</label>
                    <div className="view-value">M {Number(viewingDisaster.contingencyCost || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="view-field">
                    <label className="view-label">Total Estimated Requirement</label>
                    <div className="view-value">M {Number(viewingDisaster.totalEstimatedRequirement || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="view-section">
                <h3 className="view-section-title">Timestamps</h3>
                <div className="form-row">
                  <div className="view-field">
                    <label className="view-label">Reported On</label>
                    <div className="view-value">{new Date(viewingDisaster.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Last Updated</label>
                    <div className="view-value">{new Date(viewingDisaster.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="view-section">
                <h3 className="view-section-title">Photos</h3>
                <div className="view-value">
                  {Array.isArray(viewingDisaster.photosUrls) && viewingDisaster.photosUrls.length > 0
                    ? viewingDisaster.photosUrls.join(", ")
                    : "N/A"}
                </div>
              </div>

              {/* Verification Notes */}
              {viewingDisaster.verificationNotes && (
                <div className="view-section">
                  <h3 className="view-section-title">Verification Notes</h3>
                  <div className="view-value" style={{ 
                    whiteSpace: "pre-wrap",
                    backgroundColor: "#F0FDF4",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #BBF7D0"
                  }}>
                    {viewingDisaster.verificationNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              {isCoordinator && (
                <button className="btn-save" onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingDisaster);
                }}>
                  Edit Disaster
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
