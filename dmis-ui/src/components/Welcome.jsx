import React from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">

      {/* NAVBAR */}
      <nav className="welcome-navbar">
        <div className="welcome-logo">
          DMIS <span>Lesotho DMA</span>
        </div>

        <button className="btn-get-started" onClick={() => navigate("/login")}>
          Get Started
        </button>
      </nav>

      {/* HERO SECTION */}
      <div className="welcome-hero">
        <div className="welcome-text">
          <h1>
            Disaster Management <br />
            <span>Information System</span>
          </h1>

          <p>
            A comprehensive platform for centralized disaster data management,
            geospatial visualization, transparent financial tracking, and
            evidence-based decision making across all districts of Lesotho.
          </p>

          <button className="btn-primary-large" onClick={() => navigate("/login")}>
            Get Started
          </button>
        </div>
      </div>

      <footer className="welcome-footer">
        © 2026 Government of Lesotho
      </footer>

    </div>
  );
}
