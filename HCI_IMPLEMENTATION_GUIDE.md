# HCI Implementation Guide for DMIS

## Overview

This guide explains how to apply the 6 HCI design principles to every page in the DMIS application.

---

## 1. Consistency

### What it means
Similar actions and elements should look and behave the same way throughout the interface.

### Implementation Checklist

**Color Consistency**
- [ ] All primary buttons use `#163b5b`
- [ ] All danger buttons use `#dc3545`
- [ ] All success messages use `#28a745`
- [ ] Links always styled consistently
- [ ] Hover states consistent

**Button Consistency**
- [ ] Use `Button` component for all buttons
- [ ] Primary actions: `variant="primary"`
- [ ] Secondary actions: `variant="secondary"`
- [ ] Dangerous actions: `variant="danger"`
- [ ] All buttons have consistent padding/sizing

**Form Consistency**
- [ ] Use `FormInput` for all text inputs
- [ ] Use `FormSelect` for dropdowns
- [ ] Use `FormTextarea` for text areas
- [ ] Mark required fields with asterisk (*)
- [ ] All error messages display inline

**Typography**
- [ ] Heading sizes consistent across pages (h1, h2, h3)
- [ ] Body text always 14px (`text-sm`)
- [ ] Labels always bold, 14px
- [ ] Help text always 12px, gray

**Spacing**
- [ ] Consistent padding: 16px sections, 12px elements
- [ ] Consistent margins: 16px between sections
- [ ] Consistent gaps: 8px between form fields

### Example Implementation

```jsx
// ❌ INCONSISTENT
<form>
  <input type="text" placeholder="Name" />
  <input type="email" placeholder="Email" />
  <button onClick={handleSubmit}>Submit</button>
  {error && <p style={{color: 'red'}}>{error}</p>}
</form>

// ✅ CONSISTENT
import { FormInput, Button } from '../components';

<form>
  <FormInput
    label="Name"
    value={name}
    onChange={setName}
    required
    error={errors.name}
  />
  <FormInput
    label="Email"
    type="email"
    value={email}
    onChange={setEmail}
    required
    error={errors.email}
  />
  <Button 
    variant="primary"
    type="submit"
    loading={loading}
  >
    Submit
  </Button>
</form>
```

---

## 2. Feedback

### What it means
Users should always know what happened after their action.

### Implementation Checklist

**Inform About Actions**
- [ ] Button loading spinners during async operations
- [ ] Toast messages after form submission
- [ ] Visual state changes on click
- [ ] Success/error messages shown

**Submit Feedback Pattern**
```jsx
const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    await API.post('/endpoint', data);
    ToastManager.success('✓ Data saved successfully!');
    // Redirect or reset form
  } catch (err) {
    ToastManager.error('✗ ' + err.response?.data?.message);
  } finally {
    setLoading(false);
  }
};

// UI shows loading state
<Button
  type="submit"
  loading={loading}
  disabled={!isFormValid}
>
  Save Changes
</Button>
```

**Visual Feedback Checklist**
- [ ] Buttons show loading spinner during submission
- [ ] Buttons disabled while loading
- [ ] Toast appears after action completes
- [ ] Toast includes success/error icon
- [ ] Toast auto-dismisses after 4 seconds
- [ ] User can manually close toast
- [ ] Error messages are specific and actionable

**Form Field Feedback**
- [ ] Inline error appears on field blur
- [ ] Success checkmark after validation passes
- [ ] Field highlights in red on error
- [ ] Help text displays below field
- [ ] Clear label shows what's required

---

## 3. Visibility

### What it means
Users should easily see and understand the current state of the system.

### Implementation Checklist

**Required Fields**
- [ ] Required fields marked with asterisk (*)
- [ ] HTML `required` attribute set
- [ ] Label clearly indicates requirement
- [ ] Error shown if left blank

```jsx
<FormInput
  label="Email"
  required={true}  // Shows asterisk
  error={emailError}
  helpText="We'll use this to send you updates"
/>
```

**Form State Indication**
- [ ] Disabled fields visually distinct (grayed out)
- [ ] Read-only fields clearly marked
- [ ] Loading fields show spinner
- [ ] Validation status shown (checkmark or warning)

**Page State Visibility**
- [ ] Loading state shown while data fetches
- [ ] Empty state shown if no data
- [ ] Error state shown if load fails
- [ ] All tabs/filters show active state clearly

**Data Tables/Lists**
- [ ] Current sort column highlighted
- [ ] Active filters shown with badge
- [ ] Total count displayed
- [ ] Selected rows highlighted

