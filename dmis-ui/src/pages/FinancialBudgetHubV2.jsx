import React, { useState } from "react";
import FinancialBudgetBaselineV2 from "./FinancialBudgetBaselineV2.jsx";
import FinancialBudgetPoolsV2 from "./FinancialBudgetPoolsV2.jsx";
import FinancialBudgetAdjustmentsV2 from "./FinancialBudgetAdjustmentsV2.jsx";
import FinancialBudgetExpendituresV2 from "./FinancialBudgetExpendituresV2.jsx";
import "./FundManagement.css";

const tabs = [
  { id: "baseline", label: "Baseline Configuration" },
  { id: "pools", label: "Pool Monitoring" },
  { id: "adjustments", label: "Adjustments & Controls" },
  { id: "expenditures", label: "Expenditures" },
];

export default function FinancialBudgetHubV2() {
  const [activeTab, setActiveTab] = useState("baseline");

  const renderTab = () => {
    switch (activeTab) {
      case "pools":
        return <FinancialBudgetPoolsV2 />;
      case "adjustments":
        return <FinancialBudgetAdjustmentsV2 />;
      case "expenditures":
        return <FinancialBudgetExpendituresV2 />;
      case "baseline":
      default:
        return <FinancialBudgetBaselineV2 />;
    }
  };

  return (
    <div className="finance-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Expenditure & Budgets</h1>
          <p className="dashboard-subtitle">
            Manage baseline budgets, pool monitoring, adjustments, and expenditures.
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
