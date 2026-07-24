# Bright Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bright, white-canvas "playful & energetic" theme for the EasyEng web app with a persistent bright/dark toggle, and refocus the landing page on the platform's free features — delivered page by page so unmigrated pages keep working.

**Architecture:** All pages share one set of CSS variables defined in `apps/web/src/app/globals.css`. Today those variables hold dark "Direction C" indigo values. We convert Tailwind's color tokens (`apps/web/tailwind.config.ts`) from literal hexes to `var(--token)` references so a single utility set drives both themes. We add a `.bright` block in `globals.css` that redefines the same variable names with the light palette, plus `.bright .et-*` overrides for the handful of hardcoded hexes in the `et-*` component system. A migrated page opts in by wrapping its subtree in a container that carries the theme class; a `ThemeProvider` + `<html>` class drives the choice, persisted in `localStorage`, with a pre-hydration inline script to prevent flash. Unmigrated pages carry no `.bright` wrapper and are visually untouched.

**Tech Stack:** Next.js 14.2 (App Router, `[locale]` routing), TypeScript 5.4, Tailwind CSS (`darkMode: 'class'`, already set), next-intl, Zustand-free theme state (React context + localStorage), Playwright + Axe for verification.

## Global Constraints

- Web app only: `apps/web`. Do NOT touch `apps/mobile`.
- Migration is page-by-page (Approach B). A page is "bright" only once its phase migrates it; never flip values at `:root` until the final cleanup task.
- Bright is the DEFAULT theme on migrated pages; dark is available via toggle. Unmigrated pages remain dark always.
- Vietnamese-first copy: every new user-facing string gets both `messages/vi.json` and `messages/en.json` entries. Vietnamese is the primary market.
- All text tokens must meet WCAG AA (4.5:1 contrast) against their intended background in BOTH themes.
- Never rename existing CSS variable names or Tailwind token keys — only change their VALUES to `var(...)` and add `.bright` overrides. ~46 component files consume classes like `bg-bg-primary` / `text-text-primary`; they must keep working unchanged.
- Do not remove the existing `et-*` global styles; the landing and auth pages depend on them.
- Frequent commits: one commit per task minimum.
- Bright palette values (Direction D), copy verbatim into `.bright`:
  - `--bg-primary: #ffffff`
  - `--bg-secondary: #f6f7fd`
  - `--bg-surface: #eef0fb`
  - `--bg-elevated: #ffffff`
  - `--accent-primary: #6d4aff`
  - `--accent-secondary: #3b5bff`
  - `--accent-gold: #f59e0b`
  - `--accent-gem: #ec4899`
  - `--accent-cookie: #ff7a59`
  - `--color-success: #10b981`
  - `--color-warning: #d97706`
  - `--color-error: #dc2626`
  - `--text-primary: #0f1436`
  - `--text-secondary: #4a5178`
  - `--text-muted: #7c82a8`
  - `--border-default: rgba(15, 20, 54, 0.08)`
  - `--border-focus: #6d4aff`
  - `--shadow-glow: 0 8px 24px -8px rgba(109, 74, 255, 0.22)`
  - `--shadow-glow-lg: 0 20px 40px -20px rgba(109, 74, 255, 0.28)`
  - `--shadow-card-hover: 0 20px 40px -20px rgba(15, 20, 54, 0.12)`

---

## File Structure

**Theme infrastructure (Phase 0):**
- `apps/web/tailwind.config.ts` — color tokens become `var(--token)` references.
- `apps/web/src/app/globals.css` — add `.bright { … }` variable block, `.bright` overrides for body background / `et-*` hardcoded hexes / component layer (`.btn`, `.card`, `.input`, `.glass`, `.skeleton`), and a `.bright` gradient-text/glow adjustment.
- `apps/web/src/components/theme/ThemeProvider.tsx` — Create. Context + localStorage, applies class to `<html>`.
- `apps/web/src/components/theme/ThemeToggle.tsx` — Create. Button that flips theme.
- `apps/web/src/components/theme/theme-script.ts` — Create. Pre-hydration inline script string.
- `apps/web/src/components/theme/index.ts` — Create. Barrel export.
- `apps/web/src/app/[locale]/layout.tsx` — Modify. Inject inline theme script, wrap children in `ThemeProvider`.

**Landing + auth (Phase 1):**
- `apps/web/src/app/[locale]/page.tsx` — Modify. Root wrapper `bright`, reorder to free-first, add ThemeToggle to header, point hero CTA at signup.
- `apps/web/src/app/[locale]/auth/layout.tsx` — Modify. Root wrapper `bright`, tune ambient glows for light bg.
- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — Modify. New/updated landing copy.

**Free-feature pages (Phase 2):** wrap layout roots in `bright`:
- `apps/web/src/app/[locale]/materials/page.tsx`, `ai-tools/page.tsx`, `quiz/page.tsx`, `leaderboard/page.tsx`, `learning-path/page.tsx` (+ their nested layouts where present).