```jsx
// Show loading state
if (loading) return <LoadingSpinner />;

// Show empty state
if (data.length === 0) return <EmptyState message="No disasters recorded" />;

// Show error state
if (error) return <Alert type="error" title="Load Failed">{error}</Alert>;

// Show data
return <DataTable data={data} />;
```

---

## 4. Error Prevention & Recovery

### What it means
Minimize errors and help users recover from mistakes.

### Implementation Checklist

**Prevent Errors**
- [ ] Form validation before submission
- [ ] Required fields marked with asterisk
- [ ] Help text explains what's expected
- [ ] Examples provided for complex fields
- [ ] Format validation (email, phone, etc.)

**Confirm Destructive Actions**
```jsx
const handleDelete = (itemId) => {
  if (window.confirm('Are you sure? This cannot be undone.')) {
    API.delete(`/items/${itemId}`)
      .then(() => ToastManager.success('Deleted'))
      .catch(err => ToastManager.error(err.message));
  }
};

// Better: Custom modal
<ConfirmDialog
  title="Delete Item?"
  message="This action cannot be undone. Are you sure?"
  confirmText="Delete"
  cancelText="Keep It"
  variant="danger"
  onConfirm={() => handleDelete(itemId)}
/>
```

**Error Messages**
- [ ] Specific: "Email must contain @" not "Invalid input"
- [ ] Actionable: "Create account first" not "Account not found"
- [ ] Tell how to fix: Not just "Error"
- [ ] Use user language: Not technical jargon

```jsx
// ❌ BAD
error && <p>{error}</p>

// ✅ GOOD
error && (
  <Alert type="error" title="Validation Error">
    {error} Please check your input and try again.
  </Alert>
)
```

**Recovery Options**
- [ ] Undo button for important actions
- [ ] Ability to edit after creation
- [ ] Clear error messages explaining recovery
- [ ] "Try Again" button on network errors
- [ ] Unsaved changes warning before leaving

---

## 5. Mapping

### What it means
Controls should intuitively map to their effects.

### Implementation Checklist

**Button Labels**
- [ ] Use action verbs: "Save", "Delete", "Create"
- [ ] Not vague: "OK", "Submit" are OK but "Do It" is bad
- [ ] Consistent verbs across app
- [ ] 1-2 words maximum

**Icon Mapping**
- [ ] Edit icon for edit actions
- [ ] Trash icon for delete
- [ ] Plus icon for add/create
- [ ] Eye icon for view
- [ ] Save icon for save
- [ ] Common icons only (from Lucide)

**Form Fields**
- [ ] Field labels clearly describe what to enter
- [ ] Placeholders provide examples
- [ ] Help text explains context
- [ ] Validation errors explain what's wrong

```jsx
// Good mapping
<FormInput
  label="Affected Population"
  placeholder="e.g., 500 people"
  type="number"
  helpText="Total number of people affected by this disaster"
  validate={validateNumber}
/>
```

---

## 6. Learnability

### What it means
Users should learn the interface quickly without extensive training.

### Implementation Checklist

**Help & Guidance**
- [ ] Labels on all form fields
- [ ] Placeholder text shows examples
- [ ] Help text for complex fields
- [ ] Tooltips on buttons and icons
- [ ] Inline validation as user types

**Consistency Aids Learning**
- [ ] Same buttons always in same location
- [ ] Same icons always mean same thing
- [ ] Same colors always mean same thing
- [ ] No surprising behavior

**Documentation**
- [ ] User guide for complex features
- [ ] Keyboard shortcuts documented
- [ ] Help modal or tooltip buttons
- [ ] Clear navigation labels

**Onboarding**
- [ ] First-time users see tutorial
- [ ] Empty states explain what to do
- [ ] Contextual help on complex pages
- [ ] "Learn more" links throughout

### Example: Helpful Form

```jsx
import { FormInput, Button } from '../components';

<form>
  <FormInput
    label="Disaster Type"
    type="select"
    options={[
      { value: 'drought', label: 'Drought - prolonged dry period' },
      { value: 'flood', label: 'Flood - excessive water' },
    ]}
    required
    helpText="Select the primary type of disaster"
  />
  
  <FormInput
    label="Affected Population"
    type="number"
    placeholder="e.g., 1500"
    helpText="Estimated number of people affected"
    required
  />
  
  <FormInput
    label="Additional Notes"
    type="textarea"
    placeholder="Any other relevant information..."
    helpText="Be specific about damages and needs"
    rows={4}
  />
  
  <Button variant="primary" type="submit">
    Report Disaster
  </Button>
</form>
```

