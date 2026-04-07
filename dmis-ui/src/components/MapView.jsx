// src/components/MapView.jsx
import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import lesothoDistricts from "../data/gadm41_LSO_1.json";

// Lesotho district center coordinates for disasters without lat/lng
// Complete mapping of all 10 Lesotho districts with precise center coordinates
const DISTRICT_COORDINATES = {
  "maseru": [-29.6100, 27.5500],
  "berea": [-29.4800, 28.3400],
  "leribe": [-29.6500, 28.0600],
  "butha-buthe": [-29.3100, 28.4600],
  "mokhotlong": [-29.0800, 28.9100],
  "thaba-tseka": [-29.6400, 28.6400],
  "qacha's nek": [-30.2700, 28.6400],
  "quthing": [-30.5500, 27.7200],
  "mohale's hoek": [-30.1950, 27.6650],
  "mafeteng": [-29.8200, 27.2800],
};
export default function MapView({ disasters, selectedDisaster }) {
  const getSeverityColor = (severity) => {
    const sev = (severity || "").toLowerCase().trim();
    if (sev === "critical" || sev === "high") return "#EF4444";      // red
    if (sev === "moderate" || sev === "medium") return "#F97316";    // orange
    if (sev === "low") return "#22C55E";                              // green
    return "#E5E7EB"; // gray for unknown
  };

  const getDisasterCoordinates = (disaster) => {
    if (disaster.latitude != null && disaster.longitude != null) {
      return [disaster.latitude, disaster.longitude];
    }
    const districtKey = (disaster.district || "").toLowerCase().trim();
    const coords = DISTRICT_COORDINATES[districtKey];
    if (!coords) {
      console.warn(`❌ No mapping for district: "${disaster.district}" (${disaster.type})`);
    }
    return coords || [-29.61, 28.23];
  };

  const styleDistrict = (feature) => {
    return {
      fill: false,
      fillOpacity: 0,
      weight: 0.5,
      opacity: 0.3,
      color: "#ccc"
    };
  };

  useEffect(() => {
    console.log(`📍 MapView rendering ${disasters.length} disasters`);
  }, [disasters.length]);

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[-29.6, 28.2]}
        zoom={8}
        minZoom={7}
        maxBounds={[[-30.9, 26.7], [-28.3, 29.5]]}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* District GeoJSON Outline */}
        <GeoJSON
          data={lesothoDistricts}
          style={styleDistrict}
        />

        {/* Disaster Markers */}
        {disasters.map((incident, idx) => {
          const coords = getDisasterCoordinates(incident);
          const isSelected = selectedDisaster?._id === incident._id;
          const occurrenceDate = incident.occurrenceDate ? new Date(incident.occurrenceDate).toLocaleDateString() : "N/A";
          
          return (
            <CircleMarker
              key={incident._id || idx}
              center={coords}
              radius={isSelected ? 8 : 6}
              fillColor={getSeverityColor(incident.severity)}
              color="#fff"
              weight={isSelected ? 3 : 2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div style={{ minWidth: "200px", fontFamily: "sans-serif" }}>
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                    {incident.type?.replace(/_/g, " ").toUpperCase()}
                  </strong>
                  <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>District:</strong> {incident.district}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Severity:</strong>{" "}
                    <span style={{ 
                      color: getSeverityColor(incident.severity),
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}>
                      {incident.severity}
                    </span>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Date:</strong> {occurrenceDate}
                  </p>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -8]}>
                {incident.type?.replace(/_/g, " ")} - {incident.district}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}