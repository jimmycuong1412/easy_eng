# Easy English - Comprehensive Testing Plan

## Overview
This document provides a step-by-step testing plan for all core features of the Easy English platform. Follow each section in order to ensure complete functionality.

---

## Prerequisites

### 1. Database Setup
Before testing, ensure the database is properly configured:

- [ ] Run migration: `001_create_profiles_table.sql`
- [ ] Run migration: `000_insert_existing_user_profiles.sql` (for existing users)
- [ ] Run migration: `002_create_test_data.sql` (for test data)
- [ ] Verify all tables exist in Supabase Dashboard:
  - profiles
  - bookings
  - cookie_balances
  - cookie_transactions
  - teacher_profiles

### 2. Test Accounts
Use these test accounts for testing:

**Student Account:**
- Email: `jimmycuong1413@gmail.com`
- User ID: `70311902-706f-416c-9520-192a6cc96072`
- Role: Student
- Cookie Balance: 500

**Teacher Account:**
- Email: `jimmycuong1414@gmail.com`
- User ID: `7a46e4e2-782c-471a-ba1b-cea449e75028`
- Role: Teacher
- Verified: Yes

### 3. Environment Setup
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Access URL: `http://localhost:3000`
- [ ] Supabase project URL configured
- [ ] CometChat credentials configured

---

## Phase 1: Multi-Language Support (i18n)

### Test 1.1: Language Switching
1. [ ] Open `http://localhost:3000`
2. [ ] Verify default language is Vietnamese (vi)
3. [ ] Look for language switcher in navigation
4. [ ] Switch to English (en)
5. [ ] Verify URL changes to `/en`
6. [ ] Verify all UI text changes to English
7. [ ] Switch back to Vietnamese
8. [ ] Verify URL changes to `/vi`
9. [ ] Verify all UI text changes back to Vietnamese

### Test 1.2: Locale Routing
1. [ ] Navigate to `/vi/auth/login`
2. [ ] Verify page loads with Vietnamese text
3. [ ] Navigate to `/en/auth/login`
4. [ ] Verify page loads with English text
5. [ ] Navigate to `/` (root)
6. [ ] Verify automatic redirect to `/vi` or `/en` based on browser settings

**Expected Results:**
- Language switching works smoothly
- URLs correctly reflect current locale
- All translated strings display properly
- No hardcoded English/Vietnamese text in UI

---

## Phase 2: Authentication System

### Test 2.1: User Registration
1. [ ] Navigate to `/auth/signup`
2. [ ] Fill in the registration form:
   - Full Name: `Test User`
   - Email: `testuser@example.com` (use a new email)
   - Password: `Test123456!`
   - Confirm Password: `Test123456!`
3. [ ] Click "Đăng ký" (Sign Up)
4. [ ] Verify loading spinner appears
5. [ ] Verify no infinite loading (should complete within 3 seconds)
6. [ ] Verify redirect to dashboard after successful signup
7. [ ] Check Supabase Dashboard:
   - [ ] New user exists in `auth.users` table
   - [ ] New profile exists in `profiles` table with correct data

**Expected Results:**
- Registration completes successfully
- User is automatically logged in
- Profile is created with default values (role: student, locale: vi, currency: VND)
- No 500 errors in console

### Test 2.2: User Login
1. [ ] Log out from current session
2. [ ] Navigate to `/auth/login`
3. [ ] Enter test credentials:
   - Email: `jimmycuong1413@gmail.com`
   - Password: (your password)
4. [ ] Click "Đăng nhập" (Sign In)
5. [ ] Verify loading spinner appears
6. [ ] Verify no infinite loading (should complete within 3 seconds)
7. [ ] Verify redirect to appropriate dashboard based on role

**Expected Results:**
- Login completes successfully
- No infinite loading spinner
- User redirected to correct dashboard
- Session persists on page refresh

### Test 2.3: Logout
1. [ ] While logged in, locate logout button in sidebar
2. [ ] Click "Đăng xuất" (Logout)
3. [ ] Verify redirect to `/auth/login`
4. [ ] Verify user is logged out
5. [ ] Try accessing `/dashboard` directly
6. [ ] Verify redirect back to login page

**Expected Results:**
- Logout completes successfully
- User redirected to login page
- Protected routes are inaccessible
- No errors in console

### Test 2.4: Password Reset
1. [ ] Navigate to `/auth/login`
2. [ ] Click "Quên mật khẩu?" (Forgot Password)
3. [ ] Enter email address
4. [ ] Submit reset request
5. [ ] Check email for reset link
6. [ ] Follow link and set new password

**Expected Results:**
- Reset email sent successfully
- Password can be changed
- Can login with new password

---

## Phase 3: User Preferences

