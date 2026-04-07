import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "../leafletFix";
import API from "../api/axios";
import "./MapPage.css";

import lesothoDistricts from "../data/gadm41_LSO_1.json";
import {
  normalize,
  districtCoordinates,
  getIncidentCoordinates,
  normalizeType,
  normalizeSeverity,
  getSeverityColor,
} from "../utils/locationUtils";

const MapPage = () => {
  const [incidentsData, setIncidentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All Severity");
  const [currentYearOnly, setCurrentYearOnly] = useState(true);

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
    "Thaba-Tseka",
  ];

  /**
   * Fetch incidents and disasters from API
   * Merge results and deduplicate by _id only
   */
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dRes, iRes] = await Promise.allSettled([
        API.get("/disasters"),
        API.get("/incidents"),
      ]);

      const disasters =
        dRes.status === "fulfilled" && Array.isArray(dRes.value.data)
          ? dRes.value.data
          : [];
      const incidents =
        iRes.status === "fulfilled" && Array.isArray(iRes.value.data)
          ? iRes.value.data
          : [];

      // Merge and deduplicate by _id only
      const map = new Map();
      [...disasters, ...incidents].forEach((item) => {
        if (item._id) {
          map.set(item._id, item);
        }
      });

      let list = Array.from(map.values());

      // Filter by current year if enabled
      if (currentYearOnly) {
        const year = new Date().getFullYear();
        list = list.filter((item) => {
          const dateField = item.date || item.createdAt || item.occurrenceDate;
          if (!dateField) return false;
          const d = new Date(dateField);
          return d && d.getFullYear() === year;
        });
      }

      console.log(
        `📊 MapPage fetched: ${disasters.length} disasters + ${incidents.length} incidents = ${map.size} total → ${list.length} after year filter`
      );
      console.log(`Total incidents to render: ${list.length}`);

      setIncidentsData(list);
    } catch (err) {
      console.error("❌ Error fetching map data:", err);
      setError("Failed to load map data");
      setIncidentsData([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup polling to fetch data every 5 seconds
   */
  useEffect(() => {
    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      console.log("🔄 MapPage polling for updates...");
      fetchData();
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log("🛑 MapPage cleanup: stopping polling interval");
      clearInterval(interval);
    };
  }, []);

  /**
   * Log when year filter changes
   */
  useEffect(() => {
    console.log(`📅 Current year filter: ${currentYearOnly ? "ON" : "OFF"}`);
  }, [currentYearOnly]);

  /* ===================== FILTERING ===================== */

  const filteredIncidents = incidentsData.filter((incident) => {
    const districtMatch =
      selectedDistrict === "All Districts" ||
      normalize(incident.district) === normalize(selectedDistrict);
    const typeMatch =
      selectedType === "All" ||
      normalizeType(incident.type) === selectedType;
    const severityMatch =
      selectedSeverity === "All Severity" ||
      normalizeSeverity(incident.severity) === selectedSeverity.toLowerCase();

    return districtMatch && typeMatch && severityMatch;
  });

  useEffect(() => {
    console.log(
      `🔍 MapPage Filters: District=${selectedDistrict}, Type=${selectedType}, Severity=${selectedSeverity}`
    );
    console.log(`📍 Filtered: ${filteredIncidents.length} of ${incidentsData.length} incidents`);
  }, [
    filteredIncidents.length,
    selectedDistrict,
    selectedType,
    selectedSeverity,
    incidentsData.length,
  ]);

  /**
   * Prepare incidents with district-based coordinates (NO offset)
   * Clustering handles marker overlap visually
   * NEVER uses incident.latitude or incident.longitude from database
   */
  const incidentsWithCoords = filteredIncidents.map((incident) => {
    const coords = getIncidentCoordinates(incident);

    return {
      ...incident,
      latitude: coords[0],
      longitude: coords[1],
    };
  });

  /* ===================== DISTRICT STYLING ===================== */

  const styleDistrict = (feature) => ({
    fill: false,
    fillOpacity: 0,
    weight: 0.5,
    opacity: 0.3,
    color: "#ccc",
  });

  const onEachDistrict = (feature, layer) => {
    const districtName = feature.properties.NAME_1;
    const normalizedGeoDistrict = normalize(districtName);

    const incidents = incidentsData.filter(
      (i) => normalize(i.district) === normalizedGeoDistrict
    );

    // Count by severity
    const severityCounts = {
      high: incidents.filter((i) => {
        const sev = normalizeSeverity(i.severity);
        return sev === "critical" || sev === "high";
      }).length,
      moderate: incidents.filter((i) => {
        const sev = normalizeSeverity(i.severity);
        return sev === "medium" || sev === "moderate";
      }).length,
      low: incidents.filter((i) => normalizeSeverity(i.severity) === "low")
        .length,
    };

    layer.bindPopup(`
      <div style="font-family: sans-serif; min-width: 150px;">
        <strong style="font-size: 14px; color: #1e293b;">${districtName}</strong><br/>
        <div style="margin-top: 8px; font-size: 13px;">
          <strong>Total Incidents:</strong> ${incidents.length}<br/>
          ${severityCounts.high > 0 ? `<span style="color: #EF4444;">● High: ${severityCounts.high}</span><br/>` : ""}
          ${severityCounts.moderate > 0 ? `<span style="color: #F97316;">● Moderate: ${severityCounts.moderate}</span><br/>` : ""}
          ${severityCounts.low > 0 ? `<span style="color: #22C55E;">● Low: ${severityCounts.low}</span>` : ""}
        </div>
      </div>
    `);

    layer.on("click", () => {
      setSelectedDistrict(districtName);
    });
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="gis-map-page">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="sidebar-header">
          <MapPin size={28} />
        </div>

        <div className="sidebar-content">
          {/* SECTION 1 - Map Summary */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Map Summary</h3>
            </div>
            <div className="section-content">
              <div className="summary-row">
                <span className="summary-label">Visible Events</span>
                <span className="summary-value">{filteredIncidents.length}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Active Events</span>
                <span
                  className="summary-value"
                  style={{ color: "#EF4444", fontWeight: "600" }}
                >
                  {filteredIncidents.filter(
                    (i) => i.status === "reported" || i.status === "verified"
                  ).length}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total Affected</span>
                <span className="summary-value">
                  {filteredIncidents
                    .reduce(
                      (sum, i) =>
                        sum +
                        (Number(i.households) ||
                          Number(i.numberOfHouseholdsAffected) ||
                          0),
                      0
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider"></div>

          {/* SECTION 2 - Filters */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Filters</h3>
            </div>
            <div className="section-content">
              {/* District Dropdown */}
              <div className="filter-group">
                <label className="filter-label">District</label>
                <select
                  className="filter-select"
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

              {/* Severity Dropdown */}
              <div className="filter-group">
                <label className="filter-label">Severity</label>
                <select
                  className="filter-select"
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="All Severity">All Severity</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider"></div>

          {/* SECTION 3 - Disaster Types */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Disaster Types</h3>
            </div>
            <div className="section-content">
              <div className="disaster-type-item">
                <input
                  type="checkbox"
                  checked={selectedType === "All" || selectedType === "drought"}
                  onChange={() =>
                    setSelectedType(
                      selectedType === "drought" ? "All" : "drought"
                    )
                  }
                  className="type-checkbox"
                />
                <span>Drought</span>
              </div>
              <div className="disaster-type-item">
                <input
                  type="checkbox"
                  checked={
                    selectedType === "All" || selectedType === "flooding"
                  }
                  onChange={() =>
                    setSelectedType(
                      selectedType === "flooding" ? "All" : "flooding"
                    )
                  }
                  className="type-checkbox"
                />
                <span>Heavy Rainfall</span>
              </div>
              <div className="disaster-type-item">
                <input
                  type="checkbox"
                  checked={
                    selectedType === "All" || selectedType === "strong_winds"
                  }
                  onChange={() =>
                    setSelectedType(
                      selectedType === "strong_winds" ? "All" : "strong_winds"
                    )
                  }
                  className="type-checkbox"
                />
                <span>Strong Winds</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider"></div>

          {/* SECTION 4 - Severity Legend */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Severity Legend</h3>
            </div>
            <div className="section-content">
              <div className="legend-row">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: "#22C55E" }}
                ></span>
                <span className="legend-label">Low</span>
              </div>
              <div className="legend-row">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: "#F97316" }}
                ></span>
                <span className="legend-label">Moderate</span>
              </div>
              <div className="legend-row">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: "#EF4444" }}
                ></span>
                <span className="legend-label">Critical</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        {loading && <div className="loading-indicator">Loading map data...</div>}
        {error && <div className="error-indicator">{error}</div>}

        <MapContainer
          center={[-29.6, 28.2]}
          zoom={8}
          minZoom={7}
          maxBounds={[[-30.9, 26.7], [-28.3, 29.5]]}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* District GeoJSON Overlay */}
          <GeoJSON data={lesothoDistricts} style={styleDistrict} onEachFeature={onEachDistrict} />

          {/* Incident Markers with Clustering */}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={80}
          >
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
                    <hr
                      style={{
                        margin: "6px 0",
                        border: "none",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    />
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <strong>District:</strong> {incident.district}
                      {incident.region && <span> - {incident.region}</span>}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <strong>Location:</strong> {incident.location || incident.district}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <strong>Severity:</strong>{" "}
                      <span
                        style={{
                          color: getSeverityColor(incident.severity),
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        {incident.severity}
                      </span>
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <strong>Affected:</strong>{" "}
                      {incident.households ||
                        incident.numberOfHouseholdsAffected ||
                        "N/A"}{" "}
                      households
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
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
