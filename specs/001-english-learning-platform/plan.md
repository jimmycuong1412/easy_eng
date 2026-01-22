# Implementation Plan: Modern English Learning Platform

**Branch**: `001-english-learning-platform` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-english-learning-platform/spec.md`

## Summary

A modern English learning platform featuring stunning student UI, role-based dashboards (Student/Teacher/Admin), and an innovative "Cookies" virtual currency system that rewards student engagement with discounts on class bookings. The platform enables students to browse/book classes, teachers to manage schedules, and administrators to oversee operations and analytics.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Node.js 20 LTS with TypeScript (backend)
**Frontend Framework**: **Next.js 14+** with App Router (SSR, file-based routing, React Server Components)
**UI Component Library**: Tailwind CSS + shadcn/ui (customizable, accessible components)
**Backend Platform**: **Supabase** (PostgreSQL database, Auth, Realtime, Storage, Edge Functions)
**Database**: Supabase PostgreSQL 15 with Row Level Security (RLS) policies
**Real-time**: Supabase Realtime for live updates (notifications, XP gains, leaderboards)
**Auth**: Supabase Auth (email/password, OAuth providers)
**Storage**: Supabase Storage for class materials, profile images, sprite assets
**Edge Functions**: Supabase Edge Functions (Deno) for server-side business logic
**Video Conferencing**: **CometChat** (Real-time video/voice calls for live classes)
**UI Design**: **Google Stitch** (AI-powered UI prototyping from sketches/prompts)
**Testing**: Jest + React Testing Library (frontend), Vitest (Edge Functions), Playwright (E2E)
**Target Platform**: Web application (responsive design for desktop, tablet, mobile browsers)
**Project Type**: Web application (frontend + Supabase backend)
**Performance Goals**: <200ms p95 API response time, <3s page load, 1000+ concurrent users (from spec SC-002, SC-006)
**Constraints**: WCAG 2.1 Level AA accessibility, real-time notifications required, Cookie calculations must be 100% accurate
**Scale/Scope**: Initial target 1000+ concurrent users, multi-tenant capable, 3 user roles, ~15 core screens

### Design System & Visual Identity

| Aspect | Specification |
|--------|---------------|
| **Background** | **Dark Blue** - Primary application background (`#0A1628` to `#1E3A5F` gradient) |
| **Theme** | Dark mode by default (light mode optional toggle) |
| **Primary Color** | Electric Blue (`#3B82F6`) for CTAs, links, active states |
| **Secondary Color** | Cyan accent (`#06B6D4`) for highlights, XP bars, progress |
| **Success** | Green (`#10B981`) for completed states, earned rewards |
| **Warning** | Amber (`#F59E0B`) for Cookie alerts, expiring items |
| **Error** | Red (`#EF4444`) for errors, validation failures |
| **Gold Currency** | Golden yellow (`#FFD700`) for Gold display |
| **Cookie Currency** | Warm orange (`#F97316`) for Cookie balance |
| **Text Primary** | White (`#FFFFFF`) on dark backgrounds |
| **Text Secondary** | Light gray (`#94A3B8`) for muted text |
| **Surface Cards** | Semi-transparent dark (`#1E293B` with 80% opacity) |
| **Border/Dividers** | Subtle blue-gray (`#334155`) |
| **Character Sprites** | Vibrant 8-bit pixel art with high contrast against dark background |

#### Dark Blue Theme Rationale

- **Gaming Aesthetic**: Dark backgrounds are standard in RPG/gaming UIs, aligning with our gamified learning approach
- **Reduced Eye Strain**: Better for extended study sessions, especially in low-light environments
- **Character Pop**: 8-bit pixel art characters stand out vibrantly against dark blue
- **Modern Feel**: Aligns with popular dark-mode-first applications (Discord, Twitch, gaming platforms)
- **Focus Enhancement**: Dark UI draws attention to content and interactive elements

#### CSS Variables (Tailwind Config)

```css
:root {
  --bg-primary: #0A1628;      /* Darkest blue - main background */
  --bg-secondary: #1E3A5F;    /* Lighter blue - gradient end */
  --bg-surface: #1E293B;      /* Card/panel backgrounds */
  --bg-elevated: #334155;     /* Elevated elements, modals */
  
  --accent-primary: #3B82F6;  /* Electric blue - CTAs */
  --accent-secondary: #06B6D4; /* Cyan - highlights */
  --accent-gold: #FFD700;     /* Gold currency */
  --accent-cookie: #F97316;   /* Cookie currency */
  
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  
  --border-default: #334155;
  --border-focus: #3B82F6;
  
  /* Animation tokens */
  --duration-instant: 50ms;   /* Immediate feedback */
  --duration-fast: 150ms;     /* Micro-interactions */
  --duration-normal: 250ms;   /* Standard transitions */
  --duration-slow: 400ms;     /* Page transitions */
  --duration-slower: 600ms;   /* Complex animations */
  
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);      /* Decelerate */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* Smooth */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Playful */
}
```

