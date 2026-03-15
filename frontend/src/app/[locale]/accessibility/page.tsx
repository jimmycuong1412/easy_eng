/**
 * Accessibility Testing Page
 *
 * Purpose: Comprehensive page for manual screen reader testing and keyboard navigation validation
 * Tests: WCAG 2.1 Level AA compliance across all common UI patterns
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AccessibilityTestForm from './AccessibilityTestForm';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Home,
  Book,
  GraduationCap,
  Star,
  Bell,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accessibility Testing',
  description:
    'Comprehensive accessibility testing page for screen readers and keyboard navigation',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccessibilityTestPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Page Header */}
        <header>
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Accessibility Testing Suite
          </h1>
          <p className="text-lg text-text-secondary">
            This page contains all common UI patterns for manual accessibility testing with
            screen readers (NVDA, JAWS, VoiceOver) and keyboard-only navigation.
          </p>
        </header>

        {/* Skip Links Test */}
        <section aria-labelledby="skip-links-heading">
          <h2 id="skip-links-heading" className="text-2xl font-semibold text-text-primary mb-4">
            1. Skip Links
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
            <p className="text-text-secondary mb-4">
              Test: Press Tab from the top of the page. A "Skip to main content" link should
              appear.
            </p>
            <div className="bg-success/10 p-4 rounded border border-success/20">
              <p className="text-success text-sm">
                ✓ Skip link implemented in root layout at{' '}
                <code className="font-mono">frontend/src/app/[locale]/layout.tsx:132-137</code>
              </p>
            </div>
          </div>
        </section>

        {/* Heading Hierarchy Test */}
        <section aria-labelledby="heading-hierarchy-heading">
          <h2 id="heading-hierarchy-heading" className="text-2xl font-semibold text-text-primary mb-4">
            2. Heading Hierarchy
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary space-y-4">
            <p className="text-text-secondary">
              Test: Use screen reader heading navigation (H key in NVDA/JAWS). Headings should
              follow logical order.
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-text-primary">H1: Main Page Title</h1>
              <h2 className="text-2xl font-semibold text-text-primary">H2: Section Title</h2>
              <h3 className="text-xl font-medium text-text-primary">H3: Subsection Title</h3>
              <h4 className="text-lg font-medium text-text-primary">H4: Sub-subsection</h4>
            </div>
          </div>
        </section>

        {/* Interactive Elements Test */}
        <section aria-labelledby="interactive-heading">
          <h2 id="interactive-heading" className="text-2xl font-semibold text-text-primary mb-4">
            3. Keyboard Navigation & Focus
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary space-y-4">
            <p className="text-text-secondary mb-4">
              Test: Use Tab to navigate through all interactive elements. Focus should be clearly
              visible.
            </p>

            {/* Buttons */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-text-primary">Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="default" aria-label="Primary action button">
                  Primary Button
                </Button>
                <Button variant="secondary" aria-label="Secondary action button">
                  Secondary Button
                </Button>
                <Button variant="destructive" aria-label="Delete action button">
                  Delete Button
                </Button>
                <Button variant="outline" aria-label="Outline style button">
                  Outline Button
                </Button>
                <Button variant="ghost" aria-label="Ghost style button">
                  Ghost Button
                </Button>
                <Button isLoading aria-label="Loading button example">
                  Loading...
                </Button>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-text-primary">Links</h3>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="text-accent-primary hover:underline">
                  Home Page
                </Link>
                <Link href="/classes" className="text-accent-primary hover:underline">
                  Browse Classes
                </Link>
                <a
                  href="https://example.com"
                  className="text-accent-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="External link to example website (opens in new tab)"
                >
                  External Link
                </a>
              </div>
            </div>

            {/* Icon Buttons */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-text-primary">Icon Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="icon" variant="outline" aria-label="Go to home page">
                  <Home className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="outline" aria-label="View my courses">
                  <Book className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="outline" aria-label="Teacher dashboard">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="outline" aria-label="View favorites">
                  <Star className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="outline" aria-label="Open notifications">
                  <Bell className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Elements Test */}
        <section aria-labelledby="forms-heading">
          <h2 id="forms-heading" className="text-2xl font-semibold text-text-primary mb-4">
            4. Form Labels & Instructions
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
            <p className="text-text-secondary mb-4">
              Test: Use screen reader forms mode. All inputs should have clear labels and
              instructions.
            </p>

            <AccessibilityTestForm />
          </div>
        </section>

        {/* ARIA Live Regions Test */}
        <section aria-labelledby="live-regions-heading">
          <h2 id="live-regions-heading" className="text-2xl font-semibold text-text-primary mb-4">
            5. ARIA Live Regions
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary space-y-4">
            <p className="text-text-secondary mb-4">
              Test: Click buttons below. Screen reader should announce changes without focus
              movement.
            </p>

            {/* Success Message */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-lg"
            >
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-success mb-1">Success!</h3>
                <p className="text-sm text-success/90">Your changes have been saved successfully.</p>
              </div>
            </div>

            {/* Error Message */}
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="flex items-start gap-3 p-4 bg-error/10 border border-error/20 rounded-lg"
            >
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-error mb-1">Error!</h3>
                <p className="text-sm text-error/90">
                  Please correct the errors in the form before submitting.
                </p>
              </div>
            </div>

            {/* Info Message */}
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-3 p-4 bg-info/10 border border-info/20 rounded-lg"
            >
              <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-info mb-1">Information</h3>
                <p className="text-sm text-info/90">Your session will expire in 5 minutes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Color Contrast Test */}
        <section aria-labelledby="contrast-heading">
          <h2 id="contrast-heading" className="text-2xl font-semibold text-text-primary mb-4">
            6. Color Contrast (WCAG AA)
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary space-y-4">
            <p className="text-text-secondary mb-4">
              Test: Use browser contrast checker. All text should meet 4.5:1 ratio (3:1 for large
              text).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-primary rounded">
                <p className="text-text-primary">Primary Text (High Contrast)</p>
              </div>
              <div className="p-4 bg-bg-primary rounded">
                <p className="text-text-secondary">Secondary Text (Medium Contrast)</p>
              </div>
              <div className="p-4 bg-accent-primary rounded">
                <p className="text-white">White on Accent (High Contrast)</p>
              </div>
              <div className="p-4 bg-success rounded">
                <p className="text-white">Success Message Text</p>
              </div>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts Reference */}
        <section aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className="text-2xl font-semibold text-text-primary mb-4">
            7. Keyboard Shortcuts Reference
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
            <table className="w-full text-left">
              <caption className="text-left text-text-secondary mb-4">
                Common screen reader keyboard shortcuts for testing
              </caption>
              <thead>
                <tr className="border-b border-border-primary">
                  <th scope="col" className="py-2 px-4 font-medium text-text-primary">Action</th>
                  <th scope="col" className="py-2 px-4 font-medium text-text-primary">NVDA/JAWS</th>
                  <th scope="col" className="py-2 px-4 font-medium text-text-primary">VoiceOver</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-primary/50">
                  <td className="py-2 px-4 text-text-secondary">Navigate headings</td>
                  <td className="py-2 px-4 text-text-primary font-mono">H</td>
                  <td className="py-2 px-4 text-text-primary font-mono">VO + Cmd + H</td>
                </tr>
                <tr className="border-b border-border-primary/50">
                  <td className="py-2 px-4 text-text-secondary">Navigate links</td>
                  <td className="py-2 px-4 text-text-primary font-mono">K</td>
                  <td className="py-2 px-4 text-text-primary font-mono">VO + Cmd + L</td>
                </tr>
                <tr className="border-b border-border-primary/50">
                  <td className="py-2 px-4 text-text-secondary">Navigate forms</td>
                  <td className="py-2 px-4 text-text-primary font-mono">F</td>
                  <td className="py-2 px-4 text-text-primary font-mono">VO + Cmd + J</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-text-secondary">Navigate landmarks</td>
                  <td className="py-2 px-4 text-text-primary font-mono">D</td>
                  <td className="py-2 px-4 text-text-primary font-mono">VO + U</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Testing Checklist */}
        <section aria-labelledby="checklist-heading">
          <h2 id="checklist-heading" className="text-2xl font-semibold text-text-primary mb-4">
            Manual Testing Checklist
          </h2>
          <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
            <ul className="space-y-2 text-text-secondary" role="list">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Skip link appears on Tab and works correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>All headings follow logical hierarchy (H1 → H2 → H3)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Focus indicators are clearly visible on all interactive elements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>All form inputs have associated labels</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Dynamic content changes are announced by screen readers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Color contrast meets WCAG AA standards (4.5:1)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Page can be navigated entirely with keyboard (no mouse required)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" aria-hidden="true" />
                <span>Images have appropriate alt text or are marked decorative</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border-primary pt-8">
          <p className="text-text-secondary text-sm">
            For automated testing, run: <code className="font-mono bg-bg-secondary px-2 py-1 rounded">npm run e2e -- accessibility.spec.ts</code>
          </p>
          <p className="text-text-secondary text-sm mt-2">
            For more information, see:{' '}
            <a href="/docs/accessibility-audit.md" className="text-accent-primary hover:underline">
              Accessibility Audit Documentation
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
