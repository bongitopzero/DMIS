import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapPin } from "lucide-react";

// CRITICAL: Leaflet CSS - Load ONCE at top level
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import "../leafletFix";
import API from "../api/axios";
import "./MapPage.css";

import lesothoDistricts from "../data/gadm41_LSO_1.json";
import {
  normalize,
  getIncidentCoordinates,
  normalizeType,
  normalizeSeverity,
  getSeverityColor,
} from "../utils/locationUtils";
import { useMapResize } from "../hooks/useMapResize";

/**
 * ============================================
 * LEAFLET MARKER ICON FIX
 * ============================================
 * Leaflet doesn't load marker icons by default in bundlers
 */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/**
 * ============================================
 * INNER MAP CONTENT COMPONENT
 * ============================================
 * Separated to use useMapResize hook
 */
const MapContent = ({
  incidentsWithCoords,
  incidentsData,
  styleDistrict,
  onEachDistrict,
}) => {
  // Use custom hook to fix map sizing
  useMapResize();

  return (
    <>
      {/* Base tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* District boundaries (GeoJSON) */}
      <GeoJSON data={lesothoDistricts} style={styleDistrict} onEachFeature={onEachDistrict} />

      {/* CLUSTERING: Wrap markers in MarkerClusterGroup */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={80}
        disableClusteringAtZoom={12}
      >
        {incidentsWithCoords.map((incident, idx) => {
          // Create a simple Leaflet circle marker
          const circleMarker = L.circleMarker(
            [incident.latitude, incident.longitude],
            {
              radius: 8,
              fillColor: getSeverityColor(incident.severity),
              color: "#fff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }
          );

          // Bind popup
          const popupContent = `
            <div style="min-width: 200px; font-family: sans-serif;">
              <strong style="font-size: 14px; color: #1e293b;">
                ${incident.type?.replace("_", " ").toUpperCase()}
              </strong>
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>District:</strong> ${incident.district}
                ${incident.region ? ` - ${incident.region}` : ""}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Location:</strong> ${incident.location || incident.district}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Severity:</strong> 
                <span style="color: ${getSeverityColor(
                  incident.severity
                )}; font-weight: bold; text-transform: uppercase;">
                  ${incident.severity}
                </span>
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Affected:</strong> ${
                  incident.households ||
                  incident.numberOfHouseholdsAffected ||
                  "N/A"
                } households
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> ${incident.status || "reported"}
              </p>
              ${
                incident.damages
                  ? `<p style="margin: 4px 0; font-size: 11px; color: #64748b;">
                      ${incident.damages.substring(0, 80)}...
                    </p>`
                  : ""
              }
            </div>
          `;

          circleMarker.bindPopup(popupContent);

          // Bind tooltip
          const tooltipText = `${incident.type?.replace("_", " ")} - ${incident.district}${
            incident.region ? ` (${incident.region})` : ""
          }`;
          circleMarker.bindTooltip(tooltipText, { direction: "top", offset: [0, -10] });

          return circleMarker;
        })}
      </MarkerClusterGroup>

      {/* DEBUG PANEL */}
      <div
        style={{
          position: "fixed",
          top: "70px",
          right: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "12px 16px",
          borderRadius: "8px",
          zIndex: 500,
          fontSize: "12px",
          fontWeight: "600",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        <div style={{ color: incidentsWithCoords.length > 0 ? "#22C55E" : "#EF4444" }}>
          📌 Markers: {incidentsWithCoords.length}
        </div>
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
          Total: {incidentsData.length}
        </div>
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
          Clusters: Auto
        </div>
      </div>
    </>
  );
};

/**
 * ============================================
 * MAPPAGE COMPONENT
 * ============================================
 */
const MapPage = () => {
  const [incidentsData, setIncidentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All Severity");
  const [currentYearOnly, setCurrentYearOnly] = useState(true);

  const [mapKey, setMapKey] = useState(0); // Force re-render with key

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

      // Deduplicate by _id only
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
      console.log(`✅ Total incidents to render: ${list.length}`);

      if (list.length > 0) {
        console.log("📍 Sample incident data:");
        list.slice(0, 3).forEach((inc, i) => {
          console.log(
            `  [${i}] District: "${inc.district}" | Type: "${inc.type}" | Severity: "${inc.severity}"`
          );
        });
      } else {
        console.warn("⚠️  NO INCIDENTS FOUND - Check API endpoints and database!");
      }

      setIncidentsData(list);
      // Force map re-render by updating key
      setMapKey((k) => k + 1);
    } catch (err) {
      console.error("❌ Error fetching map data:", err);
      setError("Failed to load map data");
      setIncidentsData([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup polling with LONGER interval (10sec) to avoid breaking map
   */
  useEffect(() => {
    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      console.log("🔄 MapPage polling for updates...");
      fetchData();
    }, 10000); // 10 seconds - longer than 5s to prevent map interference

    return () => {
      console.log("🛑 MapPage cleanup: stopping polling interval");
      clearInterval(interval);
    };
  }, []);

  /* ===================== FILTERING ===================== */

  const filteredIncidents = incidentsData.filter((incident) => {
    const districtMatch =
      selectedDistrict === "All Districts" ||
      normalize(incident.district) === normalize(selectedDistrict);
    const typeMatch =
      selectedType === "All" || normalizeType(incident.type) === selectedType;
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

    if (filteredIncidents.length === 0 && incidentsData.length > 0) {
      console.warn("⚠️  Filter removed all incidents! Check filter settings.");
    }
  }, [
    filteredIncidents.length,
    selectedDistrict,
    selectedType,
    selectedSeverity,
    incidentsData.length,
  ]);

  /**
   * Prepare incidents with district-based coordinates
   */
  const incidentsWithCoords = filteredIncidents.map((incident, idx) => {
    const coords = getIncidentCoordinates(incident);

    if (idx < 3) {
      console.log(`📌 Incident ${idx}: "${incident.district}" → [${coords[0]}, ${coords[1]}]`);
    }

    return {
      ...incident,
      latitude: coords[0],
      longitude: coords[1],
    };
  });

  if (incidentsWithCoords.length > 0) {
    console.log(`✅ RENDERING ${incidentsWithCoords.length} markers on map`);
  }

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

    const severityCounts = {
      high: incidents.filter((i) => {
        const sev = normalizeSeverity(i.severity);
        return sev === "critical" || sev === "high";
      }).length,
      moderate: incidents.filter((i) => {
        const sev = normalizeSeverity(i.severity);
        return sev === "medium" || sev === "moderate";
      }).length,
      low: incidents.filter((i) => normalizeSeverity(i.severity) === "low").length,
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

        {/* KEY is critical - forces map to remount and resize properly */}
        <MapContainer
          key={`map-${mapKey}`}
          center={[-29.6, 28.2]}
          zoom={8}
          minZoom={7}
          maxBounds={[[-30.9, 26.7], [-28.3, 29.5]]}
          maxBoundsViscosity={1.0}
          className="map-leaflet-container"
        >
          <MapContent
            incidentsWithCoords={incidentsWithCoords}
            incidentsData={incidentsData}
            styleDistrict={styleDistrict}
            onEachDistrict={onEachDistrict}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