#### Smooth Animation System

| Animation Type | Duration | Easing | Use Case |
|---------------|----------|--------|----------|
| **Hover states** | 150ms | ease-out | Buttons, cards, interactive elements |
| **Button press** | 50ms | ease-out | Click feedback, scale down 0.97 |
| **Page transitions** | 300ms | ease-in-out | Route changes, fade + slide |
| **Modal open** | 250ms | spring | Dialogs, drawers, overlays |
| **Modal close** | 200ms | ease-out | Faster close feels snappier |
| **Toast notifications** | 400ms | spring | Slide in from edge |
| **XP/Gold gain** | 600ms | bounce | Floating numbers, celebration |
| **Level up** | 800ms | spring | Full celebration sequence |
| **Loading skeleton** | 1.5s | ease-in-out | Pulse animation, infinite |
| **Character idle** | 1000ms | linear | 4-frame sprite loop |
| **Progress bars** | 500ms | ease-out | XP bar fill, smooth growth |

#### Animation Implementation (Framer Motion)

```typescript
// Shared animation variants
export const smoothTransitions = {
  // Page transitions
  pageEnter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] }
  },
  pageExit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 }
  },
  
  // Modal spring animation
  modalSpring: {
    type: "spring",
    damping: 25,
    stiffness: 300
  },
  
  // Button hover/tap
  buttonHover: { scale: 1.02, transition: { duration: 0.15 } },
  buttonTap: { scale: 0.97 },
  
  // Card hover with glow
  cardHover: {
    y: -4,
    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.15)",
    transition: { duration: 0.2 }
  },
  
  // XP gain floating number
  xpGain: {
    initial: { opacity: 0, y: 20, scale: 0.8 },
    animate: { 
      opacity: [0, 1, 1, 0],
      y: [20, 0, -20, -40],
      scale: [0.8, 1.2, 1, 0.8]
    },
    transition: { duration: 0.8, ease: "easeOut" }
  }
};
```

#### Performance Guidelines

- **GPU-accelerated properties only**: Use `transform` and `opacity` for animations (avoid `width`, `height`, `top`, `left`)
- **will-change hint**: Apply `will-change: transform` to frequently animated elements
- **Reduce Motion support**: Respect `prefers-reduced-motion: reduce` media query
- **60fps target**: Monitor with Chrome DevTools Performance panel
- **Lazy animation loading**: Load complex animations (confetti, particles) on-demand

### Google Stitch UI Design (AI-Powered Prototyping)

