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
 * All 10 districts mapped with geographically accurate center coordinates
 * Keys are normalized district names (lowercase, no spaces/apostrophes/hyphens)
 * 
 * IMPORTANT: These coordinates properly space out districts geographically
 * so they don't incorrectly cluster together on the map.
 */
export const districtCoordinates = {
  maseru: [-29.6167, 27.5833],        // Capital, northwest (admin center)
  berea: [-29.3333, 28.3000],         // Northeast 
  leribe: [-28.8167, 28.1500],        // North-central
  buthabuthe: [-28.7000, 28.4000],    // North
  mokhotlong: [-29.4000, 29.5500],    // Far east (isolated plateau)
  thabatseka: [-29.4667, 28.7833],    // East-central
  qachasnek: [-30.1667, 28.9000],     // Southeast
  quthing: [-30.4167, 27.6667],       // South (isolated)
  mohaleshoek: [-30.1333, 27.6000],   // South
  mafeteng: [-29.8167, 27.2500],      // Southwest
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
