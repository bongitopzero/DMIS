# DMIS UI Design System
## HCI-Compliant Component Library

This design system ensures consistency, feedback, visibility, error prevention, mapping, and learnability across the DMIS application.

---

## Color System

### Primary Colors
- **Primary Blue**: `#163b5b` - Main actions, navigation highlights
- **Success Green**: `#28a745` - Positive actions, confirmations
- **Danger Red**: `#dc3545` - Destructive actions, errors
- **Warning Yellow**: `#ffc107` - Cautions, alerts
- **Info Blue**: `#17a2b8` - Information, notifications

### Neutral Colors
- **Text Primary**: `#212529` - Main text
- **Text Secondary**: `#6c757d` - Secondary text, placeholders
- **Background Primary**: `#ffffff` - Main background
- **Background Secondary**: `#f8f9fa` - Secondary areas
- **Border**: `#dee2e6` - Borders, dividers

---

## Components

### 1. FormInput Component
**Purpose**: Standardized form field with validation feedback

```jsx
import { FormInput, FormSelect, FormTextarea } from "./FormInput";

// Basic usage
<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="your@email.com"
  required
  error={emailError}
  helpText="We'll never share your email"
  validate={(value) => {
    if (!value.includes('@')) return 'Invalid email format';
    return null;
  }}
/>

// Select dropdown
<FormSelect
  label="Role"
  value={role}
  onChange={setRole}
  required
  options={[
    { value: 'admin', label: 'Administrator' },
    { value: 'user', label: 'User' }
  ]}
  placeholder="Select a role"
/>

// Textarea
<FormTextarea
  label="Description"
  value={description}
  onChange={setDescription}
  required
  rows={4}
  helpText="Provide detailed information"
/>
```

**Features**:
- ✓ Required field indicators (*)
- ✓ Inline error display on blur
- ✓ Help text support
- ✓ Custom validation functions
- ✓ Success state indicator
- ✓ Disabled state visual feedback
- ✓ Password visibility toggle (for type="password")
- ✓ Accessible (ARIA labels, roles)

---

### 2. Button Component
**Purpose**: Consistent, accessible buttons with loading states

```jsx
import { Button, IconButton, ButtonGroup } from "./Button";

// Primary button
<Button 
  variant="primary"
  size="md"
  onClick={handleSubmit}
  loading={isSubmitting}
  disabled={isInvalid}
>
  Submit
</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Danger button (for delete)
<Button 
  variant="danger"
  onClick={() => handleDelete(id)}
  tooltip="Delete this item"
>
  Delete
</Button>

// Button with icon
import { Save, Trash2 } from "lucide-react";
<Button
  variant="primary"
  icon={Save}
  iconPosition="left"
>
  Save Changes
</Button>

// Icon button
<IconButton
  icon={Trash2}
  variant="danger"
  size="sm"
  tooltip="Delete"
  onClick={handleDelete}
/>

// Button group
<ButtonGroup layout="horizontal">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Save</Button>
</ButtonGroup>
```

**Variants**: `primary`, `secondary`, `danger`, `success`, `warning`
**Sizes**: `sm` (12px), `md` (14px), `lg` (16px)

**Features**:
- ✓ Loading spinner during async operations
- ✓ Disabled state styling
- ✓ Icon support (left/right position)
- ✓ Tooltip on hover
- ✓ Full-width option
- ✓ Accessibility focus indicators

---

### 3. Alert Component
**Purpose**: Display important messages to users

```jsx
import { Alert, InlineAlert } from "./Alert";

// Full alert
<Alert 
  type="error"
  title="Error"
  onClose={() => {}}
>
  Something went wrong. Please try again.
</Alert>

// Warning alert
<Alert 
  type="warning"
  title="Warning"
>
  This action cannot be undone.
</Alert>

// Success alert
<Alert type="success">
  User created successfully!
</Alert>

// Inline alert (for forms)
<InlineAlert 
  type="error" 
  message="Email is already taken"
/>
```

**Types**: `error`, `warning`, `success`, `info`

**Features**:
- ✓ Closeable with X button
- ✓ Icon indicators
- ✓ Color-coded by type
- ✓ Animated entrance
- ✓ Accessible (role="alert")

---

### 4. Toast Component
**Purpose**: Non-blocking notifications

```jsx
import { ToastManager, ToastContainer } from "./Toast";

// Wrap your app with container
<ToastContainer toasts={toasts} onRemove={removeToast} />

// Show toast from anywhere
ToastManager.success("User saved successfully!");
ToastManager.error("Failed to save user");
ToastManager.warning("This action cannot be undone");
ToastManager.info("Processing your request...");

// Custom duration (default: 4000ms)
ToastManager.success("Saved!", 3000);

// Clear all toasts
ToastManager.clear();
```

**Features**:
- ✓ Auto-dismiss after duration
- ✓ Manual close button
- ✓ Slide-in animation
- ✓ Stack multiple toasts
- ✓ Fixed position (non-blocking)

