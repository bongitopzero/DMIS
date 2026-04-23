import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DISTRICTS = [
  "Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek",
  "Quthing", "Qacha's Nek", "Butha-Buthe", "Thaba-Tseka", "Mokhotlong",
];

const DISASTER_TYPES = ["Heavy Rainfall", "Strong Winds", "Drought"];
const SEVERITIES     = ["Low", "Moderate", "Critical"];
const SEASONS        = ["Summer", "Autumn", "Winter", "Spring"];

// Damage level options shown to the user
// These map directly to the avg_damage_level feature in the model
const DAMAGE_LEVELS = [
  { value: "1", label: "1 — Minor (house still habitable)" },
  { value: "2", label: "2 — Moderate (partial damage)" },
  { value: "3", label: "3 — Severe (roof destroyed / no water)" },
  { value: "4", label: "4 — Destroyed completely" },
];

const SEVERITY_MIN_HH = { Low: 10, Moderate: 51, Critical: 201 };

const fmtMaloti = (v) => `M ${Number(v).toLocaleString()}`;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — matches your DMIS design system exactly
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    padding: "24px",
    backgroundColor: "var(--bg-secondary)",
    minHeight: "100vh",
  },
  pageHeader: {
    marginBottom: "24px",
  },
  pageTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "var(--fs-h2)",
    fontWeight: "var(--fw-bold)",
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  pageDescription: {
    fontSize: "var(--fs-helper)",
    color: "var(--text-secondary)",
    margin: 0,
  },
  historyButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#1e3a5f",
    border: "1px solid #1e3a5f",
    borderRadius: "6px",
    fontSize: "var(--fs-button)",
    fontWeight: "var(--fw-medium)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s",
  },
  card: {
    backgroundColor: "var(--card-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px var(--card-shadow)",
  },
  cardHeader: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid var(--border-light)",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "var(--fs-h4)",
    fontWeight: "var(--fw-semibold)",
    color: "var(--text-primary)",
    margin: 0,
  },
  cardDescription: {
    fontSize: "var(--fs-helper)",
    color: "var(--text-secondary)",
    margin: "4px 0 0",
  },
  cardContent: {
    padding: "20px",
  },
  // 3-column grid for first row, 3-column for second row
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "var(--fs-label)",
    fontWeight: "var(--fw-medium)",
    color: "var(--text-primary)",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    fontSize: "var(--fs-input)",
    color: "var(--text-primary)",
    backgroundColor: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "6px",
    outline: "none",
    cursor: "pointer",
    appearance: "auto",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    fontSize: "var(--fs-input)",
    color: "var(--text-primary)",
    backgroundColor: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "6px",
    outline: "none",
  },
  helperText: {
    fontSize: "var(--fs-helper)",
    color: "var(--text-secondary)",
    margin: "4px 0 0",
  },
  buttonWrap: {
    display: "flex",
    alignItems: "flex-end",
  },
  button: {
    width: "100%",
    padding: "10px 20px",
    backgroundColor: "#1e3a5f",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "var(--fs-button)",
    fontWeight: "var(--fw-medium)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    backgroundColor: "#6c757d",
    cursor: "not-allowed",
  },
  resultCard: {
    backgroundColor: "var(--card-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px var(--card-shadow)",
  },
  resultContent: {
    padding: "32px 20px",
    textAlign: "center",
  },
  resultLabel: {
    fontSize: "var(--fs-helper)",
    fontWeight: "var(--fw-semibold)",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "0 0 8px",
  },
  resultAmount: {
    fontSize: "48px",
    fontWeight: "var(--fw-bold)",
    color: "#1e3a5f",
    margin: "0 0 16px",
    lineHeight: 1.1,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "8px",
  },
  badge: {
    padding: "4px 12px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "20px",
    fontSize: "var(--fs-badge)",
    color: "var(--text-primary)",
  },
  badgeCritical: {
    backgroundColor: "#fde8e8",
    border: "1px solid #f5c6c6",
    color: "#c0392b",
  },
  badgeModerate: {
    backgroundColor: "#fff3cd",
    border: "1px solid #ffc107",
    color: "#856404",
  },
  badgeLow: {
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    color: "#155724",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Forecasting = () => {
  const navigate = useNavigate();

  const [disasterType,    setDisasterType]    = useState("");
  const [district,        setDistrict]        = useState("");
  const [severity,        setSeverity]        = useState("");
  const [season,          setSeason]          = useState("");
  const [households,      setHouseholds]      = useState("");
  const [avgDamageLevel,  setAvgDamageLevel]  = useState("");   // ← new field
  const [loading,         setLoading]         = useState(false);
  const [latestResult,    setLatestResult]    = useState(null);
  const [error,           setError]           = useState("");

  // Helper to get auth token from localStorage
  const getAuthToken = () => {
    try {
      const userStr  = localStorage.getItem("user");
      if (!userStr) return null;
      const userData = JSON.parse(userStr);
      return userData.token || null;
    } catch (e) {
      console.error("Failed to get auth token:", e);
      return null;
    }
  };

  const minHH = SEVERITY_MIN_HH[severity] ?? 1;

  const handleSeverityChange = (e) => {
    const value = e.target.value;
    setSeverity(value);
    const min = SEVERITY_MIN_HH[value];
    if (Number(households) < min) setHouseholds(String(min));
  };

  const handleGenerate = async () => {
    setError("");

    // Validate all fields including the new avgDamageLevel
    if (!disasterType || !district || !severity || !season || !avgDamageLevel) {
      setError("Please fill in all fields before generating.");
      return;
    }

    const hh = Number(households);
    if (!hh || hh < minHH) {
      setError(`Minimum ${minHH} households required for ${severity} severity.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/prediction/estimate", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          disasterType,
          district,
          severity,
          season,
          numHouseholds:  hh,
          avgDamageLevel: Number(avgDamageLevel),   // ← passed to backend
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setLatestResult({
        id:               data.predictionId,
        disasterType,
        district,
        severity,
        season,
        households:       hh,
        avgDamageLevel:   Number(avgDamageLevel),
        estimatedFunding: data.estimatedFunding,
        formatted:        data.formatted,
      });

    } catch (err) {
      setError("Could not reach the prediction server. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeStyle = (sev) => {
    if (sev === "Critical") return { ...styles.badge, ...styles.badgeCritical };
    if (sev === "Moderate") return { ...styles.badge, ...styles.badgeModerate };
    return { ...styles.badge, ...styles.badgeLow };
  };

  const damageLevelLabel = (val) => {
    const found = DAMAGE_LEVELS.find(d => d.value === String(val));
    return found ? found.label : `Level ${val}`;
  };

  return (
    <div style={styles.page}>

      {/* ── Page Header ── */}
      <div style={{ ...styles.pageHeader, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={styles.pageTitle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
            Disaster Funding Forecasting
          </h2>
          <p style={styles.pageDescription}>
            Predict the most likely funding amount when a particular disaster occurs
          </p>
        </div>
        <button
          style={styles.historyButton}
          onClick={() => navigate("/prediction-history")}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/>
          </svg>
          View History
        </button>
      </div>

      {/* ── Prediction Form ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/>
            </svg>
            Prediction Form
          </p>
          <p style={styles.cardDescription}>Select disaster parameters to generate a funding estimate</p>
        </div>

        <div style={styles.cardContent}>

          {/* Row 1 — Disaster Type, District, Severity */}
          <div style={styles.grid3}>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Disaster Type</label>
              <select style={styles.select} value={disasterType} onChange={e => setDisasterType(e.target.value)}>
                <option value="">Select type</option>
                {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>District</label>
              <select style={styles.select} value={district} onChange={e => setDistrict(e.target.value)}>
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Severity</label>
              <select style={styles.select} value={severity} onChange={handleSeverityChange}>
                <option value="">Select severity</option>
                {SEVERITIES.map(s => (
                  <option key={s} value={s}>{s} (min {SEVERITY_MIN_HH[s]} households)</option>
                ))}
              </select>
            </div>

          </div>

          {/* Row 2 — Season, Damage Level, Households, Button */}
          <div style={styles.grid3}>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Season</label>
              <select style={styles.select} value={season} onChange={e => setSeason(e.target.value)}>
                <option value="">Select season</option>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* ── NEW FIELD: Average Damage Level ── */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Average Damage Level</label>
              <select style={styles.select} value={avgDamageLevel} onChange={e => setAvgDamageLevel(e.target.value)}>
                <option value="">Select damage level</option>
                {DAMAGE_LEVELS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <p style={styles.helperText}>Based on initial field reports</p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Number of Households Affected</label>
              <input
                style={styles.input}
                type="number"
                min={minHH}
                value={households}
                onChange={e => setHouseholds(e.target.value)}
                placeholder={`Min ${minHH}`}
              />
              {severity && (
                <p style={styles.helperText}>Minimum: {minHH} for {severity} severity</p>
              )}
            </div>

          </div>

          {/* Generate Button — full width below the grid */}
          <div style={{ marginTop: "4px" }}>
            <button
              style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                  Generate Estimate
                </>
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ marginTop: "12px", padding: "10px 14px", backgroundColor: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: "6px", color: "#c0392b", fontSize: "var(--fs-helper)" }}>
              {error}
            </div>
          )}

        </div>
      </div>

      {/* ── Result Display ── */}
      {latestResult && (
        <div style={styles.resultCard}>
          <div style={styles.resultContent}>
            <p style={styles.resultLabel}>Estimated Funding Required</p>
            <p style={styles.resultAmount}>{latestResult.formatted}</p>
            <div style={styles.badgeRow}>
              <span style={styles.badge}>{latestResult.disasterType}</span>
              <span style={styles.badge}>{latestResult.district}</span>
              <span style={getSeverityBadgeStyle(latestResult.severity)}>{latestResult.severity} Severity</span>
              <span style={styles.badge}>{latestResult.season}</span>
              <span style={styles.badge}>{latestResult.households.toLocaleString()} Households</span>
              {/* ── NEW: show damage level in result badges ── */}
              <span style={styles.badge}>Damage Level {latestResult.avgDamageLevel}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default Forecasting;