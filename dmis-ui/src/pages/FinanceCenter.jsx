import React, { useState } from "react";
import BudgetOverview from "./BudgetOverview.jsx";
import FundManagement from "./FundManagement.jsx";
import Expenditures from "./Expenditures.jsx";
import RiskAlerts from "./RiskAlerts.jsx";
import ForecastAlignment from "./ForecastAlignment.jsx";
import CostProfiles from "./CostProfiles.jsx";
import AnnualBudgets from "./AnnualBudgets.jsx";
import IncidentSnapshots from "./IncidentSnapshots.jsx";
import "./FundManagement.css";

const tabs = [
  { id: "budget", label: "Budget Overview" },
  { id: "annual", label: "Annual Budget" },
  { id: "profiles", label: "Cost Profiles" },
  { id: "snapshots", label: "Incident Snapshots" },
  { id: "tracking", label: "Financial Tracking" },
  { id: "expenditures", label: "Expenditures" },
  { id: "risk", label: "Risk Alerts" },
  { id: "forecast", label: "Forecast Alignment" },
];

export default function FinanceCenter({ initialTab = "budget" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const renderTab = () => {
    switch (activeTab) {
      case "annual":
        return <AnnualBudgets embedded />;
      case "profiles":
        return <CostProfiles embedded />;
      case "snapshots":
        return <IncidentSnapshots embedded />;
      case "tracking":
        return <FundManagement embedded />;
      case "expenditures":
        return <Expenditures embedded />;
      case "risk":
        return <RiskAlerts embedded />;
      case "forecast":
        return <ForecastAlignment embedded />;
      case "budget":
      default:
        return <BudgetOverview embedded />;
    }
  };

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Finance Center</h1>
          <p className="dashboard-subtitle">
            Unified view for budgets, tracking, expenditures, risks, and forecast alignment
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

      <div className="finance-tab-panel">{renderTab()}</div>
    </div>
  );
}
