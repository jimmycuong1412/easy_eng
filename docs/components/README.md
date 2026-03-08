# Component Library Documentation

**Version**: 1.0
**Last Updated**: 2026-02-03
**Framework**: Next.js 14 + React + TypeScript

---

## Table of Contents

1. [Overview](#overview)
2. [Component Categories](#component-categories)
3. [Design System](#design-system)
4. [Usage Guidelines](#usage-guidelines)
5. [Accessibility](#accessibility)

---

## Overview

The English Learning Platform component library is built with:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Base component library
- **Lucide React** - Icons

### Component Philosophy

- **Reusable**: Components are designed to be used across multiple features
- **Accessible**: WCAG 2.1 AA compliant
- **Typed**: Full TypeScript support
- **Documented**: Clear props and usage examples
- **Tested**: Unit and integration tests

---

## Component Categories

### UI Components (Base)

Foundation components from Shadcn/ui with custom styling.

| Component | Purpose | Location |
|-----------|---------|----------|
| `Avatar` | User profile pictures | `components/ui/avatar.tsx` |
| `Badge` | Status indicators | `components/ui/badge.tsx` |
| `Button` | Clickable actions | `components/ui/button.tsx` |
| `Card` | Content containers | `components/ui/card.tsx` |
| `Dialog` | Modal dialogs | `components/ui/dialog.tsx` |
| `Input` | Text input fields | `components/ui/input.tsx` |
| `Label` | Form labels | `components/ui/label.tsx` |
| `Progress` | Progress indicators | `components/ui/progress.tsx` |
| `ScrollArea` | Scrollable containers | `components/ui/scroll-area.tsx` |
| `Select` | Dropdown selections | `components/ui/select.tsx` |
| `Separator` | Visual dividers | `components/ui/separator.tsx` |
| `Skeleton` | Loading placeholders | `components/ui/skeleton.tsx` |
| `Tabs` | Tabbed interfaces | `components/ui/tabs.tsx` |
| `Textarea` | Multi-line text input | `components/ui/textarea.tsx` |
| `AlertDialog` | Confirmation dialogs | `components/ui/alert-dialog.tsx` |

### Layout Components

Page structure and navigation components.

| Component | Purpose | Location |
|-----------|---------|----------|
| `MainLayout` | Main page wrapper | `components/layout/MainLayout.tsx` |
| `RoleBasedNav` | Role-specific navigation | `components/layout/RoleBasedNav.tsx` |
| `NotificationBell` | Notification indicator | `components/layout/NotificationBell.tsx` |

### Common Components

Shared functionality across features.

| Component | Purpose | Location |
|-----------|---------|----------|
| `RoleGuard` | Access control | `components/common/RoleGuard.tsx` |
| `LanguageSwitcher` | i18n language toggle | `components/common/LanguageSwitcher.tsx` |
| `GlobalHomeButton` | Home navigation | `components/common/GlobalHomeButton.tsx` |
| `NotificationCenter` | Notification hub | `components/common/NotificationCenter.tsx` |
| `NotificationList` | Notification display | `components/common/NotificationList.tsx` |
| `LoadingStates` | Loading indicators | `components/common/LoadingStates.tsx` |
| `ErrorBoundary` | Error handling | `components/ErrorBoundary.tsx` |
| `GemEarnedToast` | Gem notification | `components/common/GemEarnedToast.tsx` |

### Feature Components - Booking

Class booking and discovery components.

| Component | Purpose | Location |
|-----------|---------|----------|
| `ClassCard` | Class display card | `components/booking/ClassCard.tsx` |
| `ClassCatalog` | Class listing | `components/booking/ClassCatalog.tsx` |
| `ClassFilters` | Filter controls | `components/booking/ClassFilters.tsx` |
| `BookingFlow` | Booking process | `components/booking/BookingFlow.tsx` |
| `BookingSummary` | Order summary | `components/booking/BookingSummary.tsx` |
| `GemDiscountSlider` | Gem usage slider | `components/booking/GemDiscountSlider.tsx` |
| `PaymentMethodSelector` | Payment selection | `components/booking/PaymentMethodSelector.tsx` |
| `ReviewForm` | Class review form | `components/booking/ReviewForm.tsx` |
| `CancellationModal` | Booking cancellation | `components/booking/CancellationModal.tsx` |

### Feature Components - Dashboard

Dashboard widgets for different roles.

| Component | Purpose | Location |
|-----------|---------|----------|
| `GemBalanceWidget` | Gem balance display | `components/dashboard/GemBalanceWidget.tsx` |
| `UpcomingClassesWidget` | Upcoming classes | `components/dashboard/UpcomingClassesWidget.tsx` |
| `TeacherScheduleWidget` | Teacher schedule | `components/dashboard/TeacherScheduleWidget.tsx` |
| `StudentRosterWidget` | Student list | `components/dashboard/StudentRosterWidget.tsx` |
| `TeacherEarningsWidget` | Earnings display | `components/dashboard/TeacherEarningsWidget.tsx` |
| `UserAnalyticsWidget` | User metrics | `components/dashboard/UserAnalyticsWidget.tsx` |
| `BookingAnalyticsWidget` | Booking trends | `components/dashboard/BookingAnalyticsWidget.tsx` |
| `GemAnalyticsWidget` | Gem circulation | `components/dashboard/GemAnalyticsWidget.tsx` |
| `RevenueWidget` | Revenue metrics | `components/dashboard/RevenueWidget.tsx` |

### Feature Components - Teacher

Teacher-specific functionality.

| Component | Purpose | Location |
|-----------|---------|----------|
| `CreateClassForm` | Create new class | `components/teacher/CreateClassForm.tsx` |
| `ClassEditor` | Edit class details | `components/teacher/ClassEditor.tsx` |
| `EnrolledStudentsList` | Student list | `components/teacher/EnrolledStudentsList.tsx` |
| `ClassMaterialsUploader` | Upload materials | `components/teacher/ClassMaterialsUploader.tsx` |
| `AvailabilityCalendar` | Schedule management | `components/teacher/AvailabilityCalendar.tsx` |
| `PayoutRequestForm` | Request payout | `components/teacher/PayoutRequestForm.tsx` |

### Feature Components - Admin

Admin dashboard and management.

| Component | Purpose | Location |
|-----------|---------|----------|
| `GemAdjustmentModal` | Adjust user gems | `components/admin/GemAdjustmentModal.tsx` |
| `GemRuleEditor` | Edit gem rules | `components/admin/GemRuleEditor.tsx` |
| `UserGrowthChart` | User analytics chart | `components/admin/UserGrowthChart.tsx` |
| `BookingTrendsChart` | Booking chart | `components/admin/BookingTrendsChart.tsx` |
| `GemCirculationChart` | Gem metrics chart | `components/admin/GemCirculationChart.tsx` |
| `RevenueChart` | Revenue chart | `components/admin/RevenueChart.tsx` |
| `DateRangePicker` | Date range selector | `components/admin/DateRangePicker.tsx` |
| `ReconciliationReport` | Gem reconciliation | `components/admin/ReconciliationReport.tsx` |

### Feature Components - Student

Student-specific features.

| Component | Purpose | Location |
|-----------|---------|----------|
| `ReferralLink` | Referral sharing | `components/student/ReferralLink.tsx` |

### Feature Components - Video

Live video class components.

| Component | Purpose | Location |
|-----------|---------|----------|
| `CometChatVideoCall` | Video call wrapper | `components/video/CometChatVideoCall.tsx` |
| `VideoStream` | Video stream display | `components/video/VideoStream.tsx` |
| `CallControls` | Call control buttons | `components/video/CallControls.tsx` |
| `CallErrorBoundary` | Video error handling | `components/video/CallErrorBoundary.tsx` |
| `ClassRoom` | Virtual classroom | `components/video/ClassRoom.tsx` |
| `ParticipantList` | Participant display | `components/video/ParticipantList.tsx` |
| `InCallChat` | In-class chat | `components/video/InCallChat.tsx` |
| `WaitingRoom` | Pre-class waiting | `components/video/WaitingRoom.tsx` |

### Feature Components - Gamification

Character and XP system (Phase 10).

| Component | Purpose | Location |
|-----------|---------|----------|
| `PixelAvatar` | 8-bit character | `components/features/PixelAvatar.tsx` |
| `XPProgressBar` | XP progress | `components/features/XPProgressBar.tsx` |
| `CookieBadge` | Cookie display | `components/features/CookieBadge.tsx` |
| `CookieDiscountCalculator` | Cookie calculator | `components/features/CookieDiscountCalculator.tsx` |

### Auth Components

Authentication and authorization.

| Component | Purpose | Location |
|-----------|---------|----------|
| `ProtectedRoute` | Route protection | `components/auth/ProtectedRoute.tsx` |

### Dev Tools

Development utilities.

| Component | Purpose | Location |
|-----------|---------|----------|
| `DevDebugPopup` | Debug information | `components/DevDebugPopup.tsx` |

---

## Design System

### Color Palette

```typescript
// Primary Colors
primary: {
  50: '#f5f3ff',
  500: '#8b5cf6',  // Main purple
  600: '#7c3aed',
  700: '#6d28d9',
}

// Gem/Reward Colors
purple: {
  400: '#c084fc',  // Gem highlights
  500: '#a855f7',  // Gem primary
}

// Success/Positive
green: {
  400: '#4ade80',
  500: '#22c55e',
}

// Warning
yellow: {
  400: '#facc15',
  500: '#eab308',
}

// Error/Danger
red: {
  400: '#f87171',
  500: '#ef4444',
}

// Neutral
gray: {
  50: '#f9fafb',
  100: '#f3f4f6',
  500: '#6b7280',
  900: '#111827',
}
```

### Typography

```typescript
// Font Family
font-sans: 'Inter', system-ui, sans-serif

// Font Sizes
text-xs: 0.75rem     // 12px
text-sm: 0.875rem    // 14px
text-base: 1rem      // 16px
text-lg: 1.125rem    // 18px
text-xl: 1.25rem     // 20px
text-2xl: 1.5rem     // 24px
text-3xl: 1.875rem   // 30px
text-4xl: 2.25rem    // 36px

// Font Weights
font-normal: 400
font-medium: 500
font-semibold: 600
font-bold: 700
```

### Spacing

```typescript
// Padding/Margin Scale
0: 0px
1: 0.25rem   // 4px
2: 0.5rem    // 8px
3: 0.75rem   // 12px
4: 1rem      // 16px
5: 1.25rem   // 20px
6: 1.5rem    // 24px
8: 2rem      // 32px
10: 2.5rem   // 40px
12: 3rem     // 48px
```

### Border Radius

```typescript
rounded-sm: 0.125rem   // 2px
rounded: 0.25rem       // 4px
rounded-md: 0.375rem   // 6px
rounded-lg: 0.5rem     // 8px
rounded-xl: 0.75rem    // 12px
rounded-2xl: 1rem      // 16px
rounded-full: 9999px   // Fully rounded
```

---

## Usage Guidelines

### Importing Components

```typescript
// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Feature Components
import { BookingFlow } from '@/components/booking/BookingFlow';
import { GemBalanceWidget } from '@/components/dashboard/GemBalanceWidget';

// Common Components
import { RoleGuard } from '@/components/common/RoleGuard';
```

### Component Props Pattern

All components follow consistent prop patterns:

```typescript
interface ComponentProps {
  // Required props first
  required: string;

  // Optional props
  optional?: boolean;

  // Callbacks (prefixed with 'on')
  onAction?: () => void;
  onChange?: (value: any) => void;

  // Children (if applicable)
  children?: React.ReactNode;

  // Styling (last)
  className?: string;
}
```

### Example Usage

```typescript
// Button variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// Card structure
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>

// RoleGuard
<RoleGuard allowedRoles={['student']}>
  <StudentOnlyContent />
</RoleGuard>
```

---

## Accessibility

### Keyboard Navigation

All interactive components support:
- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons
- **Escape**: Close dialogs/modals
- **Arrow keys**: Navigate lists/menus

### Screen Reader Support

Components include:
- Proper ARIA labels
- Role attributes
- Live region announcements
- Alt text for images

### Focus Management

- Visible focus indicators
- Logical tab order
- Focus trapping in modals
- Focus restoration

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: Clear visual states

---

## Component Examples

See detailed usage examples in:
- **Booking Flow**: How to implement the complete booking process
- **Dashboard Widgets**: Building role-specific dashboards
- **Video Components**: Integrating live video classes
- **Gem System**: Displaying and managing gems

---

## Best Practices

### Do's ✅

- Use TypeScript for all components
- Follow the established prop patterns
- Include proper ARIA attributes
- Handle loading and error states
- Test with keyboard navigation
- Document complex props
- Use semantic HTML

### Don'ts ❌

- Don't inline styles (use Tailwind classes)
- Don't skip loading states
- Don't hardcode colors (use theme)
- Don't forget error boundaries
- Don't ignore accessibility
- Don't duplicate components

---

## Contributing

When adding new components:

1. **Create in appropriate directory**
   - UI components: `components/ui/`
   - Feature components: `components/[feature]/`
   - Common components: `components/common/`

2. **Use TypeScript**
   - Define prop interfaces
   - Export types
   - Avoid `any` types

3. **Add documentation**
   - JSDoc comments
   - Usage examples
   - Prop descriptions

4. **Include tests**
   - Unit tests for logic
   - Accessibility tests
   - Visual regression tests

5. **Follow naming conventions**
   - PascalCase for components
   - camelCase for props/functions
   - Descriptive, clear names

---

**Next**: See individual component documentation files for detailed props and examples.
