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
      <div style={{position: "fixed", top: "70px", right: "10px", background: "rgba(255,255,255,0.95)", padding: "12px", borderRadius: "8px", zIndex: 500, fontSize: "12px", fontFamily: "monospace"}}>
        📌 {incidentsWithCoords.length} markers | {incidentsData.length} total
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
    console.log("MapPage - Incidents:", incidentsData.length, "Loading:", loading);
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
    return { visibleEvents, activeEvents, totalAffected };
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
    layer.bindPopup(`<div style="font-family: sans-serif;"><strong>${districtName}</strong></div>`);
    layer.on("click", () => setSelectedDistrict(districtName));
  };

  // RENDER
  return (
    <div className="gis-map-page-new">
      {/* Sidebar */}
      <div className="map-sidebar">
        {/* Map Summary */}
        <div style={{ background: "white", padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin size={16} /> Map Summary
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>Visible Events</span>
              <span style={{ fontWeight: "700", fontSize: "16px", color: "#1f2937" }}>{summaries.visibleEvents}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>Active Events</span>
              <span style={{ fontWeight: "700", fontSize: "16px", color: "#EF4444" }}>{summaries.activeEvents}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>Total Affected</span>
              <span style={{ fontWeight: "700", fontSize: "16px", color: "#1f2937" }}>{summaries.totalAffected.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* FILTERS & LEGEND */}
        <div className="sidebar-content">
          {/* Filters Section */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "4px" }}>
              Filters
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>District</label>
                <select className="filter-select" value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "4px" }}>Severity</label>
                <select className="filter-select" value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)}>
                  <option value="All Severity">All Severity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Disaster Types */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "4px" }}>
              Disaster Types
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                <input type="checkbox" checked={selectedType === "All" || selectedType === "drought"} onChange={() => setSelectedType(selectedType === "drought" ? "All" : "drought")} style={{ cursor: "pointer" }} />
                Drought
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                <input type="checkbox" checked={selectedType === "All" || selectedType === "heavy_rainfall"} onChange={() => setSelectedType(selectedType === "heavy_rainfall" ? "All" : "heavy_rainfall")} style={{ cursor: "pointer" }} />
                Heavy Rainfall
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                <input type="checkbox" checked={selectedType === "All" || selectedType === "strong_winds"} onChange={() => setSelectedType(selectedType === "strong_winds" ? "All" : "strong_winds")} style={{ cursor: "pointer" }} />
                Strong Winds
              </label>
            </div>
          </div>

          {/* Severity Legend */}
          <div style={{ padding: "12px 14px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "#1f2937" }}>Severity Legend</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22C55E" }}></span>
                <span>Low</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#F97316" }}></span>
                <span>Medium</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#EF4444" }}></span>
                <span>High</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#DC2626" }}></span>
                <span>Critical</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAP - RIGHT */}
      <div className="map-container-full" style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
        {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, background: 'white', padding: '16px', borderRadius: '8px' }}>Loading...</div>}
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
  );
};

export default MapPage;
