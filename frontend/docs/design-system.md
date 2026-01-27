# EasyEng Design System

> A comprehensive design system for the Modern English Learning Platform targeting the Vietnam market.

## Table of Contents

- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing](#spacing)
- [Animations](#animations)
- [Components](#components)
- [Icons](#icons)
- [Accessibility](#accessibility)

---

## Color Palette

### Primary Colors (Dark Blue Theme)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--primary-900` | `#0A1628` | `rgb(10, 22, 40)` | Main background, deep sections |
| `--primary-800` | `#1E3A5F` | `rgb(30, 58, 95)` | Secondary background, cards |
| `--primary-700` | `#2D4A6F` | `rgb(45, 74, 111)` | Hover states |
| `--primary-600` | `#3B82F6` | `rgb(59, 130, 246)` | **Accent color**, buttons, links |
| `--primary-500` | `#60A5FA` | `rgb(96, 165, 250)` | Light accent |

### Semantic Colors

```css
:root {
  /* Success - Green */
  --success-400: #4ADE80;
  --success-500: #22C55E;
  --success-600: #16A34A;

  /* Warning - Amber (Cookies!) */
  --warning-400: #FBBF24;
  --warning-500: #F59E0B;
  --warning-600: #D97706;

  /* Error - Red */
  --error-400: #F87171;
  --error-500: #EF4444;
  --error-600: #DC2626;

  /* Info - Purple */
  --info-400: #C084FC;
  --info-500: #A855F7;
  --info-600: #9333EA;
}
```

### Gamification Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--cookie` | `#F59E0B` | Cookie currency, rewards |
| `--gold` | `#EAB308` | Gold/coins, premium |
| `--xp` | `#3B82F6` | Experience points |
| `--level` | `#22C55E` | Level indicators |

### Text Colors

```css
:root {
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;    /* slate-400 */
  --text-tertiary: #64748B;     /* slate-500 */
  --text-muted: #475569;        /* slate-600 */
}
```

### Glass Effect (Glassmorphism)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.glass-card-hover:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}
```

---

## Typography

### Font Family

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Font Sizes

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, badges |
| `text-sm` | 14px | 20px | Secondary text, labels |
| `text-base` | 16px | 24px | Body text |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 28px | Section titles |
| `text-2xl` | 24px | 32px | Card titles |
| `text-3xl` | 30px | 36px | Page titles |
| `text-4xl` | 36px | 40px | Hero headings |

### Font Weights

```css
:root {
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

## Spacing

### Scale (Based on 4px grid)

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Tight gaps |
| `space-2` | 8px | Icon gaps |
| `space-3` | 12px | Small padding |
| `space-4` | 16px | Default padding |
| `space-5` | 20px | Medium padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Section gaps |
| `space-10` | 40px | Large gaps |
| `space-12` | 48px | Section padding |
| `space-16` | 64px | Page sections |

### Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 24px;
  --radius-full: 9999px;
}
```

---

## Animations

### Duration Tokens

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
}
```

### Easing Functions

```css
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Animation Presets

#### Fade In Up
```typescript
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};
```

#### Stagger Children
```typescript
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
```

#### Scale Pop
```typescript
const scalePop = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 200 }
};
```

#### Cookie Bounce (Gamification)
```typescript
const cookieBounce = {
  animate: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0]
  },
  transition: { duration: 0.5, ease: 'easeInOut' }
};
```

### Performance Guidelines

- Target 60fps for all animations
- Use `transform` and `opacity` only for GPU acceleration
- Disable animations for users with `prefers-reduced-motion`
- Max animation duration: 500ms for UI, 1000ms for effects

---

## Components

### Button

#### Variants
- `default` - Primary blue button
- `outline` - Ghost with border
- `ghost` - Text only
- `destructive` - Red/danger actions
- `cookie` - Amber for cookie actions
- `gold` - Golden for premium features

#### Sizes
- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height

#### Usage
```tsx
<Button variant="default" size="md">
  Đặt lớp ngay
