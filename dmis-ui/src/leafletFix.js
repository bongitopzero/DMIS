import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export const severityColor = (sev) => {
  switch (sev?.toLowerCase()) {
    case "critical": return getComputedStyle(document.documentElement).getPropertyValue("--sev-critical").trim();
    case "high": return getComputedStyle(document.documentElement).getPropertyValue("--sev-high").trim();
    case "medium": return getComputedStyle(document.documentElement).getPropertyValue("--sev-medium").trim();
    case "low": return getComputedStyle(document.documentElement).getPropertyValue("--sev-low").trim();
    default: return "#888";
  }
};

// Create a Leaflet circle marker with severity color
export const createSeverityMarker = (latlng, severity) => {
  return L.circleMarker(latlng, {
    radius: 8,
    color: severityColor(severity),
    fillColor: severityColor(severity),
    fillOpacity: 0.8,
    weight: 1,
  });
};