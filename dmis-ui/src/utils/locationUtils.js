/**
 * Shared location utilities for Lesotho district-level mapping
 * Used by MapPage and MapView components
 */

/**
 * Normalize district names for consistent lookups
 * - Convert to lowercase
 * - Remove spaces, apostrophes, and hyphens
 * @param {string} value - District name to normalize
 * @returns {string} - Normalized district name
 */
export const normalize = (value) => {
  if (!value) return "";
  return value.toLowerCase().replace(/['\s-]/g, "").trim();
};

/**
 * Accurate district center coordinates for Lesotho
 * These coordinates MUST match the official administrative district centers
 * Keys are normalized district names (lowercase, no spaces/apostrophes/hyphens)
 * 
 * CRITICAL: Clustering algorithm will handle marker overlap
 * All coordinates are EXACT district centers - NO OFFSETS
 */
export const districtCoordinates = {
  maseru: [-29.3100, 27.4800],
  berea: [-29.2000, 27.9300],
  leribe: [-28.8700, 28.0500],
  buthabuthe: [-28.7700, 28.2500],
  mokhotlong: [-29.2900, 29.0600],
  thabatseka: [-29.5200, 28.6200],
  qachasnek: [-30.1200, 28.6900],
  quthing: [-30.4000, 27.7000],
  mohaleshoek: [-30.1600, 27.4800],
  mafeteng: [-29.8200, 27.2500],
};

/**
 * Get coordinates for an incident using district-level mapping
 * Always ignores incident.latitude and incident.longitude
 * Returns ONLY the district center coordinate - clustering handles overlap
 * @param {object} incident - The incident/disaster object
 * @returns {array} - [latitude, longitude] coordinates
 */
export const getIncidentCoordinates = (incident) => {
  if (!incident || !incident.district) {
    console.warn("❌ Incident missing district information");
    return [-29.6, 28.2]; // Fallback center of Lesotho
  }

  const normalizedDistrict = normalize(incident.district);
  const coords = districtCoordinates[normalizedDistrict];

  if (!coords) {
    console.warn(
      `⚠️  Unknown district: "${incident.district}" (normalized: "${normalizedDistrict}") - ${
        incident.type || "unknown type"
      }`
    );
    return [-29.6, 28.2]; // Fallback center of Lesotho
  }

  return coords;
};

/**
 * DEPRECATED: Use clustering instead of offset logic
 * 
 * Marker clustering (via react-leaflet-cluster) now handles overlapping markers.
 * No offset is needed - all markers use exact district center coordinates.
 * 
 * Kept for backwards compatibility only.
 */
export const addRandomOffset = (baseCoords) => baseCoords;

/**
 * Helper to normalize disaster type names
 * @param {string} value - Type name to normalize
 * @returns {string} - Normalized type (lowercase, underscores for spaces)
 */
export const normalizeType = (value) =>
  (value || "").toString().toLowerCase().replace(/[\s-]+/g, "_").trim();

/**
 * Helper to normalize severity levels
 * @param {string} value - Severity level to normalize
 * @returns {string} - Normalized severity (lowercase)
 */
export const normalizeSeverity = (value) =>
  (value || "").toString().toLowerCase().trim();

/**
 * Get color for severity level
 * @param {string} severity - Severity level
 * @returns {string} - Hex color code
 */
export const getSeverityColor = (severity) => {
  const sev = normalizeSeverity(severity);
  if (sev === "critical" || sev === "high") return "#EF4444"; // red
  if (sev === "moderate" || sev === "medium") return "#F97316"; // orange
  if (sev === "low") return "#22C55E"; // green
  return "#E5E7EB"; // gray for unknown
};

/**
 * Extract a valid date from a disaster using fallback priority
 * Priority: createdAt > date > updatedAt > ObjectId timestamp
 * @param {object} disaster - The disaster object
 * @returns {Date} - Valid date object
 */
export const getDisasterDate = (disaster) => {
  if (!disaster) return new Date();

  // Try createdAt first (most reliable)
  if (disaster.createdAt) {
    return new Date(disaster.createdAt);
  }

  // Fall back to date field
  if (disaster.date) {
    return new Date(disaster.date);
  }

  // Fall back to updatedAt
  if (disaster.updatedAt) {
    return new Date(disaster.updatedAt);
  }

  // Fall back to ObjectId timestamp (first 8 hex chars = timestamp in seconds)
  if (disaster._id) {
    try {
      const timestamp = parseInt(disaster._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp);
    } catch (e) {
      console.warn("Could not extract timestamp from _id:", disaster._id);
    }
  }

  // Last resort - return current date
  return new Date();
};

/**
 * Assign disaster IDs to a list of disasters
 * Sorts by date (ascending), then assigns sequential IDs: D-YYYY-NNN
 * @param {array} disasters - Array of disaster objects
 * @returns {array} - Disasters with assigned IDs in disasterCode field
 */
export const assignDisasterIds = (disasters) => {
  if (!Array.isArray(disasters) || disasters.length === 0) {
    return disasters;
  }

  // Create a copy to avoid mutating the original array
  const disastersWithDates = disasters.map((d) => ({
    ...d,
    _sortDate: getDisasterDate(d),
  }));

  // Sort by date ascending (earliest first)
  disastersWithDates.sort((a, b) => a._sortDate - b._sortDate);

  // Group by year and assign sequential IDs
  const yearMap = {};

  const result = disastersWithDates.map((disaster) => {
    const year = disaster._sortDate.getFullYear();

    // Initialize year counter if needed
    if (!yearMap[year]) {
      yearMap[year] = 0;
    }

    // Increment counter for this year
    yearMap[year]++;

    // Generate ID: D-YYYY-NNN (zero-padded to 3 digits)
    const sequenceNumber = String(yearMap[year]).padStart(3, "0");
    const generatedId = `D-${year}-${sequenceNumber}`;

    // Use generated ID unless disasterCode already exists and is valid
    return {
      ...disaster,
      disasterCode: disaster.disasterCode || generatedId,
    };
  });

  return result;
};

/**
 * Get the disaster ID for display
 * Returns disasterCode if available, otherwise generates one
 * @param {object} disaster - The disaster object
 * @returns {string} - Disaster ID (e.g., "D-2026-001")
 */
export const getDisasterId = (disaster) => {
  if (!disaster) return "D-UNKNOWN";
  
  // If disasterCode is set, use it
  if (disaster.disasterCode) {
    return disaster.disasterCode;
  }

  // Generate ID using date fallback logic
  const date = getDisasterDate(disaster);
  const year = date.getFullYear();
  // Note: This is a fallback - in production, use assignDisasterIds for consistent numbering
  return `D-${year}-UNK`;
};

export default {
  normalize,
  districtCoordinates,
  getIncidentCoordinates,
  addRandomOffset,
  normalizeType,
  normalizeSeverity,
  getSeverityColor,
  getDisasterDate,
  assignDisasterIds,
  getDisasterId,
};
