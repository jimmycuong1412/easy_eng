# Accessibility Quick Reference Guide

**For Developers**: Quick guide to maintaining WCAG 2.1 Level AA compliance

---

## 🎯 Quick Checklist

When creating new components:

- [ ] Add `aria-label` to icon-only buttons
- [ ] Mark decorative icons with `aria-hidden="true"`
- [ ] Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] Ensure 4.5:1 color contrast ratio
- [ ] Add visible focus indicators
- [ ] Pair form inputs with `<label>`
- [ ] Add `role="alert"` for errors
- [ ] Add `role="status"` for success messages
- [ ] Test keyboard-only navigation

---

## 🔧 Common Patterns

### Icon Buttons
```tsx
<Button size="icon" aria-label="Close dialog">
  <X className="w-4 h-4" aria-hidden="true" />
</Button>
```

### Loading States
```tsx
<Button isLoading aria-label="Saving changes">
  Save
</Button>
```

### Form Inputs
```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-hint"
/>
<p id="email-hint">We'll never share your email</p>
```

### Live Regions
```tsx
<div role="alert" aria-live="assertive" aria-atomic="true">
  Error: Please fix the form
</div>

<div role="status" aria-live="polite">
  Changes saved successfully
</div>
```

---

## 🧪 Testing

### Automated
```bash
npm run e2e -- accessibility.spec.ts
```

### Manual
1. **Keyboard**: Tab through page (all elements reachable)
2. **Screen Reader**: Test with NVDA or VoiceOver
3. **Zoom**: Test at 200% zoom
4. **Color**: Use browser contrast checker

### Test Page
Visit `/accessibility` for comprehensive manual testing

---

## 📚 Resources

- **Audit**: `docs/accessibility-audit.md`
- **Test Page**: `/accessibility`
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Last Updated**: 2026-02-04