**App surfaces (Phases 3–4):** dashboard, notifications, settings, booking, classes, class (live), teacher, admin — same wrapper approach, hand-tuning per page.

**Cleanup (final):** move bright values to `:root`, indigo under `.dark`, remove `.bright` wrappers, make toggle global.

---

## Task 1: Convert Tailwind color tokens to CSS variables

**Files:**
- Modify: `apps/web/tailwind.config.ts:12-56`
- Modify: `apps/web/src/app/globals.css` (verify every referenced variable exists in `:root`)

**Interfaces:**
- Produces: Tailwind color utilities (`bg-bg-primary`, `text-text-primary`, `border-border-default`, `bg-accent-primary`, etc.) now resolve to `var(--token)` instead of literal hexes, so redefining the variable in a `.bright` scope reskins them.

- [ ] **Step 1: Confirm the variable inventory**

Run: `grep -nE "^\s*--(bg|text|accent|color|border|shadow)" apps/web/src/app/globals.css`
Expected: `:root` defines `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--bg-elevated`, `--accent-primary`, `--accent-secondary`, `--accent-gold`, `--accent-gem`, `--accent-cookie`, `--color-success`, `--color-warning`, `--color-error`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-default`, `--border-focus`. (These already exist per current file.)

- [ ] **Step 2: Rewrite the `colors` block to reference variables**

In `apps/web/tailwind.config.ts`, replace the `colors: { … }` object (lines 12–56) with variable references. Keep every KEY identical; change only VALUES:

```ts
colors: {
  'bg-primary': 'var(--bg-primary)',
  'bg-secondary': 'var(--bg-secondary)',
  'bg-surface': 'var(--bg-surface)',
  'bg-elevated': 'var(--bg-elevated)',

  'accent-primary': 'var(--accent-primary)',
  'accent-secondary': 'var(--accent-secondary)',
  'accent-gold': 'var(--accent-gold)',
  'accent-gem': 'var(--accent-gem)',
  'accent-cookie': 'var(--accent-cookie)',

  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',

  'text-primary': 'var(--text-primary)',
  'text-secondary': 'var(--text-secondary)',
  'text-muted': 'var(--text-muted)',

  'border-default': 'var(--border-default)',
  'border-focus': 'var(--border-focus)',

  // Shadcn/ui foreground & semantic tokens
  'primary-foreground': 'var(--primary-foreground, #ffffff)',
  'secondary-foreground': 'var(--secondary-foreground, #f5f7ff)',
  destructive: 'var(--color-error)',
  'destructive-foreground': 'var(--destructive-foreground, #ffffff)',
  'accent-foreground': 'var(--accent-foreground, #f5f7ff)',
  accent: 'var(--bg-surface)',
  background: 'var(--bg-secondary)',
  foreground: 'var(--text-primary)',
  input: 'var(--input, rgba(91, 141, 255, 0.20))',
  ring: 'var(--border-focus)',

  'surface-base': 'var(--bg-primary)',
  'surface-elevated': 'var(--bg-secondary)',
  'text-subtle': 'var(--text-subtle, #5b6093)',
},
```

- [ ] **Step 3: Add the missing `:root` fallback variables**

In `apps/web/src/app/globals.css`, inside `:root` (after `--border-focus`), add the shadcn-alias variables so dark theme is byte-identical to today:

```css
  /* Shadcn alias tokens (values match the previous literal hexes) */
  --primary-foreground: #ffffff;
  --secondary-foreground: #f5f7ff;
  --destructive-foreground: #ffffff;
  --accent-foreground: #f5f7ff;
  --input: rgba(91, 141, 255, 0.20);
  --text-subtle: #5b6093;
```

- [ ] **Step 4: Build to confirm no regression**

Run: `cd apps/web && npx tailwindcss -i src/app/globals.css -o /tmp/tw-check.css --content "src/**/*.tsx" 2>&1 | tail -5` (or `npm run build` if the standalone CLI is unavailable).
Expected: builds with no errors; generated CSS contains `var(--bg-primary)` in utility rules.

- [ ] **Step 5: Visual sanity check the dark theme is unchanged**

Start the dev server (via preview_start, name from `.claude/launch.json`; create the entry `{ "name": "web", "runtimeExecutable": "npm", "runtimeArgs": ["run","dev"], "port": 3000 }` if missing). Navigate to `http://localhost:3000/vi`. Screenshot.
Expected: landing page looks identical to before (still dark indigo). Token → variable swap is invisible when values are unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css
git commit -m "refactor(theme): back Tailwind color tokens with CSS variables"
```

---

## Task 2: Add the `.bright` palette and component overrides

**Files:**
- Modify: `apps/web/src/app/globals.css` (append a `.bright` section near the end, after the `et-*` block)

**Interfaces:**
- Produces: a `.bright` class that, applied to any subtree, redefines the theme variables to the light palette and overrides the dark-tuned literals in the component layer and `et-*` system.

- [ ] **Step 1: Add the `.bright` variable block**

Append to `apps/web/src/app/globals.css`:

```css
/* ============================================================
   .bright — Direction D light theme (opt-in per migrated page).
   Redefines the same variable names as :root with light values.
   ============================================================ */
