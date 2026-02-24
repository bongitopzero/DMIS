import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import "./FormInput.css";

/**
 * Standardized Form Input Component
 * HCI Principles: Consistency, Feedback, Error Prevention, Visibility
 * 
 * Features:
 * - Required field indicator
 * - Inline error display
 * - Validation feedback
 * - Consistent styling across all forms
 * - Accessibility support
 * - Help text support
 * 
 * Usage:
 * <FormInput
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={setEmail}
 *   required
 *   placeholder="your@email.com"
 *   error={emailError}
 *   helpText="We'll never share your email"
 *   validate={(val) => val.includes('@') ? null : 'Invalid email'}
 * />
 */
export const FormInput = ({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder,
  error,
  success,
  helpText,
  validate,
  name,
  id,
  className = "",
  showPassword,
  onTogglePassword,
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const inputId = id || name || label?.toLowerCase().replace(/\s/g, "-");

  const handleBlur = (e) => {
    setTouched(true);
    if (validate) {
      const validationError = validate(value);
      setInternalError(validationError);
    }
    onBlur?.(e);
  };

  const displayError = error || (touched ? internalError : null);
  const isPassword = type === "password";
  const displayType = isPassword && showPassword ? "text" : type;

  return (
    <div className={`form-input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label}</span>
          {required && <span className="form-required" title="Required field">*</span>}
        </label>
      )}

      <div className="form-input-wrapper">
        <input
          id={inputId}
          type={displayType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`form-input ${displayError ? "form-input-error" : ""} ${
            success ? "form-input-success" : ""
          } ${disabled ? "form-input-disabled" : ""}`}
          name={name}
          {...props}
        />

        {isPassword && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="form-input-toggle"
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {displayError && (
          <AlertCircle className="form-input-icon form-input-icon-error" />
        )}
        {success && !displayError && (
          <CheckCircle className="form-input-icon form-input-icon-success" />
        )}
      </div>

      {displayError && (
        <p className="form-error-text" role="alert">
          {displayError}
        </p>
      )}

      {helpText && !displayError && (
        <p className="form-help-text">{helpText}</p>
      )}
    </div>
  );
};

/**
 * Form Select Component
 */
export const FormSelect = ({
  label,
  value,
  onChange,
  onBlur,
  options = [],
  required = false,
  disabled = false,
  error,
  helpText,
  name,
  id,
  className = "",
  placeholder,
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const selectId = id || name || label?.toLowerCase().replace(/\s/g, "-");
  const displayError = touched ? error : null;

  return (
    <div className={`form-input-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          <span>{label}</span>
          {required && <span className="form-required" title="Required field">*</span>}
        </label>
      )}

      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          setTouched(true);
          onBlur?.(e);
        }}
        required={required}
        disabled={disabled}
        className={`form-select ${displayError ? "form-input-error" : ""} ${
          disabled ? "form-input-disabled" : ""
        }`}
        name={name}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {displayError && (
        <p className="form-error-text" role="alert">
          {displayError}
        </p>
      )}

      {helpText && !displayError && (
        <p className="form-help-text">{helpText}</p>
      )}
    </div>
  );
};

/**
 * Form Textarea Component
 */
export const FormTextarea = ({
  label,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder,
  error,
  helpText,
  validate,
  rows = 4,
  name,
  id,
  className = "",
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState(null);
  const textareaId = id || name || label?.toLowerCase().replace(/\s/g, "-");

  const handleBlur = (e) => {
    setTouched(true);
    if (validate) {
      const validationError = validate(value);
      setInternalError(validationError);
    }
    onBlur?.(e);
  };

  const displayError = error || (touched ? internalError : null);

  return (
    <div className={`form-input-group ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="form-label">
          <span>{label}</span>
          {required && <span className="form-required" title="Required field">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className={`form-textarea ${displayError ? "form-input-error" : ""} ${
          disabled ? "form-input-disabled" : ""
        }`}
        name={name}
        {...props}
      />

      {displayError && (
        <p className="form-error-text" role="alert">
          {displayError}
        </p>
      )}

      {helpText && !displayError && (
        <p className="form-help-text">{helpText}</p>
      )}
    </div>
  );
};

export default FormInput;