</Button>

<Button variant="cookie">
  <Cookie className="w-4 h-4 mr-2" />
  Sử dụng 10 Cookies
</Button>
```

### Card

#### Variants
- `default` - White/5 background
- `elevated` - With shadow
- `interactive` - Hover effects
- `gradient` - Colored gradient

#### Usage
```tsx
<Card className="bg-white/5 border-white/10">
  <CardHeader>
    <CardTitle className="text-white">Tiêu đề</CardTitle>
    <CardDescription className="text-slate-400">
      Mô tả
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Badge

#### Variants
- `default` - Slate background
- `success` - Green
- `warning` - Amber
- `error` - Red
- `cookie` - Cookie styled
- `xp` - XP styled

### Avatar

#### Sizes
- `sm` - 32px
- `md` - 40px (default)
- `lg` - 48px
- `xl` - 64px
- `2xl` - 96px

### Progress

#### Custom Styling
```tsx
<Progress
  value={75}
  className="h-2 bg-white/10"
  indicatorClassName="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]"
/>
```

---

## Custom Feature Components

### CookieBadge

Animated cookie currency display with Framer Motion effects.

```tsx
<CookieBadge
  amount={150}
  showAnimation={true}
  size="md"
/>
```

### XPProgressBar

Experience progress with level display and glow effects.

```tsx
<XPProgressBar
  currentXP={2450}
  maxXP={3000}
  level={12}
  showLabel={true}
/>
```

### PixelAvatar

8-bit pixel art avatar for Career Path system.

```tsx
<PixelAvatar
  career="software_engineer"
  level={3}
  size={64}
  animated={true}
/>
```

---

## Icons

### Library
Using **Lucide React** for consistent, customizable icons.

### Standard Sizes
- Small: 16px (w-4 h-4)
- Medium: 20px (w-5 h-5)
- Large: 24px (w-6 h-6)
- XLarge: 32px (w-8 h-8)

### Common Icons

| Context | Icon | Name |
|---------|------|------|
| Cookies | 🍪 | Cookie emoji or custom icon |
| XP | ⚡ | Zap |
| Level | ⭐ | Star |
| Video Class | 📹 | Video |
| Book | 📚 | BookOpen |
| Calendar | 📅 | Calendar |
| Settings | ⚙️ | Settings |
| Profile | 👤 | User |
| Dashboard | 📊 | LayoutDashboard |

---

## Accessibility

### Color Contrast
All text meets WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus States
```css
.focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Support
- Use semantic HTML elements
- Include `aria-label` for icon-only buttons
- Use `aria-live` for dynamic content updates
- Provide `alt` text for all images

---

## Implementation Examples

### Dashboard Card
```tsx
<motion.div
  variants={itemVariants}
  className="bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 
             border border-[#3B82F6]/20 rounded-2xl p-6"
>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-sm">Cookies</p>
      <p className="text-2xl font-bold text-white">150 🍪</p>
    </div>
    <div className="p-3 bg-[#3B82F6]/20 rounded-xl">
      <Cookie className="w-6 h-6 text-[#3B82F6]" />
    </div>
  </div>
</motion.div>
```

### Interactive Button Group
```tsx
<div className="flex gap-3">
  <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
    <Video className="w-4 h-4 mr-2" />
    Vào lớp học
  </Button>
  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
    <BookOpen className="w-4 h-4 mr-2" />
    Tài liệu
  </Button>
</div>
```

---

## File Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   └── features/     # Custom feature components
│       ├── CookieBadge.tsx
│       ├── XPProgressBar.tsx
│       └── PixelAvatar.tsx
├── styles/
│   └── globals.css   # CSS variables and base styles
└── lib/
    └── utils.ts      # cn() utility for class merging
```

---

## Changelog

### v1.0.0 (2024-01)
- Initial design system documentation
- Dark blue theme implementation
- Cookie gamification components
- shadcn/ui integration

---

*Last updated: January 2024*
*Maintained by: EasyEng Design Team*
