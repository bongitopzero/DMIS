import React from "react";
import { AlertCircle, Cloud, Wind } from "lucide-react";

export default function RecentDisasters({
  disasters,
  selectedDisaster,
  onSelectDisaster,
}) {
  const recent = [...disasters]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "low":
        return { bg: "#E8F5E9", text: "#4E8A64", badge: "bg-low" };
      case "medium":
        return { bg: "#FFF3E0", text: "#C9A227", badge: "bg-moderate" };
      case "high":
        return { bg: "#FFEBEE", text: "#B94A48", badge: "bg-critical" };
      default:
        return { bg: "#F5F5F5", text: "#666", badge: "bg-slate-400" };
    }
  };

  const getDisasterIcon = (type) => {
    if (type?.includes("rain")) return <Cloud className="w-5 h-5" />;
    if (type?.includes("wind")) return <Wind className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      high: { label: "Critical", color: "bg-critical text-white" },
      medium: { label: "Warning", color: "bg-moderate text-white" },
      low: { label: "Moderate", color: "bg-low text-white" },
    };
    return badges[severity?.toLowerCase()] || { label: severity, color: "bg-slate-400 text-white" };
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {recent.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No recent incidents</p>
      ) : (
        recent.map((disaster) => {
          const isSelected = selectedDisaster?._id === disaster._id;
          const colors = getSeverityColor(disaster.severity);
          const badge = getSeverityBadge(disaster.severity);

          return (
            <div
              key={disaster._id}
              onClick={() => onSelectDisaster(disaster)}
              className={`p-3 rounded-lg cursor-pointer transition border-l-4 ${
                isSelected
                  ? "bg-red-50 border-critical shadow-sm"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: colors.bg }}
                >
                  <div style={{ color: colors.text }}>{getDisasterIcon(disaster.type)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-text truncate">
                      {disaster.type?.replace(/_/g, " ")} - {disaster.district}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {disaster.affectedPopulation?.toLocaleString() || 0} affected
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
