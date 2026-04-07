// src/components/MapView.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import lesothoDistricts from "../data/gadm41_LSO_1.json";
import {
  getIncidentCoordinates,
  addRandomOffset,
  getSeverityColor,
} from "../utils/locationUtils";

/**
 * MapView Component
 * 
 * Displays a React Leaflet map with disaster incidents plotted at district level.
 * ALWAYS uses district-based coordinates, ignoring any lat/long from the database.
 * 
 * Props:
 *   - disasters: Array of disaster/incident objects to display
 *   - selectedDisaster: Currently selected disaster (for highlighting)
 */
export default function MapView({ disasters, selectedDisaster }) {
  const [renderKey, setRenderKey] = useState(0);

  /**
   * Log disasters count when component mounts or data changes
   */
  useEffect(() => {
    if (disasters && disasters.length > 0) {
      console.log(`📍 MapView rendering ${disasters.length} disasters`);
      // Force re-render by updating key
      setRenderKey((k) => k + 1);
    }
  }, [disasters.length]);

  /**
   * Get district styling for GeoJSON features
   */
  const styleDistrict = (feature) => ({
    fill: false,
    fillOpacity: 0,
    weight: 0.5,
    opacity: 0.3,
    color: "#ccc",
  });

  /**
   * Render map if we have disasters
   */
  if (!disasters || disasters.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <p style={{ color: "#64748b", fontSize: "14px" }}>No disasters to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full" key={renderKey}>
      <MapContainer
        center={[-29.6, 28.2]}
        zoom={8}
        minZoom={7}
        maxBounds={[[-30.9, 26.7], [-28.3, 29.5]]}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
      >
        {/* Base map tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* District GeoJSON Outline */}
        <GeoJSON data={lesothoDistricts} style={styleDistrict} />

        {/* Disaster Markers */}
        {disasters.map((incident, idx) => {
          // Get district-based coordinates (ignores database lat/long)
          const baseCoords = getIncidentCoordinates(incident);
          const coords = addRandomOffset(baseCoords, 0.015);

          const isSelected = selectedDisaster?._id === incident._id;
          const occurrenceDate = incident.occurrenceDate
            ? new Date(incident.occurrenceDate).toLocaleDateString()
            : incident.date
            ? new Date(incident.date).toLocaleDateString()
            : "N/A";

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
                  <hr
                    style={{
                      margin: "6px 0",
                      border: "none",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  />
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>District:</strong> {incident.district}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
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
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Date:</strong> {occurrenceDate}
                  </p>
                  {incident.location && (
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Location:</strong> {incident.location}
                    </p>
                  )}
                  {incident.households && (
                    <p style={{ margin: "4px 0", fontSize: "13px" }}>
                      <strong>Households:</strong> {incident.households}
                    </p>
                  )}
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