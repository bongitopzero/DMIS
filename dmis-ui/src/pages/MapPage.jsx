import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapPin } from "lucide-react";

// CSS imports
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../leafletFix";
import "./MapPage.css";

// Data and utils
import lesothoDistricts from "../data/gadm41_LSO_1.json";
import {
  normalize,
  getIncidentCoordinates,
  normalizeType,
  normalizeSeverity,
  getSeverityColor,
} from "../utils/locationUtils";
import { useMapResize } from "../hooks/useMapResize";
import { useMapContext } from "../context/MapContext";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/**
 * Inner map component with Leaflet content
 */
const MapContent = ({incidentsWithCoords, incidentsData, styleDistrict, onEachDistrict}) => {
  useMapResize();

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <GeoJSON data={lesothoDistricts} style={styleDistrict} onEachFeature={onEachDistrict} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={80} disableClusteringAtZoom={12}>
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
              <div style={{ minWidth: "200px", fontFamily: "sans-serif" }}>
                <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                  {incident.type?.replace("_", " ").toUpperCase()}
                </strong>
                <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                <p style={{ margin: "4px 0", fontSize: "12px" }}>
                  <strong>District:</strong> {incident.district}
                  {incident.region && <span> - {incident.region}</span>}
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px" }}>
                  <strong>Location:</strong> {incident.location || incident.district}
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px" }}>
                  <strong>Severity:</strong>
                  <span style={{color: getSeverityColor(incident.severity), fontWeight: "bold", textTransform: "uppercase"}}>
                    {incident.severity}
                  </span>
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px" }}>
                  <strong>Affected:</strong> {incident.households || incident.numberOfHouseholdsAffected || "N/A"} households
                </p>
                <p style={{ margin: "4px 0", fontSize: "12px" }}>
                  <strong>Status:</strong> {incident.status || "reported"}
                </p>
              </div>
            </Popup>
            <Tooltip>{incident.type?.replace("_", " ")} - {incident.district}</Tooltip>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
      {/* Debug info */}
      <div style={{position: "fixed", top: "70px", right: "10px", background: "rgba(255,255,255,0.95)", padding: "12px", borderRadius: "8px", zIndex: 500, fontSize: "12px", fontFamily: "monospace"}}>
        📌 {incidentsWithCoords.length} markers | Total: {incidentsData.length}
      </div>
    </>
  );
};

/**
 * Main GIS Map Page
 */
