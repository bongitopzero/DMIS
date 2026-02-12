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
    switch (severity?.toLowerCase()) {
      case "low": return "#22C55E";       // green (low)
      case "medium": return "#F97316";    // orange (medium)
      case "high": return "#EF4444";      // red (high)
      default: return "#E5E7EB";
    }
  };

  const normalize = (value) =>
    value?.toLowerCase().replace(/['-]/g, "").trim();

  const styleDistrict = (feature) => {
    const districtName = feature.properties.NAME_1;

    const match = validDisasters.find(
      (i) =>
        normalize(i.district) === normalize(districtName) &&
        (selectedType === "All" || i.type === selectedType)
    );

    return {
      fillColor: match ? getSeverityColor(match.severity) : "#E5E7EB",
      weight: 1.5,
      opacity: 1,
      color: "#1F2937",
      fillOpacity: match ? 0.7 : 0.4
    };
  };

  const onEachDistrict = (feature, layer) => {
    const districtName = feature.properties.NAME_1;

    const incidents = validDisasters.filter(
      (i) => normalize(i.district) === normalize(districtName)
    );

    layer.bindPopup(`
      <strong>${districtName}</strong><br/>
      Incidents: ${incidents.length}
    `);
  };

  // Filter disasters by selected type
  const filteredDisasters = selectedType === "All" 
    ? validDisasters 
    : validDisasters.filter(d => d.type === selectedType);

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
                {incident.district} - {incident.severity}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
