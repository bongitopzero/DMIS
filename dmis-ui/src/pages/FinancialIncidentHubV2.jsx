import React, { useState } from "react";
import FinancialIncidentManagementV2 from "./FinancialIncidentManagementV2.jsx";
import FinanceIncidentFundsV2 from "./FinanceIncidentFundsV2.jsx";
import FinanceExpendituresV2 from "./FinanceExpendituresV2.jsx";
import FinanceSnapshotsV2 from "./FinanceSnapshotsV2.jsx";
import "./FundManagement.css";

const tabs = [
  { id: "profile", label: "Incident Financial Profile" },
  { id: "funds", label: "Incident Funds" },
  { id: "expenses", label: "Expense Tracker" },
  { id: "snapshots", label: "Snapshots" },
];

export default function FinancialIncidentHubV2() {
  const [activeTab, setActiveTab] = useState("profile");

  const renderTab = () => {
    switch (activeTab) {
      case "funds":
        return <FinanceIncidentFundsV2 />;
      case "expenses":
        return <FinanceExpendituresV2 />;
      case "snapshots":
        return <FinanceSnapshotsV2 />;
      case "profile":
      default:
        return <FinancialIncidentManagementV2 />;
    }
  };

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Incident Management</h1>
          <p className="dashboard-subtitle">
            Incident-driven allocation, expense tracking, and approval workflows.
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
