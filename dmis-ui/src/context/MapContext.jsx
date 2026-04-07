import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

/**
 * ============================================
 * MAP CONTEXT
 * ============================================
 * Shared context for synchronized map data between Dashboard and GIS Map
 * Provides: disasters/incidents data, filters, summaries
 */
const MapContext = createContext();

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within MapProvider");
  }
  return context;
};

/**
 * MapProvider Component
 * Wraps the app to provide shared map data
 */
export const MapProvider = ({ children }) => {
  // ==================== STATE ====================
  const [incidentsData, setIncidentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Filters - shared across all maps
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All Severity");
  const [currentYearOnly, setCurrentYearOnly] = useState(false); // DISABLED - show all years

  // ==================== FETCH DATA ====================
  const fetchIncidents = useCallback(async () => {
    try {
      setError("");
      
      // Fetch from /disasters endpoint (only source needed)
      const response = await API.get("/disasters");
      const disasters = Array.isArray(response.data) ? response.data : [];

      let list = disasters;

      // Filter by current year if enabled
      if (currentYearOnly) {
        const year = new Date().getFullYear();
        list = list.filter((item) => {
          const dateField = item.date || item.createdAt || item.occurrenceDate;
          if (!dateField) return false;
          const d = new Date(dateField);
          return d && d.getFullYear() === year;
        });
      }

      console.log(
        `📊 MapContext: Fetched ${disasters.length} disasters → ${list.length} after year filter`
      );

      setIncidentsData(list);
      setLastFetchTime(new Date());
      setLoading(false);
    } catch (err) {
      console.error("❌ MapContext Error fetching data:", err);
      setError("Failed to load map data");
      setLoading(false);
    }
  }, [currentYearOnly]);

  // ==================== POLLING ====================
  useEffect(() => {
    console.log("🔄 MapContext: Initial fetch");
    fetchIncidents();

    const interval = setInterval(() => {
      console.log("🔄 MapContext: Polling for updates...");
      fetchIncidents();
    }, 10000); // 10 seconds - synced across all maps

    return () => {
      clearInterval(interval);
    };
  }, [fetchIncidents]);

  // ==================== CONTEXT VALUE ====================
  const value = {
    // Data
    incidentsData,
    loading,
    error,
    lastFetchTime,

    // Filters
    selectedDistrict,
    setSelectedDistrict,
    selectedType,
    setSelectedType,
    selectedSeverity,
    setSelectedSeverity,
    currentYearOnly,
    setCurrentYearOnly,

    // Actions
    refetch: fetchIncidents,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};
