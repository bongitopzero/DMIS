import React, { useState, useEffect } from "react";
import { Eye, AlertTriangle, Users, Home } from "lucide-react";
import API from "../api/axios";
import { ToastManager } from "../components/Toast";
import "./ApprovedDisasters.css";

export default function ApprovedDisasters() {
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchApprovedDisasters();
  }, []);

  const fetchApprovedDisasters = async () => {
    try {
      setLoading(true);
      const res = await API.get("/disasters/approved");
      setDisasters(res.data || []);
    } catch (err) {
      console.error("Failed to fetch approved disasters:", err);
      ToastManager.error("Failed to load approved disasters");
    } finally {
      setLoading(false);
    }
  };

  const getDisasterId = (disaster) => {
    return disaster.disasterCode || `D-UNKNOWN`;
  };

  const getSeverityColor = (severity) => {
    const colorMap = {
      low: "#68a357",
      medium: "#f39c12",
      high: "#e74c3c"
    };
    return colorMap[severity?.toLowerCase()] || "#95a5a6";
  };

  const viewDetails = (disaster) => {
    setSelectedDisaster(disaster);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-96">
            <p className="text-gray-500">Loading approved disasters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="approved-disasters-header">
          <h1>Approved Disasters</h1>
          <p className="text-gray-600">
            {disasters.length} disaster{disasters.length !== 1 ? "s" : ""} approved by DMA Coordinator
          </p>
        </div>

        {/* Main content */}
        {disasters.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No approved disasters available</p>
          </div>
        ) : (
          <div className="disasters-grid">
            {disasters.map((disaster) => (
              <div key={disaster._id} className="disaster-card">
                <div className="card-header">
                  <div>
                    <h3 className="disaster-id">{getDisasterId(disaster)}</h3>
                    <p className="disaster-type">
                      {disaster.type.replace("_", " ").toUpperCase()}
                    </p>
                  </div>
                  <div
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(disaster.severity) }}
                  >
                    {disaster.severity?.charAt(0).toUpperCase() + disaster.severity?.slice(1)}
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">District:</span>
                    <span className="value">{disaster.district}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className="value status-badge status-verified">Verified</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Affected Population:</span>
                    <span className="value">{disaster.affectedPopulation || "N/A"}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Households Affected:</span>
                    <span className="value">{disaster.numberOfHouseholdsAffected || 0}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Verified Date:</span>
                    <span className="value">
                      {disaster.verifiedAt
                        ? new Date(disaster.verifiedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="card-footer">
                  <button
                    className="btn-view"
                    onClick={() => viewDetails(disaster)}
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedDisaster && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{getDisasterId(selectedDisaster)}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowDetailModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <h3>Disaster Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Disaster Type</label>
                      <p>{selectedDisaster.type.replace("_", " ").toUpperCase()}</p>
                    </div>
                    <div className="detail-item">
                      <label>Severity</label>
                      <p
                        style={{
                          color: getSeverityColor(selectedDisaster.severity),
                          fontWeight: "600"
                        }}
                      >
                        {selectedDisaster.severity?.toUpperCase()}
                      </p>
                    </div>
                    <div className="detail-item">
                      <label>District</label>
                      <p>{selectedDisaster.district}</p>
                    </div>
                    <div className="detail-item">
                      <label>Reported Date</label>
                      <p>{new Date(selectedDisaster.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Impact Assessment</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Affected Population</label>
                      <p>{selectedDisaster.affectedPopulation || "N/A"}</p>
                    </div>
                    <div className="detail-item">
                      <label>Households Affected</label>
                      <p>{selectedDisaster.numberOfHouseholdsAffected || 0}</p>
                    </div>
                    <div className="detail-item">
                      <label>Male Population</label>
                      <p>{selectedDisaster.malePopulation || 0}</p>
                    </div>
                    <div className="detail-item">
                      <label>Female Population</label>
                      <p>{selectedDisaster.femalePopulation || 0}</p>
                    </div>
                    <div className="detail-item">
                      <label>Children (Under 5)</label>
                      <p>{selectedDisaster.childrenCount || 0}</p>
                    </div>
                    <div className="detail-item">
                      <label>Elderly</label>
                      <p>{selectedDisaster.elderlyCount || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Verification Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Verified Date</label>
                      <p>
                        {selectedDisaster.verifiedAt
                          ? new Date(selectedDisaster.verifiedAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div className="detail-item full-width">
                      <label>Verification Notes</label>
                      <p>{selectedDisaster.verificationNotes || "No notes"}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Damage & Requirements</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Damage Description</label>
                      <p>{selectedDisaster.damages || "N/A"}</p>
                    </div>
                    <div className="detail-item">
                      <label>Needs</label>
                      <p>{selectedDisaster.needs || "N/A"}</p>
                    </div>
                    <div className="detail-item">
                      <label>Estimated Total Requirement</label>
                      <p>M {(selectedDisaster.totalEstimatedRequirement || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
