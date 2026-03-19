import React, { useState } from "react";
import FinancialForecastingV2 from "./FinancialForecastingV2.jsx";
import "./FundManagement.css";

const tabs = [
  { id: "overview", label: "Forecast Overview" },
  { id: "depletion", label: "Depletion Forecast" },
  { id: "prediction", label: "Cost Prediction" },
  { id: "scenario", label: "Scenario Simulation" },
  { id: "accuracy", label: "Accuracy Report" },
];

export default function FinancialForecastingHubV2() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Forecasting</h1>
          <p className="dashboard-subtitle">
            Forecast models, scenario simulations, and accuracy reporting.
          </p>
        </div>
      </div>

      <div className="finance-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`finance-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="finance-tab-panel">
        <FinancialForecastingV2 section={activeTab} />
      </div>
    </div>
  );
}
