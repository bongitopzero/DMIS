import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../leafletFix";
import API from "../api/axios";
import "./MapPage.css";

import lesothoDistricts from "../data/gadm41_LSO_1.json";

const MapPage = () => {
  const [incidentsData, setIncidentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedType, setSelectedType] = useState("All");

  const disasterTypes = ["drought", "heavy_rainfall", "strong_winds"];

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
    "Thaba-Tseka"
  ];

  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/disasters");
      setIncidentsData(res.data);
    } catch (err) {
      setError("Failed to load disasters");
      setIncidentsData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== HELPERS ===================== */

  const normalize = (value) =>
    value?.toLowerCase().replace(/['-]/g, "").trim();

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F97316";
      case "low":
        return "#22C55E";
      default:
        return "#E5E7EB";
    }
  };

  /* ===================== DISTRICT STYLING ===================== */

  const styleDistrict = (feature) => {
    const districtName = feature.properties.NAME_1;

    const match = incidentsData.find(
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

    const incidents = incidentsData.filter(
      (i) => normalize(i.district) === normalize(districtName)
    );

    layer.bindPopup(`
      <strong>${districtName}</strong><br/>
      Incidents: ${incidents.length}
    `);
  };

  /* ===================== FILTERING ===================== */

  const filteredIncidents = incidentsData.filter((incident) => {
    const districtMatch =
      selectedDistrict === "All Districts" || incident.district === selectedDistrict;
    const typeMatch = selectedType === "All" || incident.type === selectedType;
    return districtMatch && typeMatch;
  });

  // District coordinates mapping
  const districtCoordinates = {
    "berea": [-29.3, 28.3],
    "buthabuthe": [-28.8, 28.2],
    "butha-buthe": [-28.8, 28.2],
    "leribe": [-28.9, 28.0],
    "mafeteng": [-29.8, 27.5],
    "maseru": [-29.31, 27.48],
    "mohale's hoek": [-30.1, 27.5],
    "mohaleshoek": [-30.1, 27.5],
    "mokhotlong": [-29.3, 29.1],
    "qacha's nek": [-30.1, 28.7],
    "qachasnek": [-30.1, 28.7],
    "quthing": [-30.4, 27.7],
    "thaba-tseka": [-29.5, 28.6],
    "thabatseka": [-29.5, 28.6],
  };

  // Prepare incidents with coordinates
  const incidentsWithCoords = filteredIncidents.map((incident) => {
    const normalizedDistrict = normalize(incident.district);
    const coords = districtCoordinates[normalizedDistrict] || [-29.6, 28.3];
    
    return {
      ...incident,
      latitude: incident.latitude || coords[0] + (Math.random() - 0.5) * 0.1,
      longitude: incident.longitude || coords[1] + (Math.random() - 0.5) * 0.1,
    };
  });

  return (
    <div className="gis-map-page">
      <div className="gis-controls">
        <h3>Map Summary</h3>

        <button onClick={fetchDisasters} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>

        {error && <div className="error-message">{error}</div>}

        <label>Filter by District</label>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <h4>Disaster Types</h4>
        <label>
          <input
            type="radio"
            value="All"
            checked={selectedType === "All"}
            onChange={(e) => setSelectedType(e.target.value)}
          />
          All
        </label>

        {disasterTypes.map((type) => (
          <label key={type}>
            <input
              type="radio"
              value={type}
              checked={selectedType === type}
              onChange={(e) => setSelectedType(e.target.value)}
            />
            {type.replace("_", " ")}
          </label>
        ))}
      </div>

      <div className="map-container">
        <MapContainer
          center={[-29.6, 28.3]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* District GeoJSON Overlay */}
          <GeoJSON
            data={lesothoDistricts}
            style={styleDistrict}
            onEachFeature={onEachDistrict}
          />

          {/* Incident Markers */}
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
                  <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>District:</strong> {incident.district}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Location:</strong> {incident.location}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Severity:</strong>{" "}
                    <span style={{ 
                      color: getSeverityColor(incident.severity),
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}>
                      {incident.severity}
                    </span>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <strong>Affected:</strong> {incident.households || "N/A"} households
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
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