---

## Form Validation Patterns

### Example: User Registration Form

```jsx
import { FormInput, Button } from "./components";
import { ToastManager } from "./Toast";

export function RegisterForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateEmail = (email) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name) newErrors.name = 'Name is required';
    const emailError = validateEmail(form.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(form.password);
    if (passwordError) newErrors.password = passwordError;
    
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      ToastManager.error('Please fix the errors below');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/register', form);
      ToastManager.success('Account created! Redirecting...');
      // Redirect after success
    } catch (err) {
      ToastManager.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Full Name"
        value={form.name}
        onChange={(name) => setForm({ ...form, name })}
        required
        error={errors.name}
        placeholder="John Doe"
      />

      <FormInput
        label="Email"
        type="email"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
        required
        error={errors.email}
        placeholder="john@example.com"
        validate={validateEmail}
      />

      <FormInput
        label="Password"
        type="password"
        value={form.password}
        onChange={(password) => setForm({ ...form, password })}
        required
        error={errors.password}
        helpText="Min 8 chars, 1 uppercase, 1 number"
        validate={validatePassword}
      />

      <FormInput
        label="Confirm Password"
        type="password"
        value={form.confirmPassword}
        onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
        required
        error={errors.confirmPassword}
      />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
        disabled={Object.keys(errors).length > 0}
      >
        Create Account
      </Button>
    </form>
  );
}
```

---

## Accessibility Standards

All components follow WCAG 2.1 Level AA standards:

- ✓ Semantic HTML (`<button>`, `<label>`, `<input>`)
- ✓ ARIA labels and roles
- ✓ Keyboard navigation (Tab, Enter, Space)
- ✓ Focus indicators (visible outline)
- ✓ Color contrast (4.5:1 for text)
- ✓ Error announcement (`role="alert"`)
- ✓ Required field indicators

---

## Usage Guidelines

### When to use each component

| Component | Use Case | Example |
|-----------|----------|---------|
| **FormInput** | Any text input with validation | Email, password, search |
| **FormSelect** | Dropdown selection | Role selection, category |
| **FormTextarea** | Multi-line text | Description, comments, notes |
| **Button** | Primary actions | Submit, Save, Delete |
| **IconButton** | Secondary actions | Edit, View, Close |
| **Alert** | Important info/warnings | Error messages, confirmations |
| **Toast** | Non-blocking feedback | Success, info notifications |

---

## Best Practices

### 1. **Always validate on blur**
- Helps users correct mistakes early
- Prevents submission errors

### 2. **Always show required fields**
- Use asterisk (*) for required fields
- Use `required` HTML attribute

### 3. **Provide helpful error messages**
- Be specific: "Email is invalid" not just "Error"
- Be actionable: "Create an account first" not "Not found"
- Show how to fix: "Password must be 8+ characters"

### 4. **Give visual feedback**
- Loading spinners during async operations
- Success/error toasts for results
- Spinner buttons for form submission
- Disabled state for invalid forms

### 5. **Make actions reversible**
- Confirm before destructive actions
- Implement undo where possible
- Show what data will be lost

### 6. **Be consistent**
- Use the same colors for same actions
- Use the same button sizes
- Use the same error message patterns

---

## Color Usage Reference

| Color | Usage | Example |
|-------|-------|---------|
| **Blue** (#163b5b) | Primary actions, active states | Submit button, selected filter |
| **Green** (#28a745) | Success, positive actions | Save button, success toast |
| **Red** (#dc3545) | Danger, errors, delete | Delete button, error message |
| **Yellow** (#ffc107) | Warnings, cautions | Warning alert, pending status |
| **Gray** (#6c757d) | Secondary, disabled states | Disabled button, secondary text |

---

## Implementation Checklist

When building a new page:

- [ ] Use FormInput for all text inputs
- [ ] Add validation on all forms
- [ ] Use Button component for all buttons
- [ ] Mark required fields with *
- [ ] Show error messages inline
- [ ] Use Toast for success/error feedback
- [ ] Add tooltips to complex controls
- [ ] Test with keyboard navigation
- [ ] Check color contrast
- [ ] Test on mobile devices

---

## Dark Mode Support

All components automatically support dark mode. Colors are defined using CSS variables:

```css
:root[data-theme="dark"] {
  --bg-primary: #1a1d23;
  --text-primary: #e4e6eb;
  --border-color: #3a3f4b;
}
```

No additional styling needed!

---

## Migration Guide

If updating existing forms to use this system:

1. Replace custom inputs with `<FormInput>`
2. Add validation functions
3. Replace success/error alerts with `<Toast>` or `<Alert>`
4. Replace all buttons with `<Button>`
5. Add tooltips and help text
6. Test thoroughly

---

**Last Updated**: February 19, 2026  
**Version**: 1.0  
**Status**: Active