.bright {
  --bg-primary: #ffffff;
  --bg-secondary: #f6f7fd;
  --bg-surface: #eef0fb;
  --bg-elevated: #ffffff;

  --accent-primary: #6d4aff;
  --accent-secondary: #3b5bff;
  --accent-gold: #f59e0b;
  --accent-gem: #ec4899;
  --accent-cookie: #ff7a59;

  --color-success: #10b981;
  --color-warning: #d97706;
  --color-error: #dc2626;

  --text-primary: #0f1436;
  --text-secondary: #4a5178;
  --text-muted: #7c82a8;
  --text-subtle: #9aa0c4;

  --border-default: rgba(15, 20, 54, 0.08);
  --border-focus: #6d4aff;

  --shadow-glow: 0 8px 24px -8px rgba(109, 74, 255, 0.22);
  --shadow-glow-lg: 0 20px 40px -20px rgba(109, 74, 255, 0.28);
  --shadow-card-hover: 0 20px 40px -20px rgba(15, 20, 54, 0.12);

  /* et-* aliases */
  --et-bg: #ffffff;
  --et-bg-2: #f6f7fd;
  --et-bg-3: #eef0fb;
  --et-bg-4: #ffffff;
  --et-line: rgba(15, 20, 54, 0.08);
  --et-line-2: rgba(109, 74, 255, 0.18);
  --et-fg: #0f1436;
  --et-fg-2: #4a5178;
  --et-fg-3: #7c82a8;
  --et-fg-4: #9aa0c4;
  --et-violet: #6d4aff;
  --et-violet-2: #8b6bff;
  --et-blue: #3b5bff;
  --et-green: #10b981;
  --et-amber: #f59e0b;

  --primary-foreground: #ffffff;
  --secondary-foreground: #0f1436;
  --accent-foreground: #0f1436;
  --input: rgba(15, 20, 54, 0.12);

  color-scheme: light;
  background: #ffffff;
  color: var(--text-primary);
}
```

- [ ] **Step 2: Add `.bright` body-background and page-canvas override**

The dark radial body background is on `body` and won't respond to a `.bright` subtree. Add a light canvas + faint radial tints for `.bright` roots:

```css
.bright {
  background:
    radial-gradient(ellipse 70% 45% at 50% 0%, rgba(109, 74, 255, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 55% 40% at 100% 20%, rgba(59, 91, 255, 0.05) 0%, transparent 60%),
    #ffffff;
  min-height: 100vh;
}
```

- [ ] **Step 3: Override the component layer for `.bright`**

The `.btn-secondary`, `.btn-ghost`, `.card`, `.glass`, `.input`, `.skeleton`, gradient-text classes use hardcoded dark hexes. Add bright overrides:

```css
/* Component layer — .bright overrides */
.bright .btn-secondary {
  background: #ffffff;
  border: 1px solid rgba(15, 20, 54, 0.12);
  color: var(--text-primary);
}
.bright .btn-secondary:hover { background: #f6f7fd; border-color: rgba(109, 74, 255, 0.40); }
.bright .btn-ghost:hover { background: #f6f7fd; color: var(--text-primary); }

.bright .card,
.bright .glass {
  background: #ffffff;
  border: 1px solid rgba(15, 20, 54, 0.08);
  box-shadow: 0 1px 3px rgba(15, 20, 54, 0.06), 0 8px 24px -16px rgba(15, 20, 54, 0.12);
}
.bright .card:hover { box-shadow: var(--shadow-card-hover); }
.bright .card-elevated { background: #ffffff; }

.bright .input {
  background: #ffffff;
  border: 1px solid rgba(15, 20, 54, 0.12);
  color: var(--text-primary);
}

.bright .skeleton {
  background: linear-gradient(90deg, #eef0fb 0%, #f6f7fd 50%, #eef0fb 100%);
  background-size: 400% 100%;
}

.bright .text-gradient {
  background: linear-gradient(120deg, #6d4aff 0%, #5b4bff 50%, #3b5bff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.bright .glow-gold { box-shadow: 0 4px 12px -4px rgba(245, 158, 11, 0.35); }
.bright .glow-gem  { box-shadow: 0 4px 12px -4px rgba(236, 72, 153, 0.30); }
.bright .glow-cookie { box-shadow: 0 4px 12px -4px rgba(255, 122, 89, 0.30); }
```

- [ ] **Step 4: Override focus ring offset color for `.bright`**

```css
.bright :focus-visible { --tw-ring-offset-color: #ffffff; }
```

- [ ] **Step 5: Temporarily add `bright` to the landing root and screenshot**

In `apps/web/src/app/[locale]/page.tsx`, find the outermost returned element and add `bright` to its className (temporary — Task 5 makes it permanent). Reload the dev server preview at `/vi`.
Expected: landing renders on a white canvas, ink-navy text, violet/blue accents; text is readable (no light-on-light). Note any element still dark-on-dark or unreadable for Task 5/Phase-2 tuning.

- [ ] **Step 6: Revert the temporary `bright` class**

Remove the temporary `bright` from `page.tsx` (Task 5 reintroduces it properly).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(theme): add .bright light palette and component overrides"
```

---

## Task 3: ThemeProvider, toggle, and anti-flash script

**Files:**
- Create: `apps/web/src/components/theme/ThemeProvider.tsx`
- Create: `apps/web/src/components/theme/ThemeToggle.tsx`
- Create: `apps/web/src/components/theme/theme-script.ts`
- Create: `apps/web/src/components/theme/index.ts`
- Test: `apps/web/src/components/theme/__tests__/ThemeProvider.test.tsx`

**Interfaces:**
- Produces:
  - `ThemeProvider` — client component. Props: `{ children: React.ReactNode }`. Reads/writes `localStorage['easyeng-theme']` (values `'bright' | 'dark'`, default `'bright'`), toggles class `bright` / `dark` on `document.documentElement`.
  - `useTheme()` — returns `{ theme: 'bright' | 'dark', toggle: () => void, setTheme: (t) => void }`.
  - `ThemeToggle` — client component, renders a button that calls `toggle()`; shows sun icon in dark mode, moon in bright mode. Props: `{ className?: string }`.
  - `THEME_SCRIPT` — a string of IIFE JS for the pre-hydration `<script dangerouslySetInnerHTML>`; reads localStorage and sets the initial `<html>` class before paint.

- [ ] **Step 1: Write the failing test**

`apps/web/src/components/theme/__tests__/ThemeProvider.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>theme:{theme}</button>;
}

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to bright and reflects on <html>', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('theme:bright')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('bright')).toBe(true);
  });

  it('toggle switches to dark and persists', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('easyeng-theme')).toBe('dark');
  });

  it('reads persisted theme on mount', () => {
    localStorage.setItem('easyeng-theme', 'dark');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/components/theme --no-coverage`
Expected: FAIL — cannot resolve `../ThemeProvider`.

- [ ] **Step 3: Implement `theme-script.ts`**

```ts
export const THEME_STORAGE_KEY = 'easyeng-theme';

// Runs before hydration to set the initial <html> class and avoid a flash.
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='dark'){t='bright';}
var e=document.documentElement;
e.classList.remove('bright','dark');
e.classList.add(t);
}catch(_){document.documentElement.classList.add('bright');}})();`;
```

- [ ] **Step 4: Implement `ThemeProvider.tsx`**

```tsx
'use client';

import * as React from 'react';
import { THEME_STORAGE_KEY } from './theme-script';

export type Theme = 'bright' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove('bright', 'dark');
  el.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('bright');

  // Sync from localStorage on mount (script already set the class pre-hydration).
  React.useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null);
    const initial: Theme = stored === 'dark' ? 'dark' : 'bright';
    setThemeState(initial);
    applyThemeClass(initial);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeClass(t);
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch (_) {}
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(theme === 'bright' ? 'dark' : 'bright');
  }, [theme, setTheme]);

  const value = React.useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

Note: the test asserts the default class is present immediately. Because jsdom does not run `THEME_SCRIPT`, apply the class in the initial `useState` initializer path is not enough (effects run after assertion in RTL `render`? — RTL flushes effects synchronously). If the first test fails on the class assertion, change the `useState` initializer to also call `applyThemeClass('bright')` guarded by `typeof document !== 'undefined'`. Keep the effect for reading persisted value.

- [ ] **Step 5: Implement `ThemeToggle.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === 'bright' ? 'Switch to dark theme' : 'Switch to bright theme'}
      title={theme === 'bright' ? 'Dark mode' : 'Bright mode'}
    >
      {/* Avoid hydration mismatch: render a neutral icon until mounted */}
      {!mounted ? (
        <span style={{ width: 20, height: 20, display: 'inline-block' }} aria-hidden />
      ) : theme === 'bright' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 6: Implement `index.ts`**

```ts
export { ThemeProvider, useTheme, type Theme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
export { THEME_SCRIPT, THEME_STORAGE_KEY } from './theme-script';
```

- [ ] **Step 7: Run tests to verify pass**

Run: `cd apps/web && npx jest src/components/theme --no-coverage`
Expected: PASS (3 tests). If the default-class test fails, apply the Step-4 note fix, then re-run.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/theme
git commit -m "feat(theme): add ThemeProvider, ThemeToggle, anti-flash script"
```

---

## Task 4: Wire ThemeProvider and anti-flash script into the root layout

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `ThemeProvider`, `THEME_SCRIPT` from `@/components/theme`.
- Produces: the `<html>` element gets its theme class pre-hydration; all descendants can call `useTheme()`.

- [ ] **Step 1: Import theme pieces**

In `apps/web/src/app/[locale]/layout.tsx`, add near the other imports:

```tsx
import { ThemeProvider, THEME_SCRIPT } from '@/components/theme';
```

- [ ] **Step 2: Inject the pre-hydration script into `<head>`**

Inside the `<html>` element, before `<body>`, add a `<head>` with the script (App Router allows a `<head>` here for raw script injection):

```tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
</head>
```

- [ ] **Step 3: Wrap children in `ThemeProvider`**

Inside `NextIntlClientProvider`, wrap the existing content (`CoreBootstrap` through `DevDebugPopup`) so the provider is available app-wide:

```tsx
<NextIntlClientProvider messages={messages}>
  <ThemeProvider>
    {/* existing children: CoreBootstrap, skip link, Analytics, OfflineIndicator, children, GlobalHomeButton, DevDebugPopup */}
  </ThemeProvider>
</NextIntlClientProvider>
```

- [ ] **Step 4: Remove the hardcoded dark `bg-bg-primary` lock on `<body>` if it fights the theme**

The `<body className="min-h-screen bg-bg-primary font-sans antialiased">` uses the variable-backed token, so it now follows the theme — leave it. Confirm no literal `color-scheme: dark` is forced on `<html>` that would override `.bright`. (The `html` base rule in globals.css sets `color-scheme: dark`; the `.bright` block overrides it to `light` — verify order: `.bright` appears later in the file, so it wins. No change needed.)

- [ ] **Step 5: Verify no hydration errors and toggle works**

Reload the preview at `/vi`. Open console via read_console_messages.
Expected: no hydration mismatch errors. (The landing page is not yet wrapped in `bright`, so it stays dark — that is correct until Task 5.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/[locale]/layout.tsx
git commit -m "feat(theme): wire ThemeProvider and anti-flash script into layout"
```

---

## Task 5: Migrate the landing page to bright + free-first structure

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`
- Modify: `apps/web/messages/en.json`, `apps/web/messages/vi.json`

**Interfaces:**
- Consumes: `ThemeToggle` from `@/components/theme`; existing `landing.*` message namespaces (`hero`, `freeFeatures`, `categories`, `courses`, `why`, `instructors`, `testimonials`, `pricing`, `cta`, `footer`).
- Produces: the public landing page rendered bright by default, leading with free features, with paid classes/pricing as the closing upgrade section, and a theme toggle in the header.

- [ ] **Step 1: Add `bright` to the landing root**

In `apps/web/src/app/[locale]/page.tsx`, the default export's root is `<div className="edtech" style={{ minHeight: '100vh' }}>` (around line 2143). Change its className to `"edtech bright"`.
Expected after reload: the whole landing renders on white.

Note: the section order is ALREADY largely free-first — the JSX renders `<Hero />`, `<FreeFeaturesSection />`, `<Categories />`, `<Courses />`, `<WhyEasyEng />`, `<Instructors />`, `<Testimonials />`, `<Pricing />`, `<FinalCTA />` in that order. `FreeFeaturesSection` already sits immediately after the hero and `Pricing` is already near the end. So the reordering in Step 4 is minimal (see below).

- [ ] **Step 2: Add the ThemeToggle to the landing header**

Import and place `ThemeToggle` next to `LanguageSwitcher` in the `et-topbar` header row (around line 208–210). Give it `className="et-iconbtn"` so it matches the existing icon buttons:

```tsx
import { ThemeToggle } from '@/components/theme';
// ...
<ThemeToggle className="et-iconbtn" />
```

- [ ] **Step 3: Point the hero primary CTA at signup and reorder hero copy to free-first**

The hero already uses `landing.hero` keys with `exploreCourses: "Start for Free"` and `viewPricing: "See Free Features"`. Ensure the primary hero button links to `/${locale}/auth/signup` and the secondary anchors to `#free-features` (the free-feature section). Update the secondary anchor `href="#pricing"` → `href="#free-features"`.

- [ ] **Step 4: Confirm free-first order and add the anchor**

The current order (Hero → FreeFeatures → Categories → Courses → WhyEasyEng → Instructors → Testimonials → Pricing → FinalCTA) is already free-first and pricing-last — no section move is required. The only edit: give the `<section>` rendered by `FreeFeaturesSection` `id="free-features"` so the hero's secondary CTA anchor (Step 3) targets it. Find the `<section>` in the `FreeFeaturesSection` component and add `id="free-features"`. Do not delete or move any section.

- [ ] **Step 5: Update pricing section framing copy to "upgrade"**

In `messages/en.json` and `messages/vi.json`, adjust `landing.pricing` heading/subhead copy to frame paid classes as an optional upgrade (e.g. EN heading "Ready for live 1-on-1 classes?", subhead "Free tools got you started — go further with certified tutors."). Provide the Vietnamese equivalents. Only edit existing keys; do not remove keys the page reads.

- [ ] **Step 6: Verify both themes on the landing page**

Reload preview at `/vi`. Screenshot bright. Click the ThemeToggle, screenshot dark. Run read_console_messages.
Expected: bright = white canvas readable; dark = original indigo restored; free-features section appears above pricing; no console errors; toggle persists across reload (reload and confirm it stays on last choice).

- [ ] **Step 7: Run the landing/e2e smoke if present**

Run: `cd apps/web && npx jest --testPathPattern="page|landing" --no-coverage 2>&1 | tail -20`
Expected: PASS or "no tests found" (acceptable). Fix any test that asserts old section order.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/[locale]/page.tsx apps/web/messages/en.json apps/web/messages/vi.json
git commit -m "feat(landing): bright theme, free-first layout, theme toggle"
```

---

## Task 6: Migrate the auth pages to bright

**Files:**
- Modify: `apps/web/src/app/[locale]/auth/layout.tsx`

**Interfaces:**
- Consumes: `.bright` theme; `ThemeToggle` (optional in the auth header).
- Produces: login/signup pages rendered bright, ambient glows tuned for a light background.

- [ ] **Step 1: Add `bright` to the auth wrapper**

In `apps/web/src/app/[locale]/auth/layout.tsx`, change the root `className="edtech"` to `className="edtech bright"`.

- [ ] **Step 2: Tune the ambient glow opacities for light bg**

The two `et-glow` divs use `opacity: 0.30` / `0.25` on saturated violet/blue — too strong on white. Lower to `opacity: 0.12` / `0.10`.

- [ ] **Step 3: Add ThemeToggle to the auth header (optional but consistent)**

Import `ThemeToggle` and place it in the header row next to the tagline:

```tsx
import { ThemeToggle } from '@/components/theme';
// ...in the header, after the eyebrow <p>:
<ThemeToggle className="et-iconbtn" />
```

- [ ] **Step 4: Verify both themes on login and signup**

Navigate to `/vi/auth/login` and `/vi/auth/signup`. Screenshot bright, toggle, screenshot dark. read_console_messages.
Expected: form fields, labels, buttons readable in bright; toggle restores dark; no console errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/auth/layout.tsx
git commit -m "feat(auth): migrate auth pages to bright theme"
```

---

## Task 7: Phase 2 — migrate free-feature pages to bright

**Files (each Modify — add `bright` to the page/layout root, then hand-tune):**
- `apps/web/src/app/[locale]/materials/page.tsx` (+ `materials/[slug]/` layout if present)
- `apps/web/src/app/[locale]/ai-tools/page.tsx`
- `apps/web/src/app/[locale]/quiz/page.tsx` (+ `quiz/[quizId]/`)
- `apps/web/src/app/[locale]/leaderboard/page.tsx`
- `apps/web/src/app/[locale]/learning-path/page.tsx`

**Interfaces:**
- Consumes: `.bright` theme, `ThemeProvider` (already app-wide).
- Produces: the promoted free-feature pages render bright by default with dark toggle.

For EACH page, repeat this cycle (commit per page):

- [ ] **Step 1: Locate the page's outermost layout container**

Run: `grep -nE "return \(|className=" apps/web/src/app/[locale]/<page>.tsx | head`
Identify the top-level wrapper element of the route.

- [ ] **Step 2: Add `bright` to that container's className**

If the route has its own `layout.tsx`, add `bright` there so nested routes inherit; otherwise add it to the page's root wrapper. If the root is a shared `DashboardLayout`/`AppShell` component used by BOTH free and not-yet-migrated pages, do NOT edit the shared component — instead wrap the page body in `<div className="bright">…</div>` at the page level. (Check with `grep -rn "DashboardLayout\|AppShell" apps/web/src/app/[locale]/<page>.tsx`.)

- [ ] **Step 3: Verify and hand-tune**

Navigate to the page in the preview (both `/vi` and toggled dark). read_console_messages. Look for: light-on-light text, dark-tuned inline-hex backgrounds, images/badges with baked-in dark styling. Fix each by adding a `.bright <selector>` override in `globals.css` OR replacing an inline hex with a token class.
Expected: page readable in both themes.

- [ ] **Step 4: Screenshot proof (bright + dark) and commit**

```bash
git add apps/web/src/app/[locale]/<page> apps/web/src/app/globals.css
git commit -m "feat(<page>): migrate to bright theme"
```

- [ ] **Step 5: Repeat Steps 1–4 for each of the five free-feature pages before moving on.**

---

## Task 8: Phase 3 — migrate student dashboard, notifications, settings

**Files (Modify roots, hand-tune):**
- `apps/web/src/app/[locale]/dashboard/` (page + layout)
- `apps/web/src/app/[locale]/notifications/`
- `apps/web/src/app/[locale]/settings/`
- Fix hardcoded hexes: `apps/web/src/components/editorial/TopBar.tsx`, `apps/web/src/components/teacher/AvailabilityCalendar.tsx` (only if these render on Phase-3 pages; otherwise defer to their phase).

**Interfaces:**
- Consumes: `.bright` theme.
- Produces: the daily logged-in student surface renders bright by default.

- [ ] **Step 1: Identify the shared dashboard shell**

Run: `grep -rn "DashboardLayout" apps/web/src/app/[locale]/dashboard apps/web/src/components | head`
Determine whether dashboard/notifications/settings share one layout component.

- [ ] **Step 2: Apply `bright` at the correct level**

If they share a `DashboardLayout` used ONLY by already-migrated or Phase-3 pages, add `bright` to that layout's root. If it is also used by not-yet-migrated pages (booking/teacher), instead wrap each Phase-3 page body individually to avoid regressing others.

- [ ] **Step 3: Fix the two hardcoded-hex components (if in scope)**

For `TopBar.tsx` and `AvailabilityCalendar.tsx`, replace literal `#7c5cff`/`#4c6bff`/`#06…`/`#0d…` values with token classes (`text-accent-primary`, `bg-bg-secondary`, etc.) or `var(--…)` so they follow the theme. Run `gitnexus_impact` per the project CLAUDE.md before editing each (report blast radius).

- [ ] **Step 4: Verify each page in both themes**

Log in as the student test account (`jimmycuong1413@gmail.com` / `123456`), visit dashboard, notifications, settings. Screenshot bright + dark. read_console_messages.
Expected: readable in both; gamification widgets (XP bar, gems, streak) legible on white.

- [ ] **Step 5: Commit per page**

```bash
git add apps/web/src/app/[locale]/dashboard apps/web/src/app/globals.css
git commit -m "feat(dashboard): migrate to bright theme"
# repeat for notifications, settings
```

---

## Task 9: Phase 4 — migrate booking, classes, and live class

**Files (Modify roots, hand-tune carefully — revenue flow):**
- `apps/web/src/app/[locale]/booking/`
- `apps/web/src/app/[locale]/classes/`
- `apps/web/src/app/[locale]/class/` (live class; embeds CometChat)

**Interfaces:**
- Consumes: `.bright` theme.
- Produces: booking + live-class flow renders bright; CometChat panels aligned where the SDK allows.

- [ ] **Step 1: Apply `bright` to booking and classes roots; verify the full booking flow**

Add `bright` to each route's outermost wrapper. Walk the booking flow (teacher list → slot select → booking panel → confirm → success) in the preview. Screenshot each step bright + dark. read_console_messages and read_network_requests (confirm no booking API regressions).
Expected: every step readable; no functional regression in the booking calls.

- [ ] **Step 2: Handle the live class + CometChat theming**

For `class/` (live), add `bright` to the page shell. CometChat renders its own DOM/theme; if the SDK exposes a theme config, set it to a light variant; otherwise leave the chat widget as-is and only theme the surrounding EasyEng chrome. Do NOT break the A/V call.
Verify with the existing E2E if feasible (`node e2e-booking-call.mjs` per memory notes) OR a manual join in the preview.

- [ ] **Step 3: Commit per route**

```bash
git add apps/web/src/app/[locale]/booking apps/web/src/app/globals.css
git commit -m "feat(booking): migrate to bright theme"
# repeat for classes, class
```

---

## Task 10: Phase 5 — migrate teacher and admin surfaces

**Files (Modify roots, hand-tune):**
- `apps/web/src/app/[locale]/teacher/`
- `apps/web/src/app/[locale]/admin/`
- Finish any remaining hardcoded-hex fixes (`AvailabilityCalendar.tsx` if not done in Task 8).

**Interfaces:**
- Consumes: `.bright` theme.
- Produces: internal teacher/admin dashboards render bright by default.

- [ ] **Step 1: Apply `bright` to teacher and admin layout roots**

Add `bright` to each area's top-level layout. These areas have data-dense tables and calendars — check contrast on table borders, status chips, and the availability calendar.

- [ ] **Step 2: Fix remaining hardcoded hexes**

Complete the `AvailabilityCalendar.tsx` (and any newly found) hex → token migration. Run `gitnexus_impact` before editing; report blast radius.

- [ ] **Step 3: Verify in both themes**

Log in as teacher (`jimmycuong1414@gmail.com` / `123456`), visit teacher dashboard/schedule; visit an admin page. Screenshot bright + dark. read_console_messages.
Expected: tables, calendars, charts readable in both themes.

- [ ] **Step 4: Commit per area**

```bash
git add apps/web/src/app/[locale]/teacher apps/web/src/app/globals.css
git commit -m "feat(teacher): migrate to bright theme"
# repeat for admin
```

---

## Task 11: Final cleanup — make bright the global default

**Files:**
- Modify: `apps/web/src/app/globals.css` (move bright values to `:root`, indigo under `.dark`)
- Modify: all page/layout roots that carry a literal `bright` class (remove it — theme now global)
- Modify: `apps/web/src/components/theme/theme-script.ts` (class logic already handles both; verify)
- Modify: `apps/web/src/app/[locale]/layout.tsx` viewport `themeColor`/`colorScheme` if desired

**Interfaces:**
- Produces: bright as the app-wide default via `:root`; dark via `.dark` on `<html>` (already applied by ThemeProvider); no per-page `.bright` wrappers remain.

- [ ] **Step 1: Confirm every route is migrated**

Run: `grep -rL "bright" apps/web/src/app/[locale]/*/layout.tsx apps/web/src/app/[locale]/page.tsx` and reconcile against Phases 1–5. Every user-facing route must have been migrated. If any remain, STOP and migrate them first.

- [ ] **Step 2: Promote bright to `:root`, demote indigo to `.dark`**

In `globals.css`: move the bright palette variable values into `:root` (replacing the indigo values), and create a `.dark { … }` block holding the original indigo values (copy the current `:root` indigo values verbatim). Move the `.bright` component/body overrides so the DARK overrides live under `.dark` and the bright ones become the base. Update the body background rule so the default (base) background is the light canvas and `.dark body` (or `.dark`) restores the indigo radial background.

- [ ] **Step 3: Remove per-page `bright` classes**

Remove the literal `bright` class from every page/layout root edited in Tasks 5–10 (now redundant). Keep `edtech` where present.

- [ ] **Step 4: Update the anti-flash default and `<html>` base**

`theme-script.ts` already adds `bright`/`dark` explicitly — no change needed, but confirm the base `html { color-scheme: dark }` in globals.css is changed to `light` (default) with `.dark { color-scheme: dark }`. Update the layout `viewport.themeColor` to `#ffffff` and `colorScheme` to `light`.

- [ ] **Step 5: Full regression pass**

Navigate through landing, auth, a free-feature page, dashboard, booking, teacher — in both themes. read_console_messages on each. Run `cd apps/web && npm run build`.
Expected: build passes; every page correct in both themes; default (no localStorage) is bright.

- [ ] **Step 6: Run the full test + lint suite**

Run: `cd apps/web && npm run lint && npx jest --no-coverage 2>&1 | tail -30`
Expected: lint clean (no NEW errors vs. baseline), tests green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/[locale] apps/web/src/components/theme
git commit -m "refactor(theme): promote bright to global default, dark under .dark"
```

---

## Task 12: Accessibility + cross-theme verification

**Files:**
- Create/Modify: a Playwright + Axe spec covering key pages in both themes, e.g. `apps/web/tests/e2e/theme-a11y.spec.ts` (follow existing Playwright config `playwright.config.ts`).

**Interfaces:**
- Consumes: the fully migrated bright/dark themes.
- Produces: automated evidence that both themes meet AA contrast on key pages.

- [ ] **Step 1: Write the Axe spec**

Create `apps/web/tests/e2e/theme-a11y.spec.ts` that, for each of `[ '/vi', '/vi/auth/login', '/vi/materials', '/vi/dashboard' ]`, loads the page, runs Axe (using the project's existing Axe integration — check `apps/web/tests` for the helper), asserts no serious/critical contrast violations, then toggles the theme (click the ThemeToggle or set `localStorage`) and re-runs Axe.

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/vi', '/vi/auth/login', '/vi/materials'];

for (const path of PAGES) {
  for (const theme of ['bright', 'dark'] as const) {
    test(`a11y ${path} [${theme}]`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('easyeng-theme', t), theme);
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();
      const contrast = results.violations.filter(v => v.id === 'color-contrast');
      expect(contrast, JSON.stringify(contrast, null, 2)).toEqual([]);
    });
  }
}
```

- [ ] **Step 2: Run the spec**

Run: `cd apps/web && npx playwright test tests/e2e/theme-a11y.spec.ts`
Expected: all pass. If contrast violations appear, fix the offending token/override in `globals.css` and re-run until green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/theme-a11y.spec.ts apps/web/src/app/globals.css
git commit -m "test(theme): Axe contrast checks for bright and dark themes"
```

---

## Self-Review Notes

- **Spec coverage:** §1 theme architecture → Tasks 1–4, 11; §2 landing free-first → Task 5; §3 migration order Phases 1–5 → Tasks 5–10; error handling (flash, hydration, mixed nav, CometChat) → Tasks 3/4/9; testing → per-task verification + Task 12. All spec sections mapped.
- **Type consistency:** `Theme = 'bright' | 'dark'`, `useTheme()`, `ThemeProvider`, `ThemeToggle`, `THEME_SCRIPT`, `THEME_STORAGE_KEY = 'easyeng-theme'` used consistently across Tasks 3–5, 11.
- **No `:root` flip before final task:** enforced by Global Constraints and Task 11 gate (Step 1 reconciliation).
- **Out-of-scope items** (mobile, free-first dashboard reorder, try-without-account) are excluded, matching the spec.
