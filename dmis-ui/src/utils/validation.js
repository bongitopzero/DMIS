/**
 * Form Validation Utilities
 * HCI Principle: Error Prevention
 * 
 * Standardized validation functions to prevent user errors
 */

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

// Password validation
export const validatePassword = (password, minLength = 8) => {
  if (!password) return 'Password is required';
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

// Confirm password validation
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

// Required field validation
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

// Phone number validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  if (!phone) return 'Phone number is required';
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// URL validation
export const validateURL = (url) => {
  try {
    new URL(url);
    return null;
  } catch (_) {
    return 'Please enter a valid URL';
  }
};

// Number validation
export const validateNumber = (value, min = 0, max = Infinity) => {
  const num = Number(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < min) return `Number must be at least ${min}`;
  if (num > max) return `Number must be no more than ${max}`;
  return null;
};

// Min length validation
export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  if (!value) return `${fieldName} is required`;
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

// Max length validation
export const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }
  return null;
};

// Date validation
export const validateDate = (dateString) => {
  if (!dateString) return 'Date is required';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Please enter a valid date';
  return null;
};

// Date range validation
export const validateDateRange = (startDate, endDate) => {
  if (new Date(startDate) > new Date(endDate)) {
    return 'End date must be after start date';
  }
  return null;
};

// File validation
export const validateFile = (file, maxSizeMB = 10, allowedTypes = []) => {
  if (!file) return 'File is required';
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  
  return null;
};

// Custom regex validation
export const validateRegex = (value, regex, errorMessage = 'Invalid format') => {
  if (!regex.test(value)) return errorMessage;
  return null;
};

// Compose multiple validators
export const composeValidators = (...validators) => (value) => {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
};

/**
 * Form validation helper
 * Validates entire form object against rules
 */
export class FormValidator {
  constructor(rules = {}) {
    this.rules = rules; // { fieldName: validationFunction }
  }

  validate(formData) {
    const errors = {};
    
    for (const [fieldName, validator] of Object.entries(this.rules)) {
      const value = formData[fieldName];
      const error = validator(value, formData);
      if (error) {
        errors[fieldName] = error;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateField(fieldName, value, formData = {}) {
    const validator = this.rules[fieldName];
    if (!validator) return null;
    return validator(value, formData);
  }
}

/**
 * Common form validation rules
 */
export const ValidationRules = {
  email: (value) => validateEmail(value),
  
  password: (value, formData) => validatePassword(value),
  
  passwordMatch: (value, formData) => validatePasswordMatch(formData.password, value),
  
  required: (value, _, fieldName = 'Field') => validateRequired(value, fieldName),
  
  phone: (value) => validatePhone(value),
  
  url: (value) => validateURL(value),
  
  minLength: (minLength, fieldName = 'Field') => (value) => 
    validateMinLength(value, minLength, fieldName),
  
  maxLength: (maxLength, fieldName = 'Field') => (value) => 
    validateMaxLength(value, maxLength, fieldName),
  
  number: (min, max) => (value) => validateNumber(value, min, max),
  
  date: (value) => validateDate(value),
};

/**
 * Example usage:
 * 
 * const validator = new FormValidator({
 *   email: ValidationRules.email,
 *   password: ValidationRules.password,
 *   confirmPassword: ValidationRules.passwordMatch,
 *   phone: ValidationRules.phone,
 *   age: (value) => validateNumber(value, 18, 120),
 * });
 * 
 * const { isValid, errors } = validator.validate(formData);
 * if (!isValid) {
 *   console.log('Form errors:', errors);
 * }
 */

export default FormValidator;