const MapPage = () => {
  // Get context data
  const {incidentsData, loading, error, selectedDistrict, setSelectedDistrict, selectedType, setSelectedType, selectedSeverity, setSelectedSeverity} = useMapContext();
  const [mapKey, setMapKey] = useState(0);

  // District list
  const districts = ["All Districts", "Berea", "Butha-Buthe", "Leribe", "Mafeteng", "Maseru", "Mohale's Hoek", "Mokhotlong", "Qacha's Nek", "Quthing", "Thaba-Tseka"];

  // Log when data changes
  useEffect(() => {
    console.log("MapPage mounted/updated - Incidents:", incidentsData.length, "Loading:", loading);
  }, [incidentsData, loading]);

  // CALCULATE FILTERED INCIDENTS
  const filteredIncidents = useMemo(() => {
    if (!incidentsData || !Array.isArray(incidentsData)) return [];
    return incidentsData.filter((incident) => {
      const districtMatch = selectedDistrict === "All Districts" || normalize(incident.district) === normalize(selectedDistrict);
      const typeMatch = selectedType === "All" || normalizeType(incident.type) === selectedType;
      const severityMatch = selectedSeverity === "All Severity" || normalizeSeverity(incident.severity) === selectedSeverity.toLowerCase();
      return districtMatch && typeMatch && severityMatch;
    });
  }, [incidentsData, selectedDistrict, selectedType, selectedSeverity]);

  // CALCULATE SUMMARIES
  const summaries = useMemo(() => {
    const visibleEvents = filteredIncidents.length;
    const activeEvents = filteredIncidents.filter(i => i.status === "reported" || i.status === "verified").length;
    const totalAffected = filteredIncidents.reduce((sum, i) => sum + (Number(i.households) || Number(i.numberOfHouseholdsAffected) || 0), 0);
    const totalResolved = filteredIncidents.filter(i => i.status === "closed").length;
    return { visibleEvents, activeEvents, totalAffected, totalResolved };
  }, [filteredIncidents]);

  // PREPARE INCIDENTS WITH COORDINATES
  const incidentsWithCoords = useMemo(() => {
    return filteredIncidents.map((incident) => ({
      ...incident,
      latitude: getIncidentCoordinates(incident)[0],
      longitude: getIncidentCoordinates(incident)[1],
    }));
  }, [filteredIncidents]);

  // DISTRICT STYLING AND INTERACTIONS
  const styleDistrict = (feature) => ({fill: false, fillOpacity: 0, weight: 0.5, opacity: 0.3, color: "#ccc"});

  const onEachDistrict = (feature, layer) => {
    const districtName = feature.properties.NAME_1;
    const normalizedGeoDistrict = normalize(districtName);
    const incidents = incidentsData.filter(i => normalize(i.district) === normalizedGeoDistrict);
    const severityCounts = {
      high: incidents.filter(i => {const sev = normalizeSeverity(i.severity); return sev === "critical" || sev === "high";}).length,
      moderate: incidents.filter(i => {const sev = normalizeSeverity(i.severity); return sev === "medium" || sev === "moderate";}).length,
      low: incidents.filter(i => normalizeSeverity(i.severity) === "low").length,
    };
    layer.bindPopup(`<div style="font-family: sans-serif;"><strong>${districtName}</strong><br/>Total: ${incidents.length}</div>`);
    layer.on("click", () => setSelectedDistrict(districtName));
  };

  // RENDER
  return (
    <div className="gis-map-page-new">
      {/* Header with summary cards */}
      <div className="gis-map-header">
        <div className="gis-map-title-section">
          <h1 className="gis-map-title">GIS Disaster Map</h1>
          <p className="gis-map-subtitle">Real-time disaster monitoring (synced with Dashboard)</p>
        </div>
        <div className="gis-summary-cards">
          <div className="gis-summary-card">
            <div className="gis-card-label">Visible Events</div>
            <div className="gis-card-value">{summaries.visibleEvents}</div>
            <div className="gis-card-detail">on map</div>
          </div>
          <div className="gis-summary-card">
            <div className="gis-card-label">Active Events</div>
            <div className="gis-card-value" style={{ color: "#EF4444" }}>{summaries.activeEvents}</div>
            <div className="gis-card-detail">requiring response</div>
          </div>
          <div className="gis-summary-card">
            <div className="gis-card-label">Total Affected</div>
            <div className="gis-card-value">{summaries.totalAffected.toLocaleString()}</div>
            <div className="gis-card-detail">households</div>
          </div>
          <div className="gis-summary-card">
            <div className="gis-card-label">Resolved</div>
            <div className="gis-card-value" style={{ color: "#22C55E" }}>{summaries.totalResolved}</div>
            <div className="gis-card-detail">incidents</div>
          </div>
        </div>
      </div>

      {/* Sidebar + Map */}
      <div className="gis-map-content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div className="map-sidebar">
          <div className="sidebar-header">
            <MapPin size={24} />
            <h2>Filters & Legend</h2>
          </div>
          <div className="sidebar-content">
            {/* Disaster Types */}
            <div className="sidebar-section">
              <h3 className="section-title">Disaster Types</h3>
              <div className="section-content">
                <div className="disaster-type-item">
                  <input type="checkbox" checked={selectedType === "All" || selectedType === "drought"} onChange={() => setSelectedType(selectedType === "drought" ? "All" : "drought")} id="type-drought" className="type-checkbox" />
                  <label htmlFor="type-drought">Drought</label>
                </div>
                <div className="disaster-type-item">
                  <input type="checkbox" checked={selectedType === "All" || selectedType === "flooding"} onChange={() => setSelectedType(selectedType === "flooding" ? "All" : "flooding")} id="type-rainfall" className="type-checkbox" />
                  <label htmlFor="type-rainfall">Heavy Rainfall</label>
                </div>
                <div className="disaster-type-item">
                  <input type="checkbox" checked={selectedType === "All" || selectedType === "strong_winds"} onChange={() => setSelectedType(selectedType === "strong_winds" ? "All" : "strong_winds")} id="type-winds" className="type-checkbox" />
                  <label htmlFor="type-winds">Strong Winds</label>
                </div>
              </div>
            </div>
            <div className="section-divider"></div>

            {/* District */}
            <div className="sidebar-section">
              <h3 className="section-title">District</h3>
              <select className="filter-select" value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="section-divider"></div>

            {/* Severity */}
            <div className="sidebar-section">
              <h3 className="section-title">Severity</h3>
              <select className="filter-select" value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)}>
                <option value="All Severity">All Severity</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="section-divider"></div>

            {/* Legend */}
            <div className="sidebar-section">
              <h3 className="section-title">Severity Legend</h3>
              <div className="section-content">
                <div className="legend-row"><span className="legend-dot" style={{ backgroundColor: "#22C55E" }}></span><span className="legend-label">Low Risk</span></div>
                <div className="legend-row"><span className="legend-dot" style={{ backgroundColor: "#F97316" }}></span><span className="legend-label">Moderate Risk</span></div>
                <div className="legend-row"><span className="legend-dot" style={{ backgroundColor: "#EF4444" }}></span><span className="legend-label">Critical Risk</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="map-container-full" style={{ flex: 1, height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
          {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }}>Loading...</div>}
          {error && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'red', zIndex: 100 }}>{error}</div>}
          <MapContainer
            key={`map-${mapKey}`}
            center={[-29.6, 28.2]}
            zoom={8}
            minZoom={7}
            className="map-leaflet-container"
            style={{ position: 'absolute', height: '100%', width: '100%', top: 0, left: 0, zIndex: 1 }}
          >
            <MapContent incidentsWithCoords={incidentsWithCoords} incidentsData={incidentsData} styleDistrict={styleDistrict} onEachDistrict={onEachDistrict} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
