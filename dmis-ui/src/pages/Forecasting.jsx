import { useState, useEffect } from "react";
import API from "../api/axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "0",
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "var(--fs-body)",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: "var(--fs-label)",
    fontWeight: "var(--fw-semibold)",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
  },
  thRight: {
    padding: "10px 14px",
    textAlign: "right",
    fontSize: "var(--fs-label)",
    fontWeight: "var(--fw-semibold)",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid var(--border-light)",
    color: "var(--text-primary)",
    fontSize: "var(--fs-body)",
  },
  tdRight: {
    padding: "12px 14px",
    borderBottom: "1px solid var(--border-light)",
    color: "var(--text-primary)",
    fontSize: "var(--fs-body)",
    textAlign: "right",
    fontWeight: "var(--fw-semibold)",
  },
  tdCenter: {
    padding: "12px 14px",
    borderBottom: "1px solid var(--border-light)",
    textAlign: "center",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Forecasting = () => {
  const [disasterType, setDisasterType] = useState("");
  const [district,     setDistrict]     = useState("");
  const [severity,     setSeverity]     = useState("");
  const [season,       setSeason]       = useState("");
  const [households,   setHouseholds]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [history,      setHistory]      = useState([]);
  const [error,        setError]        = useState("");

  const minHH = SEVERITY_MIN_HH[severity] ?? 1;

  const handleSeverityChange = (e) => {
    const value = e.target.value;
    setSeverity(value);
    const min = SEVERITY_MIN_HH[value];
    if (Number(households) < min) setHouseholds(String(min));
  };

  const handleGenerate = async () => {
    setError("");

    if (!disasterType || !district || !severity || !season) {
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
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ disasterType, district, severity, season, numHouseholds: hh }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Something went wrong.");
        return;
      }

      const prediction = {
        id:               Date.now(),
        disasterType,
        district,
        severity,
        season,
        households:       hh,
        estimatedFunding: data.estimatedFunding,
        formatted:        data.formatted,
      };

      setLatestResult(prediction);
      setHistory(prev => [prediction, ...prev]);

    } catch (err) {
      setError("Could not reach the prediction server. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = [...history].reverse().map((p, i) => ({
    name:   `#${i + 1} ${p.disasterType.split(" ")[0]}`,
    amount: p.estimatedFunding,
  }));

  const getSeverityBadgeStyle = (sev) => {
    if (sev === "Critical") return { ...styles.badge, ...styles.badgeCritical };
    if (sev === "Moderate") return { ...styles.badge, ...styles.badgeModerate };
    return { ...styles.badge, ...styles.badgeLow };
  };

  return (
    <div style={styles.page}>

        {/* ── Page Header ── */}
        <div style={styles.pageHeader}>
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

        {/* ── 1. Prediction Form ── */}
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
            <div style={styles.grid3}>

              {/* Disaster Type */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Disaster Type</label>
                <select style={styles.select} value={disasterType} onChange={e => setDisasterType(e.target.value)}>
                  <option value="">Select type</option>
                  {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* District */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>District</label>
                <select style={styles.select} value={district} onChange={e => setDistrict(e.target.value)}>
                  <option value="">Select district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Severity */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Severity</label>
                <select style={styles.select} value={severity} onChange={handleSeverityChange}>
                  <option value="">Select severity</option>
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{s} (min {SEVERITY_MIN_HH[s]} households)</option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Season</label>
                <select style={styles.select} value={season} onChange={e => setSeason(e.target.value)}>
                  <option value="">Select season</option>
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Households */}
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

              {/* Button */}
              <div style={styles.buttonWrap}>
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

            </div>

            {/* Error message */}
            {error && (
              <div style={{ marginTop: "12px", padding: "10px 14px", backgroundColor: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: "6px", color: "#c0392b", fontSize: "var(--fs-helper)" }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Result Display ── */}
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
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Prediction History ── */}
        {history.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
                Prediction History
              </p>
              <p style={styles.cardDescription}>{history.length} prediction(s) this session</p>
            </div>
            <div style={styles.cardContent}>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Disaster Type</th>
                      <th style={styles.th}>District</th>
                      <th style={styles.th}>Severity</th>
                      <th style={styles.th}>Season</th>
                      <th style={styles.thRight}>Households</th>
                      <th style={styles.thRight}>Estimated Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p, i) => (
                      <tr key={p.id}>
                        <td style={styles.td}>{history.length - i}</td>
                        <td style={styles.td}>{p.disasterType}</td>
                        <td style={styles.td}>{p.district}</td>
                        <td style={styles.tdCenter}>
                          <span style={getSeverityBadgeStyle(p.severity)}>{p.severity}</span>
                        </td>
                        <td style={styles.td}>{p.season}</td>
                        <td style={styles.tdRight}>{p.households.toLocaleString()}</td>
                        <td style={styles.tdRight}>{p.formatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Bar Chart ── */}
        {chartData.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
                Prediction Comparison
              </p>
              <p style={styles.cardDescription}>Estimated funding per prediction (Maloti)</p>
            </div>
            <div style={styles.cardContent}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="name" fontSize={13} tick={{ fill: "var(--text-secondary)" }} />
                  <YAxis
                    fontSize={13}
                    tick={{ fill: "var(--text-secondary)" }}
                    tickFormatter={v =>
                      v >= 1_000_000
                        ? `M${(v / 1_000_000).toFixed(1)}M`
                        : `M${(v / 1_000).toFixed(0)}K`
                    }
                  />
                  <Tooltip
                    formatter={(v) => [fmtMaloti(v), "Estimated Funding"]}
                    labelFormatter={l => `Event: ${l}`}
                    contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px" }}
                  />
                  <Bar dataKey="amount" name="Estimated Funding" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

    </div>
  );
};

export default Forecasting;