### Test 3.1: Profile Settings
1. [ ] Login as student: `jimmycuong1413@gmail.com`
2. [ ] Navigate to `/settings/profile`
3. [ ] Verify profile information displays:
   - [ ] Avatar shows user initials (no 404 error)
   - [ ] Full name displays
   - [ ] Email displays
   - [ ] Cookie balance shows: 500
4. [ ] Edit profile information:
   - Change full name
   - Change display name
   - Update phone number
   - Update location
5. [ ] Click "Lưu thay đổi" (Save Changes)
6. [ ] Verify success message appears
7. [ ] Refresh page and verify changes persisted

**Expected Results:**
- All profile data loads correctly
- Avatar fallback (initials) displays without errors
- Changes save successfully
- No hydration errors in console

### Test 3.2: Language & Region Preferences
1. [ ] Navigate to `/settings/preferences`
2. [ ] Change language preference to English
3. [ ] Verify UI updates to English
4. [ ] Change timezone to different timezone
5. [ ] Change currency to USD
6. [ ] Save preferences
7. [ ] Refresh page and verify preferences persisted
8. [ ] Check that prices display in selected currency

**Expected Results:**
- Language preference saves and persists
- Timezone affects time displays
- Currency affects price displays

---

## Phase 4: Cookie System

### Test 4.1: Cookie Balance Display
1. [ ] Login as student
2. [ ] Navigate to `/student/cookies`
3. [ ] Verify cookie balance displays: 500 cookies
4. [ ] Verify lifetime earned: 1000 cookies
5. [ ] Verify lifetime spent: 500 cookies
6. [ ] Check sidebar shows same cookie balance

**Expected Results:**
- Cookie balance displays correctly
- Transaction history shows all transactions
- Balance calculations are accurate

### Test 4.2: Cookie Transactions
1. [ ] On cookies page, verify transaction history shows:
   - [ ] 5 total transactions
   - [ ] 3 "earn" transactions (green)
   - [ ] 2 "spend" transactions (red)
2. [ ] Verify each transaction shows:
   - [ ] Amount
   - [ ] Type (earn/spend)
   - [ ] Source/reason
   - [ ] Date and time
3. [ ] Check transactions are sorted by date (newest first)

**Expected Results:**
- All test transactions display correctly
- Transaction types are color-coded
- Dates are formatted properly in Vietnamese format

---

## Phase 5: Booking System

### Test 5.1: View Bookings (Student)
1. [ ] Login as student
2. [ ] Navigate to `/student/bookings`
3. [ ] Verify 4 bookings display (2 completed, 2 upcoming)
4. [ ] Check each booking shows:
   - [ ] Teacher name
   - [ ] Date and time
   - [ ] Duration
   - [ ] Status badge (completed/upcoming/cancelled)
   - [ ] Topic/description
5. [ ] Filter by status: "Completed"
6. [ ] Verify only 2 completed bookings show

**Expected Results:**
- All bookings display with correct information
- Status badges have appropriate colors
- Filtering works correctly
- Dates show in correct timezone

### Test 5.2: View Schedule (Teacher)
1. [ ] Login as teacher: `jimmycuong1414@gmail.com`
2. [ ] Navigate to `/teacher/schedule`
3. [ ] Verify calendar view shows bookings
4. [ ] Verify same 4 bookings appear
5. [ ] Click on a booking to view details
6. [ ] Verify dialog opens with full booking information

**Expected Results:**
- Teacher can see all their bookings
- Calendar displays bookings correctly
- Dialog component loads without errors
- No missing component errors

---

## Phase 6: Teacher Profiles

### Test 6.1: Teacher Directory
1. [ ] Login as student
2. [ ] Navigate to `/teachers` or teacher directory page
3. [ ] Verify teacher profile card shows:
   - [ ] Teacher name
   - [ ] Bio
   - [ ] Experience years: 5
   - [ ] Hourly rate: 200,000 VND (or USD equivalent)
   - [ ] Average rating: 4.85
   - [ ] Total reviews: 42
   - [ ] Specialties: IELTS, Conversational, Business English
   - [ ] Verified badge

**Expected Results:**
- Teacher profile displays all information
- Verified badge shows for verified teachers
- Specialties display as tags/badges
- Rating displays with stars

### Test 6.2: Book a Teacher
1. [ ] Click "Book Now" or similar button
2. [ ] Select date and time
3. [ ] Select topic
4. [ ] Verify cookie cost displays
5. [ ] Confirm booking
6. [ ] Verify cookie balance decreases
7. [ ] Verify new booking appears in bookings list

**Expected Results:**
- Booking flow works smoothly
- Cookie balance updates correctly
- New booking created successfully

---

## Phase 7: Admin Dashboard

