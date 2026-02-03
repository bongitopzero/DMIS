// src/components/IncidentList.jsx
import React from "react";

export default function IncidentList({ disasters, selectedDisaster, onSelectDisaster }) {
  const recent = [...disasters]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {recent.length === 0 ? (
        <p className="text-sm text-muted m-0">No recent incidents</p>
      ) : (
        recent.map(d => {
          const isSelected = selectedDisaster?._id === d._id;

          return (
            <div
              key={d._id}
              onClick={() => onSelectDisaster(d)}
              className={`
                cursor-pointer
                border-l-4
                p-3
                rounded
                shadow-sm
                transition
                hover:bg-bg
                ${isSelected
                  ? "border-critical bg-critical/10"
                  : "border-primary bg-card"}
              `}
            >
              <p className="text-sm font-semibold text-text mb-1">
                {d.type.replace("_", " ")}
              </p>
              <p className="text-xs text-muted mb-1">
                <strong>{d.district}</strong>
              </p>
              <p className="text-xs text-muted">
                Severity: {d.severity} • Affected: {d.affectedPopulation}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
