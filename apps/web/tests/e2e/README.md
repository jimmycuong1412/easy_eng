# End-to-End Accessibility Testing

## Overview
This directory contains E2E accessibility tests that validate WCAG 2.1 Level AA compliance across the entire application using Playwright and @axe-core/playwright.

## Quick Start

### Run All Accessibility Tests
```bash
# From frontend directory
npx playwright test accessibility.spec.ts
```

### Run Tests in UI Mode
```bash
npx playwright test accessibility.spec.ts --ui
```

### View Last Test Report
```bash
npx playwright show-report
```

### Run Tests in Debug Mode
```bash
npx playwright test accessibility.spec.ts --debug
```

## Test Coverage

### Pages Tested
- ✅ Home Page
- ✅ Login Page
- ✅ Registration Page
- ✅ Student Dashboard
- ✅ Teacher Dashboard
- ✅ Parent Dashboard
- ✅ Admin Dashboard
- ✅ Class Catalog
- ✅ Teacher Classes
- ✅ Activity List
- ✅ Gem Shop
- ✅ Gem History

### Accessibility Checks
1. **WCAG Compliance**: All pages scanned for WCAG 2.1 Level A and AA violations
2. **Keyboard Navigation**: Tab/Shift+Tab navigation tested
3. **Form Labels**: All form inputs have proper labels
4. **Image Alt Text**: All images have descriptive alt text
5. **Color Contrast**: Text meets 4.5:1 contrast ratio
6. **HTML Lang**: Valid language attribute on html element
7. **Heading Hierarchy**: Proper h1-h6 structure
8. **Interactive Elements**: All clickable elements are keyboard accessible
9. **ARIA Attributes**: All ARIA attributes are valid
10. **Focus Indicators**: Focus states are visible
11. **Skip Links**: Skip to main content links present
12. **Live Regions**: Dynamic content changes announced

## Test Structure

### Test Files
```
tests/e2e/
├── accessibility.spec.ts    # Main accessibility test suite
└── README.md               # This file
```

### Test Categories
Tests are organized into describe blocks:
- WCAG 2.1 Level AA Compliance - Core violation checks
- Additional checks for specific accessibility features

## Understanding Test Results

### Success Output
```
✓ Login Page should have no accessibility violations
✓ All pages should support keyboard navigation
✓ Images should have alt text
```

### Failure Output
When tests fail, you'll see:
- Violation ID (e.g., `color-contrast`)
- Description of the issue
- Impact level (critical, serious, moderate, minor)
- Help URL with fix recommendations
- HTML snippet of the problematic element

Example:
```
color-contrast: Elements must have sufficient color contrast
  Impact: serious
  Help: https://dequeuniversity.com/rules/axe/4.11/color-contrast
  Element: <button class="text-gray-300 bg-gray-200">Submit</button>
```

## Fixing Violations

### Common Issues and Fixes

#### 1. Color Contrast
**Issue**: Text color doesn't contrast enough with background
**Fix**: Use darker text or lighter background
```tsx
// Bad
<button className="text-gray-400 bg-gray-300">Submit</button>

// Good
<button className="text-white bg-blue-600">Submit</button>
```

#### 2. Missing Alt Text
**Issue**: Images without alt attributes
**Fix**: Add descriptive alt text
```tsx
// Bad
<img src="/logo.png" />

// Good
<img src="/logo.png" alt="Easy English Learning Platform Logo" />
```

#### 3. Form Labels
**Issue**: Input fields without labels
**Fix**: Add proper label association
```tsx
// Bad
<input type="text" />

// Good
<label htmlFor="username">Username</label>
<input type="text" id="username" />
```

#### 4. Keyboard Navigation
**Issue**: Interactive elements not keyboard accessible
**Fix**: Use semantic HTML or add tabindex
```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button onClick={handleClick}>Click me</button>
```

