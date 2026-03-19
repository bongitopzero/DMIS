import React from "react";
import "./PageHeader.css";

/**
 * Unified PageHeader component for all pages
 * Implements HCI F-shape layout pattern with consistent styling
 * 
 * Props:
 * - title: Page title (required)
 * - subtitle: Optional subtitle/description
 * - icon: Optional Lucide icon component
 * - action: Optional action element (button, dropdown menu, etc.)
 */
export default function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <div className="page-header-title-group">
          {Icon && <div className="page-header-icon">{<Icon size={32} />}</div>}
          <div className="page-header-text">
            <h1 className="page-header-title">{title}</h1>
            {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </div>
    </div>
  );
}