### Test 7.1: Admin Overview
1. [ ] Create admin user using `create_admin_user.sql`
2. [ ] Login as admin
3. [ ] Navigate to `/dashboard/admin`
4. [ ] Verify dashboard shows:
   - [ ] Current time (no hydration error)
   - [ ] Total users count
   - [ ] Total bookings count
   - [ ] Total revenue
   - [ ] Active sessions count
5. [ ] Refresh page multiple times
6. [ ] Verify time updates without hydration errors
7. [ ] Check console for no errors

**Expected Results:**
- Dashboard loads without errors
- Current time displays correctly (client-side only)
- No hydration mismatch warnings
- Statistics display accurate data

### Test 7.2: User Management
1. [ ] Navigate to admin user management section
2. [ ] View list of all users
3. [ ] Search for specific user
4. [ ] Filter by role (student/teacher/admin)
5. [ ] View user details
6. [ ] (If implemented) Edit user role

**Expected Results:**
- All users display in table
- Search and filter work correctly
- User details are accessible

---

## Phase 8: CometChat Video Classes

### Test 8.1: Device Pre-Check
1. [ ] Login as student
2. [ ] Navigate to `/device-check` or device pre-check page
3. [ ] Grant camera permissions when prompted
4. [ ] Verify camera preview shows your video
5. [ ] Grant microphone permissions
6. [ ] Speak and verify audio level meter responds
7. [ ] Test speaker output
8. [ ] Verify network quality indicator
9. [ ] Complete pre-check successfully

**Expected Results:**
- Camera preview displays correctly
- Microphone detects audio input
- Speaker test plays audio
- Network quality is detected
- No permission errors

### Test 8.2: Join Live Class
1. [ ] Navigate to upcoming booking
2. [ ] Click "Join Class" button (appears 5 minutes before class time)
3. [ ] Verify redirect to `/class/[classId]/live`
4. [ ] Wait for video call interface to load
5. [ ] Verify your video appears in preview
6. [ ] Verify teacher video appears when they join
7. [ ] Test controls:
   - [ ] Mute/unmute microphone
   - [ ] Turn camera on/off
   - [ ] End call button

**Expected Results:**
- Video call interface loads without errors
- Both video streams display correctly
- Audio works both ways
- Controls function properly
- No missing component errors (alert-dialog)

### Test 8.3: In-Class Chat
1. [ ] While in live class, locate chat panel
2. [ ] Send a text message
3. [ ] Verify message appears in chat
4. [ ] Verify teacher receives message
5. [ ] Receive message from teacher
6. [ ] Verify optimistic UI updates

**Expected Results:**
- Messages send successfully
- Real-time updates work
- Message history persists
- No lag or errors

### Test 8.4: End Class & Recording
1. [ ] Click "End Class" button
2. [ ] Confirm end class in alert dialog
3. [ ] Verify redirect back to dashboard
4. [ ] Navigate to `/recordings`
5. [ ] Verify class recording appears in list
6. [ ] Click to play recording
7. [ ] Verify video playback works

**Expected Results:**
- Class ends gracefully
- Recording is saved
- Recording is accessible
- Video player works correctly
- No missing component errors (select)

---

## Phase 9: Referral System

### Test 9.1: Referral Code
1. [ ] Login as student
2. [ ] Navigate to `/student/referral`
3. [ ] Verify personal referral code displays
4. [ ] Verify referral link displays
5. [ ] Click "Copy" button
6. [ ] Verify success message appears
7. [ ] Paste link in new browser tab
8. [ ] Verify link includes referral code parameter

**Expected Results:**
- Referral code generates correctly
- Copy functionality works
- Link is properly formatted

### Test 9.2: Referral History
1. [ ] On referral page, verify referral history shows:
   - [ ] 5 referred users
   - [ ] 3 completed referrals (green badge)
   - [ ] 2 pending referrals (yellow badge)
2. [ ] Verify total cookies earned: 150
3. [ ] Verify user avatars show initials (no 404 errors)
4. [ ] Check referral progress bar
5. [ ] Verify current tier: Silver
6. [ ] Verify progress to next tier: Gold

**Expected Results:**
- All referral data displays correctly
- Status badges are color-coded
- Avatar fallbacks work (no 404 errors)
- Tier progress calculates correctly

---

## Phase 10: Edge Cases & Error Handling

### Test 10.1: Network Errors
1. [ ] Open browser DevTools > Network tab
2. [ ] Set throttling to "Slow 3G"
3. [ ] Try loading various pages
4. [ ] Verify loading states show
5. [ ] Verify pages load eventually
6. [ ] Go offline
7. [ ] Try to perform actions
8. [ ] Verify appropriate error messages

**Expected Results:**
- Loading indicators show during slow connections
- Error messages are user-friendly
- App doesn't crash on network errors

