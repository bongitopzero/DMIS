import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import "./Alert.css";

/**
 * Alert Component
 * HCI Principles: Feedback, Visibility, Error Prevention
 * 
 * Usage:
 * <Alert type="error" title="Error" onClose={() => {}}>
 *   Something went wrong
 * </Alert>
 */
export const Alert = ({
  type = "info",
  title,
  children,
  onClose,
  closeable = true,
  className = "",
  ...props
}) => {
  const icons = {
    error: <AlertCircle className="alert-icon-svg" />,
    warning: <AlertTriangle className="alert-icon-svg" />,
    success: <CheckCircle className="alert-icon-svg" />,
    info: <Info className="alert-icon-svg" />,
  };

  return (
    <div className={`alert alert-${type} ${className}`} role="alert" {...props}>
      <div className="alert-content">
        <div className="alert-icon">{icons[type]}</div>
        <div className="alert-body">
          {title && <h4 className="alert-title">{title}</h4>}
          {children && <p className="alert-message">{children}</p>}
        </div>
      </div>
      {closeable && onClose && (
        <button
          onClick={onClose}
          className="alert-close"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Inline Alert - For form field level messages
 */
export const InlineAlert = ({
  type = "info",
  message,
  icon: Icon,
  className = "",
}) => {
  const defaultIcons = {
    error: <AlertCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div className={`inline-alert inline-alert-${type} ${className}`}>
      {Icon ? Icon : defaultIcons[type]}
      <span>{message}</span>
    </div>
  );
};

export default Alert;
