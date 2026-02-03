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
  const [formData, setFormData] = useState({
    type: "drought",
    district: "",
    location: "",
    affectedPopulation: "",
    households: "",
    damages: "",
    needs: [],
    severity: "medium",
    status: "active",
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
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "resolved", label: "Resolved" },
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
      status: "active",
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
      status: disaster.status || "active",
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
        affectedPopulation: Number(formData.affectedPopulation),
        households: Number(formData.households) || 0,
        needs: Array.isArray(finalNeeds) ? finalNeeds.join(", ") : finalNeeds,
      };

      if (editingId) {
        await API.put(`/disasters/${editingId}`, payload);
        setSuccess("Disaster updated successfully!");
      } else {
        await API.post("/disasters", payload);
        setSuccess("Disaster registered successfully!");
      }

      setShowModal(false);
      setCustomNeed("");
      fetchDisasters();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
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
      active: { label: "Active", bg: "#3B82F6", color: "white" },
      pending: { label: "Pending", bg: "#F59E0B", color: "white" },
      resolved: { label: "Resolved", bg: "#10B981", color: "white" },
    };
    return badges[status] || badges.active;
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

          <button onClick={openAddModal} className="btn-register">
            <Plus className="w-4 h-4" />
            Register Disaster
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Disasters Grid */}
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
                    <h3 className="card-title">{disaster.type.replace(/_/g, " ")}</h3>
                    <p className="card-location">{disaster.district}</p>
                  </div>
                </div>

                <div className="card-details">
                  <div className="detail-item">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{disaster.location || "Location TBD"}</span>
                  </div>

                  <div className="detail-item">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{disaster.affectedPopulation?.toLocaleString() || 0} affected ({disaster.households || 0} households)</span>
                  </div>

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
                    <span className="severity-badge" style={{ backgroundColor: severity.bg, color: severity.color }}>
                      {severity.label}
                    </span>
                  </div>
                  <div className="action-icons">
                    <button className="action-btn" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="action-btn" onClick={() => openEditModal(disaster)} title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
              {/* Row 1: Type and Severity */}
              <div className="form-row">
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
              </div>

              {/* District */}
              <div className="form-group">
                <label>District</label>
                <select name="district" value={formData.district} onChange={handleInputChange}>
                  <option value="">Select district</option>
                  <option value="Berea">Berea</option>
                  <option value="Butha-Buthe">Butha-Buthe</option>
                  <option value="Leribe">Leribe</option>
                  <option value="Mafeteng">Mafeteng</option>
                  <option value="Maseru">Maseru</option>
                  <option value="Mohale's Hoek">Mohale's Hoek</option>
                  <option value="Mokhotlong">Mokhotlong</option>
                  <option value="Qacha's Nek">Qacha's Nek</option>
                  <option value="Quthing">Quthing</option>
                  <option value="Thaba-Tseka">Thaba-Tseka</option>
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

              {/* Row 2: Affected Population and Households */}
              <div className="form-row">
                <div className="form-group">
                  <label>Affected Population</label>
                  <input
                    type="number"
                    name="affectedPopulation"
                    value={formData.affectedPopulation}
                    onChange={handleInputChange}
                    placeholder="Number of people affected"
                  />
                </div>
                <div className="form-group">
                  <label>Affected Households</label>
                  <input
                    type="number"
                    name="households"
                    value={formData.households}
                    onChange={handleInputChange}
                    placeholder="Number of households"
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
    </div>
  );
}