### Test 10.2: Invalid Data
1. [ ] Try to book a class in the past
2. [ ] Try to book without sufficient cookies
3. [ ] Try to access another user's booking
4. [ ] Try to edit another user's profile
5. [ ] Try SQL injection in form fields

**Expected Results:**
- Validation prevents invalid data
- Security policies block unauthorized access
- No database errors
- User-friendly error messages

### Test 10.3: Concurrent Sessions
1. [ ] Login on two different browsers
2. [ ] Perform actions in both
3. [ ] Logout in one browser
4. [ ] Verify other session handles it gracefully

**Expected Results:**
- Multiple sessions work correctly
- Data stays in sync
- No session conflicts

---

## Phase 11: Performance & UX

### Test 11.1: Page Load Performance
1. [ ] Open browser DevTools > Lighthouse
2. [ ] Run performance audit on key pages:
   - [ ] Landing page
   - [ ] Login page
   - [ ] Dashboard
   - [ ] Live class page
3. [ ] Verify performance score > 80
4. [ ] Check for large image files
5. [ ] Check for unused JavaScript

**Expected Results:**
- Pages load within 3 seconds
- No layout shifts
- Smooth animations
- No console errors

### Test 11.2: Mobile Responsiveness
1. [ ] Open DevTools > Device Toolbar
2. [ ] Test on various screen sizes:
   - [ ] iPhone SE (375px)
   - [ ] iPhone 12 Pro (390px)
   - [ ] iPad (768px)
   - [ ] Desktop (1920px)
3. [ ] Verify all pages are responsive
4. [ ] Check navigation menu adapts to mobile
5. [ ] Verify forms are usable on mobile
6. [ ] Test video call interface on mobile

**Expected Results:**
- All pages display correctly on all screen sizes
- Touch targets are appropriately sized
- Text is readable without zooming
- Mobile navigation works smoothly

### Test 11.3: Accessibility
1. [ ] Test keyboard navigation (Tab key)
2. [ ] Verify all interactive elements are accessible
3. [ ] Test with screen reader (if available)
4. [ ] Check color contrast ratios
5. [ ] Verify form labels are properly associated

**Expected Results:**
- All features accessible via keyboard
- Screen reader can navigate the site
- Color contrast meets WCAG AA standards
- Forms are properly labeled

---

## Bug Tracking

### Known Fixed Issues ✅
- [x] Infinite loading on signup/login - Fixed
- [x] Hydration errors on admin dashboard - Fixed
- [x] Logout button not working - Fixed
- [x] 500 error on user registration - Fixed (profiles table created)
- [x] Missing UI components (dialog, select, alert-dialog) - Fixed
- [x] Avatar 404 errors - Fixed (using fallbacks)

### Issues to Watch For ⚠️
- [ ] CometChat API rate limits
- [ ] Supabase connection limits
- [ ] Large video file handling
- [ ] Timezone conversion edge cases
- [ ] Currency conversion accuracy

---

## Test Results Template

Use this template to document your test results:

```markdown
## Test Session: [Date]
**Tester:** [Your Name]
**Environment:** [Local/Staging/Production]
**Browser:** [Chrome/Firefox/Safari]

### Phase [X]: [Phase Name]
- Test [X.X]: [Test Name]
  - Status: ✅ Pass / ❌ Fail / ⚠️ Partial
  - Notes: [Any observations]
  - Issues Found: [List any bugs]
  - Screenshots: [Attach if relevant]

### Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Critical Issues: [X]
- Minor Issues: [X]

### Critical Issues
1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]
```

---

## Automation Testing (Future)

### Unit Tests
```bash
cd frontend
npm test
```

### E2E Tests (Playwright)
```bash
cd frontend
npm run test:e2e
```

### API Tests
- Test Supabase RLS policies
- Test CometChat API integration
- Test authentication flows

---

## Sign-Off Checklist

Before deploying to production:

- [ ] All Phase 1-9 tests passed
- [ ] No critical errors in console
- [ ] All database migrations applied
- [ ] Environment variables configured
- [ ] CometChat integration working
- [ ] Email notifications working
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured

---

## Contact & Support

**Issues Found During Testing:**
- Create issue in project repository
- Include test phase number
- Attach screenshots/logs
- Describe expected vs actual behavior

**Questions:**
- Check README.md first
- Check DATABASE_SETUP_GUIDE.md
- Check CometChat documentation

---

## Next Steps After Testing

1. **Fix any critical bugs found**
2. **Optimize performance issues**
3. **Improve error handling where needed**
4. **Add missing features identified during testing**
5. **Update documentation with any changes**
6. **Plan Phase 5 development** (if applicable)
7. **Deploy to staging environment**
8. **Conduct user acceptance testing (UAT)**
9. **Deploy to production**

---

**Last Updated:** 2026-01-27
**Version:** 1.0
**Status:** Ready for Testing
