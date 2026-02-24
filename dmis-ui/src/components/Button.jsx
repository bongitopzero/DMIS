import React from "react";
import { Loader } from "lucide-react";
import "./Button.css";

/**
 * Standardized Button Component
 * HCI Principles: Consistency, Feedback, Visibility, Learnability
 * 
 * Features:
 * - Multiple variants (primary, secondary, danger, success)
 * - Size options (sm, md, lg)
 * - Loading state with spinner
 * - Disabled state
 * - Consistent styling
 * - Tooltip support
 * 
 * Usage:
 * <Button 
 *   variant="primary" 
 *   size="md" 
 *   onClick={handleClick}
 *   loading={isSubmitting}
 *   disabled={isDisabled}
 *   tooltip="Click to submit"
 * >
 *   Submit
 * </Button>
 */
export const Button = ({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className = "",
  tooltip,
  title,
  icon: Icon,
  iconPosition = "left",
  fullWidth = false,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? "btn-full-width" : ""} ${className}`}
      title={tooltip || title}
      aria-label={tooltip || title}
      {...props}
    >
      <span className="btn-content">
        {loading && <Loader className="btn-loader" aria-hidden="true" />}
        {Icon && iconPosition === "left" && !loading && <Icon className="btn-icon" aria-hidden="true" />}
        <span className="btn-text">{children}</span>
        {Icon && iconPosition === "right" && !loading && <Icon className="btn-icon" aria-hidden="true" />}
      </span>
    </button>
  );
};

/**
 * Icon Button Component
 * For buttons with only icon
 */
export const IconButton = ({
  icon: Icon,
  onClick,
  disabled = false,
  variant = "secondary",
  size = "md",
  tooltip,
  loading = false,
  className = "",
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-icon-only btn-${variant} btn-${size} ${className}`}
      title={tooltip}
      aria-label={tooltip}
      {...props}
    >
      {loading ? <Loader className="btn-loader" aria-hidden="true" /> : <Icon aria-hidden="true" />}
    </button>
  );
};

/**
 * Button Group Component
 * For multiple buttons side by side
 */
export const ButtonGroup = ({ children, className = "", layout = "horizontal" }) => {
  return (
    <div className={`btn-group btn-group-${layout} ${className}`}>
      {children}
    </div>
  );
};

export default Button;
