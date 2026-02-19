// src/components/MapView.jsx
import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import lesothoDistricts from "../data/gadm41_LSO_1.json";

export default function MapView({ disasters, selectedDisaster }) {
  const [selectedType, setSelectedType] = useState("All");

  const validDisasters = disasters.filter(
    d => d.latitude != null && d.longitude != null
  );

  const defaultCenter = validDisasters.length
    ? [validDisasters[0].latitude, validDisasters[0].longitude]
    : [-29.61, 28.23]; // Lesotho center

  const getSeverityColor = (severity) => {
    switch ((severity || "").toString().toLowerCase().trim()) {
      case "low": return "#22C55E";       // green (low)
      case "medium": return "#F97316";    // orange (medium)
      case "high": return "#EF4444";      // red (high)
      default: return "#E5E7EB";
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

  // Enhanced normalize function to match district names (same as GIS Map page)
  const normalize = (value) => {
    if (!value) return "";
    return value
      .toLowerCase()
      .replace(/['\s-]/g, "")  // Remove apostrophes, spaces, and hyphens
      .trim();
  };

  const styleDistrict = (feature) => {
    const districtName = feature.properties.NAME_1;
    const normalizedGeoDistrict = normalize(districtName);

    // Find matching disasters for this district
    const matchingDisasters = validDisasters.filter(
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

    const incidents = validDisasters.filter(
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

  // Filter disasters by selected type
  const filteredDisasters = selectedType === "All" 
    ? validDisasters 
    : validDisasters.filter(d => normalizeType(d.type) === selectedType);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden flex flex-col">
      {/* Filter Controls */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2 items-center flex-wrap">
        <label className="text-xs font-medium text-muted">Filter:</label>
        <button
          onClick={() => setSelectedType("All")}
          className={`px-3 py-1 text-xs rounded font-medium transition ${
            selectedType === "All"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-muted hover:bg-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedType("drought")}
          className={`px-3 py-1 text-xs rounded font-medium transition ${
            selectedType === "drought"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-muted hover:bg-slate-200"
          }`}
        >
          Drought
        </button>
        <button
          onClick={() => setSelectedType("heavy_rainfall")}
          className={`px-3 py-1 text-xs rounded font-medium transition ${
            selectedType === "heavy_rainfall"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-muted hover:bg-slate-200"
          }`}
        >
          Heavy Rainfall
        </button>
        <button
          onClick={() => setSelectedType("strong_winds")}
          className={`px-3 py-1 text-xs rounded font-medium transition ${
            selectedType === "strong_winds"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-muted hover:bg-slate-200"
          }`}
        >
          Strong Winds
        </button>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* District GeoJSON Overlay */}
          <GeoJSON
            data={lesothoDistricts}
            style={styleDistrict}
            onEachFeature={onEachDistrict}
          />

          {/* Incident Markers */}
          {filteredDisasters.map((incident, idx) => (
            <CircleMarker
              key={incident._id || idx}
              center={[incident.latitude, incident.longitude]}
              radius={6}
              fillColor={getSeverityColor(incident.severity)}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div style={{ minWidth: "180px" }}>
                  <strong style={{ fontSize: "13px", color: "#1e293b" }}>
                    {incident.type?.replace("_", " ").toUpperCase()}
                  </strong>
                  <hr style={{ margin: "5px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                  <p style={{ margin: "3px 0", fontSize: "11px" }}>
                    <strong>District:</strong> {incident.district}
                    {incident.region && <span> - {incident.region}</span>}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "11px" }}>
                    <strong>Severity:</strong>{" "}
                    <span style={{ 
                      color: getSeverityColor(incident.severity),
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}>
                      {incident.severity}
                    </span>
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "11px" }}>
                    <strong>Households:</strong> {incident.households || "N/A"}
                  </p>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -8]}>
                {incident.district}
                {incident.region && ` (${incident.region})`} - {incident.severity}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
