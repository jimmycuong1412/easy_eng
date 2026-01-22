# EasyEng Website Development Plan

## English Teaching Platform with Cookie Currency System

---

## 🎯 Project Overview

**EasyEng** - Modern English learning platform with stunning student UI, multi-role dashboards, and innovative "Cookies" virtual currency system for discounted class bookings.

**Core Innovation:** Students buy Cookies → Use for class discounts (1 cookie = 10% off, max 50%) → Book real teachers.

---

## 📱 Website Structure & Pages

### 1. Landing Page (`/`)

```
┌─ Hero Section (Animated typing + CTAs)
├─ Features Showcase (Cookies, Test, Teachers, Courses)
├─ Testimonials Carousel
├─ Cookies Pricing Tiers
└─ Footer
```

### 2. Multi-Role Dashboards (SPA Navigation)

**Admin Dashboard (`/admin`)**
```
├── Analytics Dashboard (Charts: Revenue, Users, Teachers)
├── Users Management (CRUD table)
├── Cookie Packages (CRUD)
├── Courses Management (CRUD)
└── Payments Overview
```

**Teacher Dashboard (`/teacher`)**
```
├── Classes Calendar (Upcoming bookings)
├── Availability Manager (Time slots calendar)
├── Students List (Booking history)
├── Earnings (Cookie conversions)
└── Profile Settings
```

**Student Dashboard (`/student`)**
```
├── Cookie Wallet Balance
├── Booked Classes Calendar
├── Quick Test Results
├── Course Recommendations
└── Buy Cookies Button
```

### 3. Payment & Cookie System (`/student/wallet`)

**Cookie Packages:**
| Package | Cookies | Price | Per Cookie |
|---------|---------|-------|------------|
| Starter | 10 | $5 | $0.50 |
| Pro | 50 | $20 | $0.40 |
| Elite | 100 | $35 | $0.35 |

- **Discount Logic:** 1 cookie = 10% off class (max 50 cookies = 50% off)
- **Purchase flow:** Package selection → Mock payment → Balance update

### 4. Booking System

**Teacher Side (`/teacher/availability`):**
- Calendar picker for available time ranges
- Drag-select time blocks (e.g., Mon 2-5PM)
- Color-coded availability

**Student Side (`/student/book`):**
- Browse teacher calendars (open slots only)
- Select slot → Cookie discount calculator
- Confirm → Deduct cookies → Booked

### 5. Quick English Test (`/test`)

- 20 adaptive questions (Grammar/Vocab/Listening)
- Real-time scoring + progress bar
- Results: CEFR Level (A1-C2) + recommendations
- CTA: "Book teacher test for accuracy" or "Enroll in recommended course"

### 6. Courses Page (`/courses`)

**Sample Courses (8 total):**
```
├── Beginner Conversation (Level A1-A2)
├── Business English (B1+)
├── IELTS Preparation (B2-C1)
├── Daily English (All levels)
├── Advanced Speaking (C1)
└── And 3 more...
```

**Filters:** Level, Category, Popularity, Price

---

## 🎨 UI/UX Design System

**Colors:**
| Name | Hex Code | Usage |
|------|----------|-------|
| Primary | `#6366F1` | Indigo |
| Accent | `#10B981` | Emerald |
| Success | `#10B981` | - |
| Warning | `#F59E0B` | - |
| Background | - | Gradient (purple-blue) |

**Effects:**
- Glassmorphism cards
- Smooth page transitions
- Lottie animations
- Scroll-triggered reveals
- Gradient buttons/hovers

**Typography:** Inter/Poppins (Google Fonts)

**Responsiveness:** Mobile-first (perfect on all devices)

---

## 💻 Technical Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5 + CSS3 + Vanilla JS |
| Charts | Chart.js (CDN) |
| Storage | LocalStorage (user data, bookings, cookies) |
| Animations | CSS + GSAP (light) |
| Auth | Mock login/register modals |
| Deployment | Single index.html (copy-paste ready) |

---

## 📊 Sample Data Requirements

- 5 Teachers (photos, bios, availability)
- 8 Courses (descriptions, pricing, levels)
- 50+ Test questions (multiple choice)
- Mock payment history
- Realistic cookie economy

---

## 🚀 Implementation Steps

1. Generate complete code using provided AI prompt
2. Test all user flows (admin/teacher/student)
3. Customize courses/teachers content
4. Add real payment gateway (Stripe/PayPal)
5. Deploy to hosting (Vercel/Netlify)
6. Optional: Convert to React/Next.js for scale

---

## 🎁 AI Generation Prompt Ready

**Copy the comprehensive prompt from previous response** to generate 2000+ lines of production-ready code in **single index.html** format.

**Expected Output:** Fully functional website with stunning UI, all dashboards, booking system, test, and cookie economy working out-of-the-box.

---

## ✅ Next Actions

- [ ] Run AI prompt → Get complete website
- [ ] Test all features
- [ ] Customize content
- [ ] Deploy live