#### 5. ARIA Attributes
**Issue**: Invalid or missing ARIA attributes
**Fix**: Use proper ARIA roles and attributes
```tsx
// Bad
<div role="button">Click me</div>

// Good
<div role="button" tabIndex={0} aria-label="Submit form">Click me</div>
// Or better: <button>Click me</button>
```

## Configuration

### Axe-core Configuration
Tests use these WCAG tags:
- `wcag2a` - WCAG 2.0 Level A
- `wcag2aa` - WCAG 2.0 Level AA
- `wcag21a` - WCAG 2.1 Level A
- `wcag21aa` - WCAG 2.1 Level AA

### Playwright Configuration
See `playwright.config.ts` for:
- Browser configurations
- Viewport sizes
- Test timeouts
- Reporter settings

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically on:
- Push to main/develop branches
- Pull requests to main/develop

### Workflow Behavior
1. Installs dependencies
2. Builds application
3. Runs accessibility tests
4. Uploads test reports
5. Posts results as PR comment
6. **Fails build if violations found**

### PR Comments
When accessibility tests run in CI, you'll see a comment like:
```
### Accessibility Test Results (WCAG 2.1 Level AA)

- Total Tests: 20
- Passed: 20
- Failed: 0
- Errors: 0

✅ All accessibility tests passed!
Application is WCAG 2.1 Level AA compliant.
```

## Best Practices

### Writing Accessible Code
1. **Use Semantic HTML**: `<button>`, `<a>`, `<nav>`, `<main>`, etc.
2. **Add ARIA When Needed**: Only when semantic HTML isn't enough
3. **Keyboard First**: Ensure everything works with keyboard
4. **Test with Screen Readers**: Manual testing supplements automated tests
5. **Follow Design System**: Use pre-validated components when available

### Running Tests During Development
```bash
# Quick check
npm run test:a11y

# Watch mode
npx playwright test accessibility.spec.ts --watch

# Specific page
npx playwright test accessibility.spec.ts --grep "Login Page"
```

### Debugging Failed Tests
```bash
# Run in headed mode to see browser
npx playwright test accessibility.spec.ts --headed

# Run in debug mode with inspector
npx playwright test accessibility.spec.ts --debug

# Generate trace for analysis
npx playwright test accessibility.spec.ts --trace on
```

## Additional Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse in Chrome DevTools](https://developers.google.com/web/tools/lighthouse)

### Screen Readers
- **Windows**: NVDA (free), JAWS (paid)
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca (free)
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

### Playwright Documentation
- [Playwright Testing Library](https://playwright.dev/)
- [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)

## Troubleshooting

### Tests Failing Locally But Passing in CI
- Ensure you're using the same Node version as CI
- Clear Playwright cache: `npx playwright install --force`
- Check for environment-specific styles

### Tests Timing Out
- Increase timeout in playwright.config.ts
- Check if app is running on correct port
- Ensure no blocking network requests

### False Positives
- Some violations may be intentional (e.g., decorative images)
- Use exclude selectors if needed:
```typescript
const builder = new AxeBuilder({ page })
  .withTags(['wcag2aa'])
  .exclude('.decorative-image');
```

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Group related tests in describe blocks
3. Use descriptive test names
4. Add comments for complex checks
5. Test both success and failure cases

### Updating Configuration
1. Update playwright.config.ts for global changes
2. Update individual test files for specific configurations
3. Document any changes in this README
4. Test changes locally before committing

## Support

### Getting Help
- Check test output for specific violation details
- Review linked help URLs from axe-core
- Consult WCAG documentation
- Ask team members familiar with accessibility
- Test with actual screen readers for context

### Reporting Issues
When reporting accessibility test issues, include:
1. Test file name and line number
2. Full error message
3. Browser/OS information
4. Steps to reproduce
5. Expected vs actual behavior

---

**Remember**: Automated testing catches ~30-50% of accessibility issues. Manual testing with assistive technologies is essential for full compliance.