---

## Implementation Steps by Page

### Step 1: Audit Current Page
```latex
Review against 6 principles:
□ Consistency - Are elements styled uniformly?
□ Feedback - Are actions clearly responded to?
□ Visibility - Is state clearly shown?
□ Error Prevention - Are errors prevented/handled?
□ Mapping - Are controls intuitive?
□ Learnability - Is it easy to learn?
```

### Step 2: Update Components
```jsx
// Replace raw HTML with standard components
- <input /> → <FormInput />
- <button /> → <Button />
- <select /> → <FormSelect />
- <textarea /> → <FormTextarea />
- Custom alerts → <Alert /> or <Toast />
```

### Step 3: Add Validation
```jsx
// Add validation to all forms
<FormInput
  validate={(value) => {
    if (!value) return 'This field is required';
    if (!validFormat(value)) return 'Invalid format';
    return null;
  }}
/>
```

### Step 4: Add Feedback
```jsx
// Add toasts for all async operations
try {
  await API.post('/endpoint', data);
  ToastManager.success('✓ Saved successfully!');
} catch (err) {
  ToastManager.error('✗ ' + err.message);
}
```

### Step 5: Test & Iterate
- [ ] Keyboard navigation works
- [ ] Tab order makes sense
- [ ] Colors have sufficient contrast
- [ ] Mobile responsive
- [ ] Error messages are clear
- [ ] Loading states visible

---

## Quick Checklist for Every Form

```
BEFORE SUBMITTING A FORM PAGE:

CONSISTENCY
□ Using FormInput, FormSelect, FormTextarea components
□ Using Button component with correct variant
□ All colors match design system
□ All font sizes consistent
□ All spacing consistent

FEEDBACK
□ Form submission shows loading spinner
□ Success toast after save
□ Error toast on failure
□ Error messages inline on fields
□ Disabled state visible during load

VISIBILITY
□ Required fields marked with *
□ Field labels are clear
□ Help text explains purpose
□ Validation errors shown
□ Form state clearly shown

ERROR PREVENTION
□ All fields have validation
□ Validation error messages are specific
□ Sensitive actions require confirmation
□ Can't submit invalid form

MAPPING
□ Button labels use action verbs
□ Icons match their purpose
□ Submit button clearly labeled
□ Cancel button available

LEARNABILITY
□ Help text on complex fields
□ Placeholders show examples
□ Tooltips on icons/buttons
□ Clear field labels
□ Instructions for complex sections
```

---

## Common Issues & Solutions

### Issue: No feedback on button click
```jsx
// ❌ No feedback
<button onClick={save}>Save</button>

// ✅ With feedback
const [saving, setSaving] = useState(false);
const handleSave = async () => {
  setSaving(true);
  try {
    await API.post('/save', data);
    ToastManager.success('Saved!');
  } catch (err) {
    ToastManager.error(err.message);
  } finally {
    setSaving(false);
  }
};
<Button loading={saving} onClick={handleSave}>Save</Button>
```

### Issue: Inconsistent error display
```jsx
// ❌ Inconsistent
{error && <p style={{color: 'red'}}>{error}</p>}

// ✅ Consistent
{error && <Alert type="error">{error}</Alert>}

// In forms:
<FormInput error={fieldError} />
```

### Issue: No validation feedback
```jsx
// ❌ No feedback
<input type="email" />

// ✅ With validation
<FormInput
  type="email"
  error={errors.email}
  validate={validateEmail}
  helpText="example@domain.com"
/>
```

---

## Testing HCI Compliance

### Keyboard Navigation
- [ ] Tab through all form fields
- [ ] Can submit form with keyboard
- [ ] Focus indicators visible
- [ ] No keyboard traps

### Screen Reader
- [ ] Labels associated with inputs
- [ ] Errors announced with `role="alert"`
- [ ] Button text describes action
- [ ] Images have alt text

### Color Contrast
- [ ] Text contrast ≥ 4.5:1
- [ ] Don't rely on color alone
- [ ] Use patterns/icons too

### Mobile
- [ ] Touch targets ≥ 44x44px
- [ ] No horizontal scroll
- [ ] Readable on small screens
- [ ] Inputs use appropriate keyboard

---

## Resources

- **Component Library**: See DESIGN_SYSTEM.md
- **Validation Functions**: See utils/validation.js
- **Icons**: https://lucide.dev/
- **Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/
- **HCI Principles**: Nielsen's 10 Usability Heuristics

---

**Last Updated**: February 19, 2026
**Status**: Active
