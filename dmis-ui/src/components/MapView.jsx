// src/components/MapView.jsx
import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
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
        </MapContainer>
      </div>
    </div>
  );
}
