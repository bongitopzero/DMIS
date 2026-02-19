import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { MapPin, RefreshCw, Cloud, Droplets, Wind, Grid } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "../leafletFix";
import API from "../api/axios";
import "./MapPage.css";

import lesothoDistricts from "../data/gadm41_LSO_1.json";

const MapPage = () => {
  const [incidentsData, setIncidentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedType, setSelectedType] = useState("All");

  const districts = [
    "All Districts",
    "Berea",
    "Butha-Buthe",
    "Leribe",
    "Mafeteng",
    "Maseru",
    "Mohale's Hoek",
    "Mokhotlong",
    "Qacha's Nek",
    "Quthing",
    "Thaba-Tseka"
  ];

  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/disasters");
      setIncidentsData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Please log in to view disasters");
      } else {
        setError("Failed to load disasters");
      }
      setIncidentsData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== HELPERS ===================== */

  // Normalize district names for matching
  const normalize = (value) => {
    if (!value) return "";
    return value.toLowerCase().replace(/['\s-]/g, "").trim();
  };

  const getSeverityColor = (severity) => {
    const normalized = (severity || "").toString().toLowerCase().trim();
    switch (normalized) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F97316";
      case "low":
        return "#22C55E";
      default:
        return "#E5E7EB";
    }
  };

  const normalizeType = (value) =>
    (value || "").toString().toLowerCase().replace(/[\s-]+/g, "_").trim();
  const normalizeSeverity = (value) =>
    (value || "").toString().toLowerCase().trim();
  const severityRank = { low: 1, medium: 2, high: 3 };
  const getHighestSeverity = (items) => {
    let highest = null;
    let highestScore = 0;
    items.forEach((item) => {
      const key = normalizeSeverity(item.severity);
      const score = severityRank[key] || 0;
      if (score > highestScore) {
        highestScore = score;
        highest = key;
      }
    });
    return highest;
  };

  /* ===================== DISTRICT STYLING ===================== */

  const styleDistrict = (feature) => {
    const districtName = feature.properties.NAME_1;
    const normalizedGeoDistrict = normalize(districtName);

    // Find matching disasters for this district
    const matchingDisasters = incidentsData.filter(
      (i) => normalize(i.district) === normalizedGeoDistrict
    );

    // Check if there's a match with the current type filter
    const typeFiltered = selectedType === "All"
      ? matchingDisasters
      : matchingDisasters.filter((i) => normalizeType(i.type) === selectedType);

    // Get the highest severity if multiple disasters
    const highestSeverity = getHighestSeverity(typeFiltered);

    return {
      fillColor: highestSeverity ? getSeverityColor(highestSeverity) : "#E5E7EB",
      weight: 1.5,
      opacity: 1,
      color: "#1F2937",
      fillOpacity: highestSeverity ? 0.7 : 0.4
    };
  };

  const onEachDistrict = (feature, layer) => {
    const districtName = feature.properties.NAME_1;
    const normalizedGeoDistrict = normalize(districtName);

    const incidents = incidentsData.filter(
      (i) => normalize(i.district) === normalizedGeoDistrict
    );

    // Count by severity
    const severityCounts = {
      high: incidents.filter(i => normalizeSeverity(i.severity) === "high").length,
      medium: incidents.filter(i => normalizeSeverity(i.severity) === "medium").length,
      low: incidents.filter(i => normalizeSeverity(i.severity) === "low").length
    };

    layer.bindPopup(`
      <div style="font-family: sans-serif; min-width: 150px;">
        <strong style="font-size: 14px; color: #1e293b;">${districtName}</strong><br/>
        <div style="margin-top: 8px; font-size: 13px;">
          <strong>Total Incidents:</strong> ${incidents.length}<br/>
          ${severityCounts.high > 0 ? `<span style="color: #EF4444;">● High: ${severityCounts.high}</span><br/>` : ''}
          ${severityCounts.medium > 0 ? `<span style="color: #F97316;">● Medium: ${severityCounts.medium}</span><br/>` : ''}
          ${severityCounts.low > 0 ? `<span style="color: #22C55E;">● Low: ${severityCounts.low}</span>` : ''}
        </div>
      </div>
    `);
  };

  /* ===================== FILTERING ===================== */

  const filteredIncidents = incidentsData.filter((incident) => {
    const districtMatch =
      selectedDistrict === "All Districts" || normalize(incident.district) === normalize(selectedDistrict);
    const typeMatch = selectedType === "All" || normalizeType(incident.type) === selectedType;
    return districtMatch && typeMatch;
  });

  // District coordinates mapping (using normalized keys)
  const districtCoordinates = {
    "berea": [-29.3, 28.3],
    "buthabuthe": [-28.8, 28.2],
    "leribe": [-28.9, 28.0],
    "mafeteng": [-29.8, 27.5],
    "maseru": [-29.31, 27.48],
    "mohaleshoek": [-30.1, 27.5],
    "mokhotlong": [-29.3, 29.1],
    "qachasnek": [-30.1, 28.7],
    "quthing": [-30.4, 27.7],
    "thabatseka": [-29.5, 28.6],
  };

  // Prepare incidents with coordinates
  const incidentsWithCoords = filteredIncidents.map((incident) => {
    const normalizedDistrict = normalize(incident.district);
    const coords = districtCoordinates[normalizedDistrict] || [-29.6, 28.3];
    
    return {
      ...incident,
      latitude: incident.latitude || coords[0] + (Math.random() - 0.5) * 0.1,
      longitude: incident.longitude || coords[1] + (Math.random() - 0.5) * 0.1,
    };
  });

  return (
    <div className="gis-map-page">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="sidebar-header">
          <MapPin size={28} />
          <h2>GIS Map</h2>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Population baseline: 2.3M • 10-year incident history
        </p>

        <div className="sidebar-content">
          {/* Refresh Button */}
          <button 
            className={`refresh-button ${loading ? "loading" : ""}`} 
            onClick={fetchDisasters} 
            disabled={loading}
          >
            <RefreshCw size={18} />
            {loading ? "Loading..." : "Refresh Data"}
          </button>

          {error && <div className="error-message" style={{
            padding: "12px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "13px",
            marginTop: "12px"
          }}>{error}</div>}

          {!loading && !error && incidentsData.length === 0 && (
            <div className="info-message" style={{
              padding: "12px",
              background: "#dbeafe",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              color: "#1e40af",
              fontSize: "13px",
              marginTop: "12px"
            }}>
              No disasters found. Make sure you're logged in.
            </div>
          )}

          {/* District Filter */}
          <div className="filter-section">
            <h3>District</h3>
            <select
              className="district-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Disaster Type Filter */}
          <div className="filter-section">
            <h3>Disaster Type</h3>
            <div className="disaster-types-grid">
              <button
                className={`type-button ${selectedType === "All" ? "active" : ""}`}
                onClick={() => setSelectedType("All")}
              >
                <Grid size={20} />
                <span>All Disasters</span>
              </button>
              <button
                className={`type-button ${selectedType === "drought" ? "active" : ""}`}
                onClick={() => setSelectedType("drought")}
              >
                <Cloud size={20} />
                <span>Drought</span>
              </button>
              <button
                className={`type-button ${selectedType === "heavy_rainfall" ? "active" : ""}`}
                onClick={() => setSelectedType("heavy_rainfall")}
              >
                <Droplets size={20} />
                <span>Heavy Rainfall</span>
              </button>
              <button
                className={`type-button ${selectedType === "strong_winds" ? "active" : ""}`}
                onClick={() => setSelectedType("strong_winds")}
              >
                <Wind size={20} />
                <span>Strong Winds</span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="map-stats">
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-number">{filteredIncidents.length}</p>
                <p className="stat-label">Showing</p>
              </div>
              <div className="stat-item">
                <p className="stat-number">{incidentsData.length}</p>
                <p className="stat-label">Total</p>
              </div>
            </div>
          </div>

          <div className="severity-legend">
            <div className="legend-title">Severity Levels</div>
            <div className="legend-item">
              <span className="legend-dot high"></span>
              <span className="legend-label">High</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot medium"></span>
              <span className="legend-label">Medium</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot low"></span>
              <span className="legend-label">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <MapContainer
          center={[-29.6, 28.3]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* District GeoJSON Overlay */}
          <GeoJSON
            data={lesothoDistricts}
            style={styleDistrict}
            onEachFeature={onEachDistrict}
          />

          {/* Incident Markers */}
          {incidentsWithCoords.map((incident, idx) => (
            <CircleMarker
              key={incident._id || idx}
              center={[incident.latitude, incident.longitude]}
              radius={8}
              fillColor={getSeverityColor(incident.severity)}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div style={{ minWidth: "200px" }}>
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                    {incident.type?.replace("_", " ").toUpperCase()}
                  </strong>
                  <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>District:</strong> {incident.district}
                    {incident.region && <span> - {incident.region}</span>}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Location:</strong> {incident.location}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Severity:</strong>{" "}
                    <span style={{ 
                      color: getSeverityColor(incident.severity),
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}>
                      {incident.severity}
                    </span>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Affected:</strong> {incident.households || "N/A"} households
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Status:</strong> {incident.status || "reported"}
                  </p>
                  {incident.damages && (
                    <p style={{ margin: "4px 0", fontSize: "11px", color: "#64748b" }}>
                      {incident.damages.substring(0, 80)}...
                    </p>
                  )}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]}>
                {incident.type?.replace("_", " ")} - {incident.district}
                {incident.region && ` (${incident.region})`}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

      </div>
    </div>
  );
};

export default MapPage;
