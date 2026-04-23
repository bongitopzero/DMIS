import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmtMaloti = (v) => `M ${Number(v).toLocaleString()}`;

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
  pageActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  forecastingButton: {
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
  clearButton: {
    padding: "8px 16px",
    backgroundColor: "#c0392b",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "var(--fs-button)",
    fontWeight: "var(--fw-medium)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "16px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "var(--text-secondary)",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    opacity: 0.5,
  },
  loadingSpinner: {
    animation: "spin 1s linear infinite",
  },
};

// Add keyframes for spinner animation
const keyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const PredictionHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPredictionHistory();
  }, []);

  const fetchPredictionHistory = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get token from localStorage (it's stored inside the "user" object)
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      let token;
      try {
        const userData = JSON.parse(userStr);
        token = userData.token;
      } catch (parseErr) {
        console.error("Failed to parse user data from localStorage:", parseErr);
        setError("Invalid authentication data. Please log in again.");
        setLoading(false);
        return;
      }

      if (!token) {
        setError("No authentication token found. Please log in again.");
        setLoading(false);
        return;
      }

      // First, test if server is running
      try {
        const testResponse = await fetch("http://localhost:5000/api/prediction/test", {
          method: "GET"
        });
        if (!testResponse.ok) {
          throw new Error(`Server responded with status ${testResponse.status}`);
        }
      } catch (testErr) {
        console.error("Server connectivity test failed:", testErr);
        setError("Backend server is not running. Please start the API server on port 5000.");
        setLoading(false);
        return;
      }

      // Now fetch actual history
      const response = await fetch("http://localhost:5000/api/prediction/history", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", response.status, data);
        setError(data.message || `Server error: ${response.status}`);
        return;
      }

      if (data.success) {
        // Format the data for display
        const formattedData = data.data.map(p => ({
          ...p,
          formatted: `M ${Number(p.estimatedFunding).toLocaleString()}`
        }));
        setHistory(formattedData);
      } else {
        setError(data.message || "Failed to load prediction history");
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(`Server connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all prediction history?")) {
      // Get token
      let token;
      try {
        const userStr = localStorage.getItem("user");
        const userData = JSON.parse(userStr);
        token = userData.token;
      } catch (e) {
        setError("Failed to authenticate. Please log in again.");
        return;
      }

      // Delete each prediction from the database
      const promises = history.map(p =>
        fetch(`http://localhost:5000/api/prediction/${p._id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
      );

      Promise.all(promises)
        .then(() => {
          setHistory([]);
        })
        .catch(err => {
          console.error("Error clearing history:", err);
          setError("Failed to clear history");
        });
    }
  };

  const getSeverityBadgeStyle = (sev) => {
    if (sev === "Critical") return { ...styles.badge, ...styles.badgeCritical };
    if (sev === "Moderate") return { ...styles.badge, ...styles.badgeModerate };
    return { ...styles.badge, ...styles.badgeLow };
  };

  const chartData = [...history]
    .reverse()
    .map((p, i) => ({
      name: `#${i + 1} ${p.disasterType.split(" ")[0]}`,
      amount: p.estimatedFunding,
    }))
    .slice(0, 20); // Show last 20 for readability

  return (
    <div style={styles.page}>
      {/* ── Page Header ── */}
      <div style={{ ...styles.pageHeader, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={styles.pageTitle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
            Prediction History
          </h2>
          <p style={styles.pageDescription}>
            View all forecasting predictions from this session
          </p>
        </div>
        <button
          style={styles.forecastingButton}
          onClick={() => navigate("/forecasting")}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <line x1="2" y1="20" x2="22" y2="20" />
          </svg>
          New Prediction
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", backgroundColor: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: "6px", color: "#c0392b", fontSize: "var(--fs-body)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⏳</div>
            <p style={{ fontSize: "var(--fs-body)" }}>Loading predictions...</p>
          </div>
        </div>
      ) : history.length > 0 ? (
        <>
          {/* ── Prediction History Table ── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3z" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
                All Predictions
              </p>
              <p style={styles.cardDescription}>{history.length} total prediction(s)</p>
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
                      <tr key={p._id}>
                        <td style={styles.td}>{history.length - i}</td>
                        <td style={styles.td}>{p.disasterType}</td>
                        <td style={styles.td}>{p.district}</td>
                        <td style={styles.tdCenter}>
                          <span style={getSeverityBadgeStyle(p.severity)}>{p.severity}</span>
                        </td>
                        <td style={styles.td}>{p.season}</td>
                        <td style={styles.tdRight}>{p.numHouseholds.toLocaleString()}</td>
                        <td style={styles.tdRight}>{p.formatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={styles.buttonRow}>
                <button style={styles.clearButton} onClick={handleClearHistory}>
                  Clear History
                </button>
              </div>
            </div>
          </div>

          {/* ── Prediction Comparison Chart ── */}
          {chartData.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                    <line x1="2" y1="20" x2="22" y2="20" />
                  </svg>
                  Prediction Comparison
                </p>
                <p style={styles.cardDescription}>Estimated funding across predictions (Maloti)</p>
              </div>
              <div style={styles.cardContent}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="name" fontSize={13} tick={{ fill: "var(--text-secondary)" }} />
                    <YAxis
                      fontSize={13}
                      tick={{ fill: "var(--text-secondary)" }}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `M${(v / 1_000_000).toFixed(1)}M`
                          : `M${(v / 1_000).toFixed(0)}K`
                      }
                    />
                    <Tooltip
                      formatter={(v) => [fmtMaloti(v), "Estimated Funding"]}
                      labelFormatter={(l) => `Event: ${l}`}
                      contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px" }}
                    />
                    <Bar dataKey="amount" name="Estimated Funding" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <p style={{ fontSize: "var(--fs-h4)", fontWeight: "var(--fw-semibold)", marginBottom: "8px" }}>
              No predictions yet
            </p>
            <p style={{ fontSize: "var(--fs-body)", margin: 0 }}>
              Generate predictions from the Forecasting page to see them here
            </p>
          </div>
        </div>
      )}
      
      <style>{keyframes}</style>
    </div>
  );
};

export default PredictionHistory;
