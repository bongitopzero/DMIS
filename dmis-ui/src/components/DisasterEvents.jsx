import React, { useEffect, useState } from "react";
import { Search, Plus, Eye, Edit2, AlertTriangle, Cloud, Wind } from "lucide-react";
import API from "../api/axios";
import "./DisasterEvents.css";

export default function DisasterEvents() {
  const [disasters, setDisasters] = useState([]);
  const [filteredDisasters, setFilteredDisasters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingDisaster, setVerifyingDisaster] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDisasterDetail, setSelectedDisasterDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.user?.role || "";
  const isCoordinator = userRole === "Coordinator";
  const isClerk = userRole === "Data Clerk";
  
  const [formData, setFormData] = useState({
    type: "drought",
    district: "",
    location: "",
    affectedPopulation: "",
    households: "",
    damages: "",
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
    { value: "responding", label: "Responding" },
    { value: "closed", label: "Closed" },
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
  }, []);

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
      const res = await API.get("/disasters");
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

  const openAddModal = () => {
    setEditingId(null);
    setCustomNeed("");
    setFormData({
      type: "drought",
      district: "",
      location: "",
      affectedPopulation: "",
      households: "",
      damages: "",
      needs: [],
      severity: "medium",
      status: "reported", // Always start as "reported"
    });
    setShowModal(true);
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
      type: disaster.type,
      district: disaster.district,
      location: disaster.location || "",
      affectedPopulation: disaster.affectedPopulation?.toString() || "",
      households: disaster.households?.toString() || "",
      damages: disaster.damages || "",
      needs: needsArray,
      severity: disaster.severity,
      status: disaster.status || "reported",
    });
    setShowModal(true);
  };

  const handleSaveDisaster = async () => {
    setError("");
    setSuccess("");

    const { district, affectedPopulation, damages, needs } = formData;
    if (!district || !affectedPopulation || !damages || !needs || needs.length === 0) {
      setError("Please fill in all required fields including selecting at least one need");
      return;
    }

    try {
      // Build the final needs array
      let finalNeeds = needs.filter((n) => n !== "Other");
      if (needs.includes("Other") && customNeed.trim()) {
        finalNeeds.push(customNeed.trim());
      }

      const payload = {
        ...formData,
        affectedPopulation: formData.affectedPopulation,
        households: formData.households || "0-10",
        affectedHouses: parseInt(formData.affectedHouses) || 0,
        damageCost: parseFloat(formData.damageCost) || 0,
        needs: Array.isArray(finalNeeds) ? finalNeeds.join(", ") : finalNeeds,
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
      responding: { label: "Responding", bg: "#8B5CF6", color: "white" },
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
      await API.put(`/disasters/${disasterId}`, { status: newStatus });
      setSuccess(`Status updated to ${newStatus}`);
      fetchDisasters();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
      setTimeout(() => setError(""), 5000);
    }
  };

  const confirmVerification = async () => {
    if (!verifyingDisaster) return;
    
    try {
      await API.put(`/disasters/${verifyingDisaster._id}`, {
        status: "verified",
        verificationNotes,
        verifiedBy: currentUser?.user?.id,
        verifiedAt: new Date().toISOString(),
      });
      setSuccess("Incident verified successfully");
      setShowVerifyModal(false);
      setVerifyingDisaster(null);
      fetchDisasters();
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
      reported: "verified",
      verified: "responding",
      responding: "closed",
      closed: null,
    };
    return workflow[currentStatus];
  };

  const viewDisasterDetails = async (disaster) => {
    setDetailLoading(true);
    try {
      const assessmentsRes = await API.get(`/allocation/assessments/${disaster._id}`);
      setSelectedDisasterDetail({
        ...disaster,
        households: assessmentsRes.data.assessments || []
      });
      setShowDetailModal(true);
    } catch (err) {
      console.warn("Could not fetch assessments:", err);
      setSelectedDisasterDetail({
        ...disaster,
        households: []
      });
      setShowDetailModal(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveDisaster = async () => {
    if (!selectedDisasterDetail) return;
    try {
      await API.put(`/disasters/${selectedDisasterDetail._id}`, {
        status: "verified",
        approvedBy: currentUser?.user?.id,
        approvedAt: new Date().toISOString()
      });
      setSuccess("Disaster approved successfully!");
      setShowDetailModal(false);
      setSelectedDisasterDetail(null);
      fetchDisasters();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve disaster");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleRejectDisaster = async () => {
    if (!selectedDisasterDetail) return;
    try {
      await API.put(`/disasters/${selectedDisasterDetail._id}`, {
        status: "closed",
        rejectedBy: currentUser?.user?.id,
        rejectedAt: new Date().toISOString()
      });
      setSuccess("Disaster rejected successfully!");
      setShowDetailModal(false);
      setSelectedDisasterDetail(null);
      fetchDisasters();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject disaster");
      setTimeout(() => setError(""), 5000);
    }
  };

  return (
    <div className="disaster-events">
      {/* Filters & Controls */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search by district or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
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

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Disasters Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {filteredDisasters.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No disasters found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>ID</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Type</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>District</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Severity</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Households</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
              {filteredDisasters.map((disaster, idx) => {
                const statusBadge = getStatusBadge(disaster.status);
                const severityBadge = getSeverityBadge(disaster.severity);
                const disasterId = `D-${new Date(disaster.createdAt).getFullYear()}-${String(idx + 1).padStart(3, '0')}`;
                
                return (
                  <tr key={disaster._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{disasterId}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>{disaster.type?.replace(/_/g, ' ').charAt(0).toUpperCase() + disaster.type?.replace(/_/g, ' ').slice(1)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>{disaster.district}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                      <span
                        style={{
                          backgroundColor: severityBadge.bg,
                          color: severityBadge.color,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          display: 'inline-block',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}
                      >
                        {disaster.severity}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>{disaster.numberOfHouseholdsAffected || disaster.households || 0}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                      <span
                        style={{
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          display: 'inline-block',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => viewDisasterDetails(disaster)}
                          title="View Details"
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? "Edit Disaster" : "Register New Disaster"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="modal-body">
              {/* Row 1: Type, Severity, and Status */}
              <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="form-group">
                  <label>Disaster Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    {disasterTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Severity Level</label>
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
                    <label>Status</label>
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
                    <label>Status (Read-only)</label>
                    <input 
                      type="text" 
                      value={statuses.find(s => s.value === formData.status)?.label || "Reported"}
                      disabled
                      style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                    />
                  </div>
                )}
              </div>

              {/* District with Sections */}
              <div className="form-group">
                <label>District (by Region)</label>
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

              {/* Location Name */}
              <div className="form-group">
                <label>Location Name</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Village name, area"
                />
              </div>

              {/* Row 2: Affected Population and Households with Intervals */}
              <div className="form-row">
                <div className="form-group">
                  <label>Affected Population</label>
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
                  <label>Affected Households</label>
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

              {/* Row 3: Exact Numbers for Affected Houses and Damage Cost */}
              <div className="form-row">
                <div className="form-group">
                  <label>Affected Houses (Exact Number)</label>
                  <input
                    type="number"
                    name="affectedHouses"
                    value={formData.affectedHouses || ""}
                    onChange={handleInputChange}
                    placeholder="Enter exact number of affected houses"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Damage Cost (Maloti)</label>
                  <input
                    type="number"
                    name="damageCost"
                    value={formData.damageCost || ""}
                    onChange={handleInputChange}
                    placeholder="Enter total damage cost"
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
                  placeholder="Describe the damages caused..."
                  rows="4"
                  style={{ fontFamily: "inherit", resize: "vertical" }}
                />
              </div>

              {/* Immediate Needs */}
              <div className="form-group">
                <label>Immediate Needs</label>
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
                    placeholder="Enter other need..."
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
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveDisaster}>
                {editingId ? "Update Disaster" : "Register Disaster"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && verifyingDisaster && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Verify Incident</h2>
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

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Verification Notes</label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about verification checks, data validation, and confirmation..."
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
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDisasterDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          paddingTop: '2rem'
        }} onClick={() => setShowDetailModal(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '1200px',
            width: '95%',
            marginBottom: '2rem'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Title and Hide Details Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Disaster Summary</h2>
              <button 
                onClick={() => setShowDetailModal(false)} 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f3f4f6', 
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  color: '#1f2937',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                👁 Hide Details
              </button>
            </div>

            {/* Disaster Header Details Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem', marginTop: 0 }}>Disaster Header Details</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '2rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Disaster Type:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937', textTransform: 'capitalize' }}>{selectedDisasterDetail.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>District:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937' }}>{selectedDisasterDetail.district}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Date of Occurrence:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937' }}>{new Date(selectedDisasterDetail.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Severity:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937', textTransform: 'capitalize' }}>{selectedDisasterDetail.severity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Households Affected:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937' }}>{selectedDisasterDetail.numberOfHouseholdsAffected || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Status:</div>
                  <div style={{ fontSize: '0.95rem', color: '#1f2937', textTransform: 'capitalize' }}>{selectedDisasterDetail.status || "reported"}</div>
                </div>
              </div>
            </div>

            {/* Household Assessment Breakdown */}
            {Array.isArray(selectedDisasterDetail.households) && selectedDisasterDetail.households.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ paddingLeft: '0.5rem', borderLeft: '4px solid #dc2626', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', marginTop: 0, marginBottom: 0 }}>📋 Household Assessment Breakdown</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedDisasterDetail.households.map((hh, idx) => (
                    <div key={idx} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '1.5rem',
                      backgroundColor: '#f9fafb'
                    }}>
                      <h6 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                        Household {idx + 1}: {hh.householdId || `HH-${idx + 1}`}
                      </h6>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '1.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Household ID</div>
                          <div style={{ color: '#1f2937' }}>{hh.householdId || `HH-${idx + 1}`}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Head of Household Name</div>
                          <div style={{ color: '#1f2937' }}>{hh.headOfHousehold?.name || hh.headName || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Village / Location</div>
                          <div style={{ color: '#1f2937' }}>{hh.location?.village || hh.village || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Gender</div>
                          <div style={{ color: '#1f2937' }}>{hh.headOfHousehold?.gender || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Age</div>
                          <div style={{ color: '#1f2937' }}>{hh.headOfHousehold?.age || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Household Size</div>
                          <div style={{ color: '#1f2937' }}>{hh.householdSize || 'N/A'} people</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Income Category</div>
                          <div style={{ color: '#1f2937' }}>{hh.incomeCategory || 'N/A'}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Damage Description</div>
                          <div style={{ color: '#1f2937' }}>{hh.damageDescription || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isCoordinator && (selectedDisasterDetail.status === "reported" || selectedDisasterDetail.status === "submitted") && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleRejectDisaster}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  Reject
                </button>
                <button
                  onClick={handleApproveDisaster}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#152240'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1e3a5f'}
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
