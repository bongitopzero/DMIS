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
 * All 10 districts mapped with precise center coordinates
 * Keys are normalized district names (lowercase, no spaces/apostrophes/hyphens)
 */
export const districtCoordinates = {
  maseru: [-29.6100, 27.5500],
  berea: [-29.4800, 28.3400],
  leribe: [-29.6500, 28.0600],
  buthabuthe: [-29.3100, 28.4600],
  mokhotlong: [-29.0800, 28.9100],
  thabatseka: [-29.6400, 28.6400],
  qachasnek: [-30.2700, 28.6400],
  quthing: [-30.5500, 27.7200],
  mohaleshoek: [-30.1950, 27.6650],
  mafeteng: [-29.8200, 27.2800],
};

/**
 * Get coordinates for an incident using district-level mapping
 * Always ignores incident.latitude and incident.longitude
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
      `⚠️  District not found: "${incident.district}" (normalized: "${normalizedDistrict}") - ${incident.type || "unknown type"}`
    );
    return [-29.6, 28.2]; // Fallback center of Lesotho
  }

  return coords;
};

/**
 * Add small random offset to coordinates to prevent marker overlap
 * @param {array} baseCoords - [latitude, longitude] base coordinates
 * @param {number} maxOffset - Maximum offset in degrees (default: 0.015 ~= 1.5km)
 * @returns {array} - [latitude, longitude] with random offset applied
 */
export const addRandomOffset = (baseCoords, maxOffset = 0.015) => {
  if (!baseCoords || baseCoords.length !== 2) return baseCoords;
  
  const offsetLat = (Math.random() - 0.5) * maxOffset;
  const offsetLng = (Math.random() - 0.5) * maxOffset;

  return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
};

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