> **Reference**: [stitch.withgoogle.com/docs/learn/overview](https://stitch.withgoogle.com/docs/learn/overview)

| Aspect | Decision |
|--------|----------|
| **Tool** | **Google Stitch** (stitch.withgoogle.com) - AI design tool for rapid UI prototyping |
| **Access** | Free via Google Labs (requires Google account, 18+) |
| **Core Features** | Text-to-UI, Image-to-UI, Sketch-to-UI, Edit & Iterate |
| **Output Formats** | PNG exports, Figma import, React/HTML code generation |
| **Platform** | Web (desktop), Mobile (via image upload) |
| **Use Cases** | Dashboard layouts, booking flows, character viewer, marketplace UI |

#### Stitch Generation Modes

| Mode | Input | Best For |
|------|-------|----------|
| **Text-to-UI** | Natural language prompt describing the UI | Starting from scratch, exploring concepts |
| **Image-to-UI** | Upload wireframe sketch, screenshot, or mockup | Converting hand-drawn sketches to high-fidelity |
| **Edit Mode** | Select regions + text prompt | Refining specific parts of generated UI |
| **Variations** | Existing generation + "Generate variations" | A/B testing, exploring alternatives |

#### Stitch Design Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: TEXT-TO-UI (Initial Concept)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Go to stitch.withgoogle.com                                             │
│  2. Select "Text to UI" mode                                                │
│  3. Write detailed prompt:                                                  │
│     • Describe the screen purpose and user                                  │
│     • List key UI elements and their placement                              │
│     • Specify style (colors, mood, visual theme)                            │
│     • Mention device type (mobile, desktop, tablet)                         │
│  4. Click "Generate" → Wait for AI to create UI                             │
│  5. Review 4 generated variations                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: IMAGE-TO-UI (From Sketches)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Hand-sketch wireframe on paper or tablet                                │
│  2. Take photo / screenshot of sketch                                       │
│  3. Upload to Stitch "Image to UI" mode                                     │
│  4. Add context prompt: "Convert this wireframe to a modern UI for..."      │
│  5. Stitch interprets sketch and generates polished UI                      │
│  6. Use for rapid wireframe → mockup conversion                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: EDIT & ITERATE                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Select a generated UI you want to refine                                │
│  2. Use "Edit" mode to select specific regions                              │
│  3. Describe changes: "Make the header smaller", "Add a Cookie icon here"   │
│  4. Regenerate just that section                                            │
│  5. Repeat until satisfied                                                  │
│  6. Click "Generate variations" to explore alternatives                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: EXPORT & IMPLEMENT                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Download as PNG for documentation/handoff                               │
│  2. Export to Figma for detailed design work                                │
│  3. Generate React/HTML code (experimental)                                 │
│  4. Extract design tokens (colors, spacing, typography)                     │
│  5. Use as reference for component implementation                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Effective Stitch Prompting Tips

> **IMPORTANT**: Always include "dark blue background (#0A1628)" in every Stitch prompt to maintain design consistency.

| Tip | Example |
|-----|---------|
| **Be specific about layout** | "Three-column layout with sidebar on left, main content center, widgets on right" |
| **Describe the user** | "For a teenage student learning English on their phone" |
| **Specify visual style** | "8-bit pixel art aesthetic with bright colors on dark blue background (#0A1628)" |
| **Include key data** | "Show Cookie balance of 150, XP bar at 75%, Level 7" |
| **Mention interactions** | "Hoverable cards with subtle shadow on hover" |
| **Set device context** | "Mobile-first design, 375px width iPhone screen" |
| **Reference existing designs** | "Similar to Duolingo's home screen but with character avatar" |

#### Priority Screens for Stitch Design

| Screen | Priority | Stitch Mode | Prompt Summary |
|--------|----------|-------------|----------------|
| **Student Dashboard** | P0 | Text-to-UI | "Dark blue background (#0A1628), gamified dashboard with 8-bit character, Cookie balance (orange), XP progress (cyan), upcoming classes" |
| **Career Path Selection** | P0 | Text-to-UI | "Dark blue background, 6 glowing career cards (Doctor, Engineer, Warrior, Business, Artist, Scientist) with pixel art characters" |
| **Class Booking Flow** | P0 | Text-to-UI | "Dark blue theme, class catalog grid with filters, Cookie discount slider (orange), booking summary cards" |
| **Character Viewer** | P1 | Image-to-UI | Upload sketch → "Dark blue background, RPG character screen with glowing equipment slots, neon stats, customization panel" |
| **Marketplace** | P1 | Text-to-UI | "Dark blue (#0A1628), game item shop with Gold prices (yellow glow), item preview, neon category tabs" |
| **Video Classroom** | P1 | Text-to-UI | "Dark interface, video call with teacher spotlight, student grid, dark chat panel with blue accents" |
| **Teacher Dashboard** | P2 | Text-to-UI | "Dark blue professional dashboard with class schedule, student roster, glowing analytics charts" |
| **Admin Analytics** | P3 | Text-to-UI | "Dark theme data dashboard with neon-accented charts: users, bookings, Cookies, revenue trends" |

### Vietnam Market Configuration

| Aspect | Decision |
|--------|----------|
| **Target Market** | Vietnam (primary), Southeast Asia (secondary) |
| **Currency** | VND (Vietnamese Dong) with USD display option |
| **Payment Gateways** | VNPay, MoMo, ZaloPay (Vietnam), Stripe (international fallback) |
| **Timezone** | User-declared in profile settings (default: Asia/Ho_Chi_Minh UTC+7) |
| **Language** | Vietnamese UI (primary), English (secondary) |
| **Class Duration** | **25 minutes** standard (optimized for focus and scheduling) |
| **Minimum Class Price** | **$5 USD** (or 125,000 VND equivalent) - Cookie discounts cannot reduce below this |

### Teacher Revenue Model

| Aspect | Decision |
|--------|----------|
| **Payment Model** | **Percentage of booking price** |
| **Teacher Share** | 70% of final booking price (after Cookie discounts) |
| **Platform Fee** | 30% retained by platform |
| **Cookie Impact** | Teachers paid on discounted price (Cookie discounts reduce teacher earnings proportionally) |
| **Payout Frequency** | Weekly (minimum threshold: 500,000 VND) |
| **Payout Methods** | Bank transfer (Vietnam), PayPal (international teachers) |

### Cookie Earning Activities

| Activity | Cookies Earned | Conditions |
|----------|----------------|------------|
| **Referral Coupon** | 50 Cookies | When referred friend completes first booking |
| **First Booking Bonus** | 20 Cookies | One-time for new students |
| **Class Completion** | 5 Cookies | Per class attended (separate from XP/Gold) |
| **Leave a Review** | 10 Cookies | First review per teacher |
| **Profile Completion** | 15 Cookies | One-time for completing all profile fields |

> **Note**: Primary Cookie earning is via referral coupons. Each student gets a unique referral code.

### Quiz System (Built-in)

| Aspect | Decision |
|--------|----------|
| **Integration** | Built into platform (not external tool) |
| **Quiz Creation** | Teachers create quizzes per class (optional) |
| **Question Types** | Multiple choice, fill-in-blank, matching, short answer |
| **Questions per Quiz** | 5-10 questions (teacher configurable) |
| **Pass Threshold** | 70% correct answers |
| **Time Limit** | 10 minutes per quiz |
| **Rewards Trigger** | Quiz score determines Gold tier (90%+ = 30 Gold, 75-89% = 20 Gold, <75% = 10 Gold) |
| **Retakes** | 1 retake allowed per quiz |

### Notification Channels

| Channel | Status | Use Cases |
|---------|--------|----------|
| **Email** | ✅ Required | Booking confirmations, receipts, account security |
| **In-app Notifications** | ✅ Required | Real-time updates, Cookie earnings, XP gains |
| **Browser Push** | ✅ Required | Class reminders (15 min before), live class alerts |
| **SMS** | ❌ Not in MVP | Future consideration for critical alerts |

### Character Sprite Assets

| Aspect | Decision |
|--------|----------|
| **Art Style** | 8-bit pixel art (16x16 to 64x64 sprites) |
| **Generation Method** | **AI-generated** using Midjourney/DALL-E/Stable Diffusion |
| **Consistency** | Use consistent prompts and seed values for career themes |
| **Asset Pipeline** | Generate → Manual cleanup in Aseprite → Export spritesheets |
| **Formats** | PNG spritesheets with JSON metadata |
| **Career Themes** | 6 base characters + 4 evolution stages each = 24 base sprites |
| **Marketplace Items** | AI-generated with manual review for quality |

### Parental Controls

> **Status**: To be defined in future iteration. Basic spending limits supported, detailed controls TBD.

| Feature | MVP Status |
|---------|------------|
| Daily spending limit | ✅ Included |
| Account linking | ❌ Deferred |
| Content filters | ❌ Deferred |
| Screen time limits | ❌ Deferred |
| Age verification | ❌ Deferred |

### CometChat Integration (Video Classes)

| Aspect | Decision |
|--------|----------|
| **Plan** | **Build (Free Tier)** - $0/month, up to 100 users, all features for development/testing |
| **SDK** | CometChat React UI Kit v6 (pre-built components with calling support) |
| **Features Used** | 1-on-1 video calls, group video calls, screen sharing, in-call chat |
| **User Sync** | Auto-provision CometChat users on Supabase Auth signup via Edge Function |
| **Class Sessions** | Map each Class to a CometChat Group; teacher initiates call, students join |
| **Upgrade Path** | Basic Plan ($239/month) for 1,000 MAU when ready for production |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality Standards** | ✅ PASS | TypeScript enforces type safety; ESLint/Prettier for formatting; modular architecture planned |
| **II. Testing Discipline (NON-NEGOTIABLE)** | ✅ PASS | TDD approach with Jest, RTL, Playwright; 80% coverage target aligns with constitution |
| **III. User Experience Consistency** | ✅ PASS | WCAG 2.1 AA in spec (SC-003); role-specific dashboards per constitution; design system planned |
| **IV. Performance Requirements** | ✅ PASS | <200ms p95 API (SC-002), <3s page load aligns with constitution; monitoring planned |
| **V. Role-Based Access Control** | ✅ PASS | Core feature requirement; 3 roles (Student/Teacher/Admin); server-side enforcement planned |
| **VI. Virtual Currency System Integrity** | ✅ PASS | Cookies system with atomic transactions, audit logging, test coverage, deterministic calculations |
| **VII. UI Design Excellence** | ✅ PASS | "Stunning UI" is core requirement; design system, responsive, accessibility, smooth animations planned |

**Quality Gates Compliance:**
- [ ] Automated tests (Jest, Playwright) - To be configured
- [ ] Linting and formatting (ESLint, Prettier) - To be configured
- [ ] Code coverage 80% minimum - To be configured
- [ ] Performance benchmarks - To be configured
- [ ] Security vulnerability scans - To be configured
- [ ] Code review process - GitHub PR workflow
- [ ] Role-based permission tests - To be configured for RBAC features
- [ ] Currency transaction integrity tests - To be configured for Cookies system

**Gate Status**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/      # Reusable UI components (design system)
│   │   ├── common/      # Button, Input, Card, Modal, etc.
│   │   ├── booking/     # Class cards, booking flow components
│   │   ├── dashboard/   # Dashboard widgets, charts
│   │   ├── character/   # 8-bit character viewer, progression
│   │   ├── video/       # CometChat video call components
│   │   │   ├── ClassRoom.tsx       # Main video classroom component
│   │   │   ├── CallControls.tsx    # Mute, camera, screen share, end call
│   │   │   ├── ParticipantList.tsx # List of students in call
│   │   │   ├── InCallChat.tsx      # Chat during video session
│   │   │   └── WaitingRoom.tsx     # Pre-class waiting area
│   │   └── layout/      # Navigation, sidebar, header
│   ├── pages/           # Route-based pages
│   │   ├── auth/        # Login, register, forgot password
│   │   ├── student/     # Student dashboard, bookings, history
│   │   ├── teacher/     # Teacher dashboard, class management
│   │   ├── admin/       # Admin dashboard, analytics, user management
│   │   └── class/       # Live class video room
│   │       └── [classId]/
│   │           └── live.tsx  # Video classroom page
│   ├── lib/
│   │   ├── supabase.ts  # Supabase client configuration
│   │   └── cometchat.ts # CometChat client initialization
│   ├── hooks/           # Custom React hooks
│   │   ├── useSupabase.ts
│   │   ├── useAuth.ts
│   │   ├── useRealtime.ts
│   │   └── useCometChat.ts  # CometChat connection & call hooks
│   ├── stores/          # Zustand stores (character, auth, notifications)
│   └── utils/           # Helpers, formatters
├── tests/
│   ├── unit/
│   └── e2e/
└── package.json

supabase/
├── migrations/          # SQL migration files
│   ├── 001_users.sql
│   ├── 002_classes.sql
│   ├── 003_bookings.sql
│   ├── 004_cookies.sql
│   ├── 005_career_avatars.sql
│   └── 006_cometchat_sessions.sql  # Track video session metadata
├── functions/           # Supabase Edge Functions (Deno)
│   ├── award-class-rewards/
│   ├── process-booking/
│   ├── calculate-cookies/
│   ├── daily-login-bonus/
│   ├── cometchat-user-sync/    # Sync Supabase users to CometChat
│   └── cometchat-webhook/      # Handle CometChat events (call ended, etc.)
├── seed.sql             # Initial seed data (career paths, marketplace items)
└── config.toml          # Supabase project configuration

shared/
├── types/               # Shared TypeScript types/interfaces
│   ├── database.types.ts  # Generated from Supabase schema
│   ├── cometchat.types.ts # CometChat-related types
│   └── index.ts
└── constants/           # Shared constants (Cookie values, roles, XP rates)
```

**Structure Decision**: Frontend-first architecture with Supabase as backend-as-a-service. This structure supports:
- Rapid development with Supabase's built-in Auth, Realtime, and Storage
- Row Level Security (RLS) for secure data access without custom middleware
- **CometChat integration** for live video classes between teachers and students
- Edge Functions for server-side business logic (XP/Gold calculations, fraud prevention)
- Type-safe database access with generated TypeScript types
- Simplified deployment (frontend to Vercel/Netlify, Supabase managed hosting)

---

## Google Stitch UI Design Process

### Design-First Development Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: CONCEPT (1-2 days per major screen)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Hand-sketch rough wireframes (paper/iPad)                              │
│  2. Upload sketches to Google Stitch                                       │
│  3. Add detailed text prompts describing:                                  │
│     • Target user (student/teacher/admin)                                  │
│     • Key actions on the screen                                            │
│     • Visual style (8-bit gamified for students, professional for admin)   │
│     • Responsive requirements (mobile-first)                               │
│  4. Generate 3-5 variations                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: ITERATION (2-3 iterations)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Review generated designs with stakeholders                             │
│  2. Provide feedback via follow-up prompts:                                │
│     • "Make the Cookie balance more prominent"                             │
│     • "Add more whitespace between sections"                               │
│     • "Use warmer colors for the student dashboard"                        │
│  3. Regenerate and compare variations                                      │
│  4. Select best elements from multiple generations                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: FINALIZATION                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Export final designs from Stitch                                       │
│  2. Import to Figma for:                                                   │
│     • Precise spacing/sizing adjustments                                   │
│     • Component extraction and naming                                      │
│     • Design token definition (colors, typography, spacing)                │
│     • Interactive prototype creation                                       │
│  3. Generate Tailwind CSS / component code from Stitch                     │
│  4. Document design decisions in design-system.md                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: IMPLEMENTATION                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Developers implement components matching Stitch/Figma designs          │
│  2. Use Stitch-generated code as starting point                            │
│  3. Visual regression testing against design exports                       │
│  4. Iterate with designers on implementation details                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stitch Prompt Templates

#### Student Dashboard Prompt
```
Design a modern, gamified student dashboard for an English learning platform.

Key elements:
- Top bar: Logo, search, notifications bell, profile avatar
- Left sidebar: Navigation (Dashboard, Classes, My Character, Marketplace, Leaderboard)
- Main content:
  - "My Character" widget showing 8-bit pixel art avatar with level (e.g., "Level 7 Engineer")
  - "Cookie Balance" card with large number and "+Add Cookies" button
  - "Upcoming Classes" list with teacher photo, time, topic, "Join" button
  - "Weekly Progress" showing XP earned this week with progress bar

Style: 
- Playful, colorful, energetic
- 8-bit pixel art accents
- Card-based layout with subtle shadows
- Mobile-first responsive
- WCAG AA accessible contrast
```

#### Career Path Selection Prompt
```
Design an onboarding screen for career path selection.

The user must choose 1 of 6 career paths:
1. Doctor (green, medical cross icon, healing theme)
2. Engineer (blue, gear icon, building theme)
3. Warrior (red, sword icon, leadership theme)
4. Business Person (purple, briefcase icon, finance theme)
5. Artist (orange, palette icon, creative theme)
6. Scientist (cyan, flask icon, discovery theme)

Each card shows:
- 8-bit pixel character preview
- Career name
- Short tagline (e.g., "Heal the world with knowledge")
- "Select" button

Layout: 2x3 grid on desktop, single column scroll on mobile
Style: Clean, inspiring, fantasy RPG aesthetic
Header: "Choose Your Path" with motivational subtext
```

#### Video Classroom Prompt
```
Design a live video classroom interface for online English learning.

Layout:
- Main area: Teacher's video feed (large, centered)
- Right sidebar: 
  - Student video thumbnails (grid of small videos)
  - In-call chat messages
- Bottom bar: 
  - Mute/unmute mic
  - Camera on/off
  - Screen share
  - Raise hand
  - Leave class (red)
- Top bar:
  - Class name and topic
  - Timer showing elapsed time
  - Participant count

Style:
- Clean, distraction-free
- Dark mode friendly
- Large touch targets for mobile
- Status indicators (mic muted = red slash)
```

### Design Documentation Structure

```text
specs/001-english-learning-platform/
├── design/
│   ├── stitch-exports/           # Raw exports from Google Stitch
│   │   ├── student-dashboard-v1.png
│   │   ├── student-dashboard-v2.png
│   │   ├── career-selection.png
│   │   └── ...
│   ├── figma-link.md             # Link to Figma project
│   ├── design-system.md          # Colors, typography, spacing tokens
│   ├── component-specs/          # Detailed component specifications
│   │   ├── button.md
│   │   ├── card.md
│   │   ├── character-viewer.md
│   │   └── ...
│   └── user-flows/               # Screen flow diagrams
│       ├── booking-flow.md
│       ├── onboarding-flow.md
│       └── class-join-flow.md
```

### Stitch Design Checklist

- [ ] **Student Dashboard** - Generate 3+ variations, select best for Figma
- [ ] **Career Selection** - Design 6 career cards with pixel art style
- [ ] **Character Viewer** - Full character customization interface
- [ ] **Marketplace** - Item grid with preview and purchase flow
- [ ] **Class Catalog** - Browse/filter/book flow
- [ ] **Booking Confirmation** - Cookie discount breakdown
- [ ] **Video Classroom** - Teacher and student views
- [ ] **Teacher Dashboard** - Class management interface
- [ ] **Admin Dashboard** - Analytics and user management
- [ ] **Mobile Responsive** - Generate mobile versions of all key screens
- [ ] **Design Tokens** - Export color palette and typography scale
- [ ] **Component Library** - Document reusable components

---

## CometChat Video Classes Architecture

### Overview

CometChat provides real-time video/voice calling for live English classes. Each booked class becomes a video session where teachers and students interact face-to-face.

### Free Tier Limits (Build Plan)

| Feature | Limit |
|---------|-------|
| Monthly Active Users | 100 users |
| Concurrent Connections | 5% of MAU (5 users) |
| Messages | Unlimited |
| Video/Voice Calls | Included |
| Storage | Unlimited |
| Cost | **$0/month** |

> **Note**: Free tier is perfect for development and initial testing. Upgrade to Basic ($239/month) for 1,000 MAU production deployment.

### User Provisioning Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Supabase Auth  │      │  Edge Function  │      │    CometChat    │
│    (Signup)     │─────▶│ cometchat-sync  │─────▶│   Create User   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │
         │  Auth Hook Trigger     │  REST API Call
         │                        │  POST /users
         ▼                        ▼
   User record in             CometChat UID = Supabase user.id
   Supabase users table       Role metadata synced
```

### CometChat User Sync Edge Function

```typescript
// supabase/functions/cometchat-user-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const COMETCHAT_APP_ID = Deno.env.get('COMETCHAT_APP_ID')!;
const COMETCHAT_API_KEY = Deno.env.get('COMETCHAT_API_KEY')!;
const COMETCHAT_REGION = Deno.env.get('COMETCHAT_REGION') || 'us';

interface UserPayload {
  id: string;
  email: string;
  raw_user_meta_data: {
    full_name?: string;
    role?: 'student' | 'teacher' | 'admin';
    avatar_url?: string;
  };
}

serve(async (req) => {
  const { record: user } = await req.json() as { record: UserPayload };

  const cometChatUser = {
    uid: user.id,
    name: user.raw_user_meta_data.full_name || user.email.split('@')[0],
    avatar: user.raw_user_meta_data.avatar_url,
    role: user.raw_user_meta_data.role || 'student',
    metadata: {
      email: user.email,
      supabase_id: user.id
    }
  };

  const response = await fetch(
    `https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': COMETCHAT_API_KEY,
        'appId': COMETCHAT_APP_ID
      },
      body: JSON.stringify(cometChatUser)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('CometChat user creation failed:', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### Class Session Model

```sql
-- Track video session metadata
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  cometchat_group_id VARCHAR(100) NOT NULL,  -- CometChat Group GUID
  session_status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, live, ended
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  recording_url VARCHAR(500),  -- If recording enabled (paid feature)
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id)
);

-- Index for active sessions
CREATE INDEX idx_class_sessions_status ON class_sessions(session_status);
```

### Video Classroom Flow

```
1. TEACHER STARTS CLASS
   ┌─────────────────────────────────────────────────────────────┐
   │  Teacher Dashboard → "Start Class" button                   │
   │  ↓                                                          │
   │  Create CometChat Group (if not exists)                     │
   │  ↓                                                          │
   │  Update class_sessions.session_status = 'live'              │
   │  ↓                                                          │
   │  Redirect to /class/[classId]/live                          │
   │  ↓                                                          │
   │  Initialize CometChat Call (teacher as initiator)           │
   └─────────────────────────────────────────────────────────────┘

2. STUDENT JOINS CLASS
   ┌─────────────────────────────────────────────────────────────┐
   │  Student Dashboard → "Join Class" button (visible when live)│
   │  ↓                                                          │
   │  Verify booking exists for this class                       │
   │  ↓                                                          │
   │  Redirect to /class/[classId]/live                          │
   │  ↓                                                          │
   │  Join CometChat Group Call                                  │
   └─────────────────────────────────────────────────────────────┘

3. CLASS ENDS
   ┌─────────────────────────────────────────────────────────────┐
   │  Teacher clicks "End Class"                                 │
   │  ↓                                                          │
   │  End CometChat Call                                         │
   │  ↓                                                          │
   │  Update class_sessions (ended_at, participant_count)        │
   │  ↓                                                          │
   │  Trigger award-class-rewards Edge Function                  │
   │  ↓                                                          │
   │  Award XP/Gold to all attendees                             │
   └─────────────────────────────────────────────────────────────┘
```

### Frontend CometChat Setup

```typescript
// frontend/src/lib/cometchat.ts
import { CometChat } from '@cometchat/chat-sdk-javascript';
import { CometChatUIKit } from '@cometchat/chat-uikit-react';

const COMETCHAT_APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID!;
const COMETCHAT_REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us';
const COMETCHAT_AUTH_KEY = process.env.NEXT_PUBLIC_COMETCHAT_AUTH_KEY!;

export const initCometChat = async () => {
  const appSetting = new CometChat.AppSettingsBuilder()
    .subscribePresenceForAllUsers()
    .setRegion(COMETCHAT_REGION)
    .autoEstablishSocketConnection(true)
    .build();

  await CometChat.init(COMETCHAT_APP_ID, appSetting);
  
  // Initialize UI Kit
  const UIKitSettings = {
    appId: COMETCHAT_APP_ID,
    authKey: COMETCHAT_AUTH_KEY,
    region: COMETCHAT_REGION,
  };
  
  await CometChatUIKit.init(UIKitSettings);
};

export const loginToCometChat = async (uid: string) => {
  try {
    const user = await CometChatUIKit.login(uid);
    return user;
  } catch (error) {
    // User might not exist yet - create via auth key
    console.error('CometChat login error:', error);
    throw error;
  }
};

export const startGroupCall = async (groupId: string) => {
  const call = new CometChat.Call(
    groupId,
    CometChat.CALL_TYPE.VIDEO,
    CometChat.RECEIVER_TYPE.GROUP
  );
  
  return await CometChat.initiateCall(call);
};

export const joinGroupCall = async (sessionId: string) => {
  return await CometChat.acceptCall(sessionId);
};
```

### ClassRoom Component

```tsx
// frontend/src/components/video/ClassRoom.tsx
import { useEffect, useState } from 'react';
import { CometChatOutgoingCall, CometChatIncomingCall } from '@cometchat/chat-uikit-react';
import { CallControls } from './CallControls';
import { ParticipantList } from './ParticipantList';
import { InCallChat } from './InCallChat';

interface ClassRoomProps {
  classId: string;
  isTeacher: boolean;
  groupId: string;
}

export const ClassRoom = ({ classId, isTeacher, groupId }: ClassRoomProps) => {
  const [callInProgress, setCallInProgress] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // CometChat UI Kit handles most of the call UI automatically
  return (
    <div className="classroom-container h-screen flex">
      {/* Main video area */}
      <div className="flex-1 relative">
        {isTeacher ? (
          <CometChatOutgoingCall />
        ) : (
          <CometChatIncomingCall />
        )}
        
        {/* Call controls overlay */}
        <CallControls 
          isTeacher={isTeacher}
          onEndCall={() => {/* Handle end */}}
        />
      </div>
      
      {/* Sidebar */}
      <div className="w-80 border-l flex flex-col">
        <ParticipantList participants={participants} />
        <InCallChat groupId={groupId} />
      </div>
    </div>
  );
};
```

### Environment Variables

```env
# .env.local (frontend)
NEXT_PUBLIC_COMETCHAT_APP_ID=your_app_id
NEXT_PUBLIC_COMETCHAT_REGION=us
NEXT_PUBLIC_COMETCHAT_AUTH_KEY=your_auth_key

# Supabase Edge Functions secrets
# supabase secrets set COMETCHAT_APP_ID=your_app_id
# supabase secrets set COMETCHAT_API_KEY=your_rest_api_key
# supabase secrets set COMETCHAT_REGION=us
```

### CometChat Setup Checklist

- [ ] Create CometChat account at [app.cometchat.com](https://app.cometchat.com/signup)
- [ ] Create new app (select Build/Free plan)
- [ ] Note App ID, Region, Auth Key, and REST API Key
- [ ] Enable Video Calling in CometChat Dashboard
- [ ] Configure Supabase secrets for Edge Functions
- [ ] Add environment variables to frontend
- [ ] Set up Database Webhook to trigger user sync on signup
- [ ] Test 1-on-1 call between teacher and student

---

## Complexity Tracking

> No constitution violations requiring justification. Standard web application architecture with third-party video integration.
