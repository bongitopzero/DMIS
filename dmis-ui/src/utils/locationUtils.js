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
 * District center coordinates for Lesotho
 * All 10 districts mapped with accurate center coordinates
 * Keys are normalized district names (lowercase, no spaces/apostrophes/hyphens)
 * 
 * NOTE: These are VERIFIED accurate coordinates for Lesotho districts.
 * CRITICAL: These are the ONLY source of truth for marker placement.
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

export default {
  normalize,
  districtCoordinates,
  getIncidentCoordinates,
  addRandomOffset,
  normalizeType,
  normalizeSeverity,
  getSeverityColor,
};
