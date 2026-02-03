import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet";
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
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
