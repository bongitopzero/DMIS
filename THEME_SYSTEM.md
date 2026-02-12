# Light and Dark Mode Theme System

## Overview
The DMIS system now includes a comprehensive light and dark mode theme system with smooth transitions and persistent user preferences.

## Features Implemented

### 1. **Theme Context Provider**
- **File**: `dmis-ui/src/contexts/ThemeContext.js`
- Manages global theme state (light/dark)
- Persists theme preference in localStorage
- Detects system color scheme preference on first load
- Provides `useTheme()` hook for components

### 2. **CSS Variables System**
- **File**: `dmis-ui/src/index.css`
- Comprehensive set of CSS variables for both themes
- Includes colors for:
  - Backgrounds (primary, secondary, tertiary)
  - Text (primary, secondary, tertiary)
  - Borders and shadows
  - Cards and inputs
  - Sidebar and navbar
  - Status colors (success, warning, danger, info, primary)

### 3. **Theme Toggle Button**
- Located in the navbar (top-right)
- Shows Moon icon in light mode, Sun icon in dark mode
- Smooth hover effects and transitions

### 4. **Updated Components**
All major components now use CSS theme variables:
- ✅ Navbar
- ✅ Sidebar
- ✅ Dashboard
- ✅ Disaster Events
- ✅ Map Page
- ✅ Fund Management
- ✅ Forecasting
- ✅ Incident List
- ✅ All card and form elements

## Theme Variables Reference

### Light Mode Colors
```css
--bg-primary: #ffffff
--bg-secondary: #f8f9fa
--bg-tertiary: #e9ecef
--text-primary: #212529
--text-secondary: #6c757d
--card-bg: #ffffff
--sidebar-bg: #2c3e50
--navbar-bg: #ffffff
```

### Dark Mode Colors
```css
--bg-primary: #1a1d23
--bg-secondary: #22262e
--bg-tertiary: #2a2f39
--text-primary: #e4e6eb
--text-secondary: #b0b3b8
--card-bg: #22262e
--sidebar-bg: #1e2229
--navbar-bg: #22262e
```

## Usage in Components

### Using the Theme Hook
```javascript
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

### Using CSS Variables in Styles
```css
.my-component {
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

## Key Features

### 1. **Persistent Preferences**
- Theme choice is saved to localStorage
- Automatically restored on page reload
- Key: `dmis-theme` (values: `"light"` or `"dark"`)

### 2. **System Preference Detection**
- On first visit, detects system color scheme preference
- Uses `prefers-color-scheme` media query
- Defaults to light mode if no system preference

### 3. **Smooth Transitions**
- All color changes include 0.3s ease transitions
- Prevents jarring switches between themes
- Applied to backgrounds, text, borders, and shadows

### 4. **Accessibility**
- High contrast ratios in both modes
- Clear visual hierarchy maintained
- Icon indicators for current theme

## Testing the Theme System

### Manual Testing Checklist
1. ✅ Click theme toggle button in navbar
2. ✅ Verify all pages update immediately
3. ✅ Check sidebar colors change
4. ✅ Verify card backgrounds update
5. ✅ Test input fields and forms
6. ✅ Check map and chart pages
7. ✅ Reload page - theme should persist
8. ✅ Check all text remains readable

### Browser Testing
- Tested on: Chrome, Edge, Firefox
- Mobile responsive: Yes
- System preference detection: Yes

## Color Scheme Philosophy

### Light Mode
- Clean, bright workspace
- High readability for daytime use
- Professional appearance
- Traditional document feel

### Dark Mode
- Reduced eye strain in low light
- Modern, sleek appearance
- Better for night-time use
- Energy efficient on OLED screens

## Transition Effects
All theme transitions use:
```css
transition: background-color 0.3s ease, color 0.3s ease;
```

## Future Enhancements (Optional)
- [ ] Add custom theme colors (allow user to choose accent color)
- [ ] Add high contrast mode for accessibility
- [ ] Implement theme scheduling (auto-switch based on time)
- [ ] Add theme preview before switching
- [ ] Create additional theme variants (blue, green, etc.)

## Technical Notes

### Theme Application
- Theme is applied via `data-theme` attribute on `document.documentElement`
- Example: `<html data-theme="dark">`
- All CSS variables are scoped to `:root[data-theme="light"]` and `:root[data-theme="dark"]`

### Performance
- Theme changes are instant (no re-renders required)
- CSS variables provide optimal performance
- Minimal JavaScript overhead
- No flash of unstyled content (FOUC)

## Troubleshooting

### Theme Not Persisting
- Clear browser localStorage
- Check console for errors
- Verify ThemeProvider wraps entire app

### Colors Not Changing
- Ensure component CSS uses CSS variables (not hardcoded colors)
- Check for `!important` overrides
- Verify transition properties are set

### Toggle Button Not Working
- Check ThemeContext import in navbar
- Verify useTheme hook is called correctly
- Check for JavaScript errors in console

## Files Modified
1. `dmis-ui/src/contexts/ThemeContext.js` - NEW (Theme provider)
2. `dmis-ui/src/index.css` - Theme variables added
3. `dmis-ui/src/App.js` - Wrapped with ThemeProvider
4. `dmis-ui/src/App.css` - Updated with theme variables
5. `dmis-ui/src/components/navbar.jsx` - Added toggle button
6. `dmis-ui/src/components/navbar.css` - Theme variables
7. `dmis-ui/src/components/sidebar.css` - Theme variables
8. All page and component CSS files - Updated with theme variables

## Support
For issues or questions about the theme system, check:
- Browser console for errors
- LocalStorage for theme value
- CSS variables in DevTools
- Component render tree in React DevTools
