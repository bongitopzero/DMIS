import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import "./Toast.css";

/**
 * Toast Component - Provides feedback for user actions
 * HCI Principles: Feedback, Visibility, Consistency
 * 
 * Usage:
 * <Toast 
 *   message="User created successfully!" 
 *   type="success" 
 *   duration={4000}
 *   onClose={() => {}}
 * />
 */
export const Toast = ({ message, type = "info", duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  };

  const textColors = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  };

  const iconColors = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  return (
    <div className={`toast toast-${type} ${bgColors[type]}`} role="alert">
      <div className="toast-content">
        <div className={`toast-icon ${iconColors[type]}`}>
          {icons[type]}
        </div>
        <p className={`toast-message ${textColors[type]}`}>{message}</p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="toast-close"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Toast Container - Manage multiple toasts
 * Usage: Wrap your app with this, then use ToastManager.show()
 */
export const ToastContainer = ({ toasts = [], onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove?.(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * Toast Manager - Utility to show toasts
 */
let toastId = 0;
export const ToastManager = {
  toasts: [],
  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  },

  show(message, type = "info", duration = 4000) {
    const id = toastId++;
    const toast = { id, message, type, duration };
    this.toasts.push(toast);
    this.listeners.forEach((listener) => listener([...this.toasts]));
    return id;
  },

  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.listeners.forEach((listener) => listener([...this.toasts]));
  },

  success(message, duration) {
    return this.show(message, "success", duration);
  },

  error(message, duration) {
    return this.show(message, "error", duration);
  },

  warning(message, duration) {
    return this.show(message, "warning", duration);
  },

  info(message, duration) {
    return this.show(message, "info", duration);
  },

  clear() {
    this.toasts = [];
    this.listeners.forEach((listener) => listener([]));
  },
};

export default Toast;
