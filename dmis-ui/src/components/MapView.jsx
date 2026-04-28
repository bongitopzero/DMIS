// src/components/MapView.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import lesothoDistricts from "../data/gadm41_LSO_1.json";
import {
  getIncidentCoordinates,
  getSeverityColor,
} from "../utils/locationUtils";
import { useMapResize } from "../hooks/useMapResize";

/**
 * Fix Leaflet marker icons in bundlers
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
const MapViewContent = ({ disasters, selectedDisaster, styleDistrict }) => {
  useMapResize();

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <GeoJSON data={lesothoDistricts} style={styleDistrict} />

      {/* CLUSTERING: Wrap markers in MarkerClusterGroup */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={80}
        disableClusteringAtZoom={12}
      >
        {disasters.map((incident, idx) => {
          const coords = getIncidentCoordinates(incident);
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
                  <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
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
      </MarkerClusterGroup>
    </>
  );
};

/**
 * MapView Component
 */
export default function MapView({ disasters, selectedDisaster }) {
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (disasters && disasters.length > 0) {
      console.log(`📍 MapView rendering ${disasters.length} disasters`);
      disasters.slice(0, 2).forEach((d, i) => {
        const coords = getIncidentCoordinates(d);
        console.log(`  [${i}] ${d.district} → [${coords[0]}, ${coords[1]}]`);
      });
      setMapKey((k) => k + 1);
    } else {
      console.warn("⚠️  MapView: No disasters provided!");
    }
  }, [disasters]);

  const styleDistrict = (feature) => ({
    fill: false,
    fillOpacity: 0,
    weight: 0.5,
    opacity: 0.3,
    color: "#ccc",
  });

  if (!disasters || disasters.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <p style={{ color: "#64748b", fontSize: "14px" }}>No disasters to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full" key={mapKey}>
      <MapContainer
        center={[-29.6, 28.2]}
        zoom={8}
        minZoom={7}
        maxBounds={[[-31.0, 26.5], [-28.3, 30.0]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        className="map-leaflet-container"
      >
        <MapViewContent
          disasters={disasters}
          selectedDisaster={selectedDisaster}
          styleDistrict={styleDistrict}
        />
      </MapContainer>
    </div>
  );
}