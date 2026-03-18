# Deployment & Testing Checklist

**Current Status**: ✅ All Features Implemented - Ready for Testing & Deployment

---

## Pre-Deployment Verification ✅

### Environment Setup
- [x] Node.js 18+ installed
- [x] npm/yarn package manager available
- [x] `.env.local` file created with all secrets
- [x] Supabase project configured
- [x] CometChat app created and credentials obtained

### Dependencies
- [x] All packages installed: `npm install`
- [x] CometChat SDK installed: `@cometchat/chat-sdk-javascript`
- [x] Next.js 14 with App Router configured
- [x] Tailwind CSS configured
- [x] TypeScript enabled

### Build & Compilation
- [ ] Run `npm run build` and verify no errors
- [ ] Run `npm run dev` and verify app starts
- [ ] Check for TypeScript compilation errors
- [ ] Check for console warnings/errors in browser

---

## Feature Testing Checklist

### Phase 1: Internationalization (i18n)

**URLs & Routing**
- [ ] Navigate to `http://localhost:3000/vi/` → Shows Vietnamese UI
- [ ] Navigate to `http://localhost:3000/en/` → Shows English UI
- [ ] Visit `http://localhost:3000/` → Redirects to appropriate locale
- [ ] Browser language preference respected

**Language Switcher**
- [ ] Click language button in header
- [ ] Dropdown shows Vietnamese and English options
- [ ] Click Vietnamese → URL changes to `/vi/...`
- [ ] Click English → URL changes to `/en/...`
- [ ] Current page content updates to new language
- [ ] Back button still works on new locale

**Content Translation**
- [ ] Home page: Both languages display correctly
- [ ] Navigation: All menu items translated
- [ ] Forms: Input labels and buttons translated
- [ ] Messages: Error/success messages translated
- [ ] Dates: Format respects locale (vi-VN, en-US)

**No English Content in Vietnamese Mode**
- [ ] Check entire app in Vietnamese mode
- [ ] No untranslated English text visible
- [ ] Same for English mode with Vietnamese text

---

### Phase 2: User Preferences

**Navigate to Settings**
- [ ] Login as a user
- [ ] Navigate to `/[locale]/settings/preferences`
- [ ] Page loads with current preferences

**Timezone Selection**
- [ ] Timezone dropdown shows options
- [ ] Can select different timezone
- [ ] Displays current timezone
- [ ] Changes persist after page reload
- [ ] Supabase database updated

**Language Selection**
- [ ] Language dropdown shows vi/en options
- [ ] Select different language
- [ ] Page redirects to new locale URL
- [ ] Content updates to new language
- [ ] Database shows updated locale

**Currency Selection**
- [ ] Currency dropdown shows VND/USD/EUR
- [ ] Can select currency
- [ ] Selection persists
- [ ] Database field updated
- [ ] Used in future bookings/payments

**Save Feedback**
- [ ] Loading indicator shows while saving
- [ ] Success message displays (if implemented)
- [ ] Error message shows on failure
- [ ] Invalid data rejected with error

---

### Phase 3: Admin Dashboard

**Admin Access Control**
- [ ] Admin user can access `/[locale]/dashboard/admin`
- [ ] Non-admin users see "Access Denied"
- [ ] Redirects to `/[locale]/dashboard/student` for non-admin
- [ ] Proper role check in database

**Data Loading**
- [ ] Dashboard loads initially
- [ ] Loading state shows: "جاري التحميل..." or "Loading..."
- [ ] Data fetches from Supabase
- [ ] All sections display values (not blanks)
- [ ] Error message shows if fetch fails

**Statistics Display**

*Platform Stats*
- [ ] Total Users count shows
- [ ] Total Teachers count shows
- [ ] Total Students count shows
- [ ] Total Parents count shows
- [ ] Growth percentages display

*Revenue Stats*
- [ ] Total Revenue shows (sum of completed bookings)
- [ ] Monthly Revenue shows
- [ ] Average Booking Value calculates correctly
- [ ] Pending Payouts displays

*Cookie Stats*
- [ ] Total Circulating Cookies shows
- [ ] Issued This Month shows
- [ ] Redeemed This Month shows
- [ ] Average Redemption calculates

*Booking Stats*
- [ ] Total Bookings count shows
- [ ] Completed This Month count shows
- [ ] Completion Rate percentage calculates
- [ ] Average Rating displays

*Top Teachers*
- [ ] Top 5 teachers listed
- [ ] Ranked by revenue (highest first)
- [ ] Shows teacher name
- [ ] Shows teacher avatar (if available)
- [ ] Shows total revenue earned
- [ ] Shows number of bookings
- [ ] Shows rating

*Recent Activities*
- [ ] Shows recent activities list
- [ ] Activity icons display correctly
- [ ] Activity messages in correct language
- [ ] Timestamps show
- [ ] Empty state if no activities

**Create Admin User** (One-time setup)
- [ ] Create admin user in Supabase Auth
- [ ] Run `create_admin_user.sql` with correct UUID
- [ ] Login with admin email: `admin@easyeng.com`
- [ ] Access admin dashboard
- [ ] Verify data loads correctly

---

### Phase 4: Video Calling

**Pre-Check Page - Device Testing**

*Camera Testing*
- [ ] Navigate to `/[locale]/class/[classId]/pre-check`
- [ ] Camera check shows "checking" with spinner
- [ ] Browser requests camera permission
- [ ] Allow camera permission
- [ ] Camera check shows "success" with checkmark
- [ ] Video element shows real camera feed
- [ ] Camera can be toggled off (shows avatar instead)
- [ ] Error message if camera denied

*Microphone Testing*
- [ ] Microphone check shows "checking"
- [ ] Browser requests microphone permission
- [ ] Allow microphone permission
- [ ] Microphone check shows "success"
- [ ] Microphone can be toggled on/off
- [ ] Error message if microphone denied

*Speaker Testing*
- [ ] Speaker check shows "checking"
- [ ] Audio tone plays (0.5 seconds)
- [ ] Speaker check shows "success"
- [ ] Can hear the test tone
- [ ] Error message if speaker unavailable

*Network Testing*
- [ ] Network check shows "checking"
- [ ] Shows network speed classification
- [ ] Shows: "Excellent" (<100ms), "Good" (<300ms), or "Fair" (>300ms)
- [ ] Network check shows "success"
- [ ] Error message if network unreachable

*Join Button*
- [ ] Button shows "Đang kiểm tra..." while checks run
- [ ] Button enabled once all checks complete
- [ ] Click "Vào lớp học" button
- [ ] Redirects to `/[locale]/class/[classId]/live`

---

**Live Class Page - Video Calling**

*CometChat Initialization*
- [ ] Live page loads
- [ ] "Initializing video..." message (if loading)
- [ ] CometChat SDK initializes
- [ ] Error banner appears if CometChat error (with fallback UI)

*Video Display*
- [ ] Remote user (teacher) video displays
- [ ] Remote video shows actual stream or avatar
- [ ] Remote user name displays
- [ ] Local user (you) video shows in picture-in-picture
- [ ] Local user name displays on video

*Call Controls*
- [ ] Microphone button visible
  - [ ] Green when enabled
  - [ ] Red when disabled
  - [ ] Can toggle on/off
- [ ] Camera button visible
  - [ ] Green when enabled
  - [ ] Red when disabled
  - [ ] Can toggle on/off
- [ ] Screen share button visible
  - [ ] Can click to start sharing
  - [ ] Shows "Sharing" when active
- [ ] End call button visible
  - [ ] Red button with phone icon
  - [ ] Can click to end call

*Call Duration Timer*
- [ ] Timer shows time in MM:SS format
- [ ] Increments every second
- [ ] Shows in header near "LIVE" badge
- [ ] Changes color if <5 minutes remaining

*Chat Panel*
- [ ] Chat panel visible on right side
- [ ] Shows chat messages
- [ ] Can type message in input
- [ ] Click send button
- [ ] Message appears in chat
- [ ] Messages from other user appear in real-time
- [ ] Can close/open chat panel

*Call End*
- [ ] Click end call button
- [ ] Confirmation dialog appears (Optional)
- [ ] Click "Kết thúc" (End)
- [ ] Redirects to `/[locale]/class/[classId]/feedback`
- [ ] Call cleanup happens properly

---

**Two-User Testing** (Requires two devices/windows)

*Both Can See Each Other*
- [ ] User 1 starts class, sees their own video
- [ ] User 2 joins same class
- [ ] User 1 now sees User 2's video
- [ ] User 2 sees User 1's video
- [ ] Both show picture-in-picture correctly

*Real-Time Chat*
- [ ] User 1 sends message
- [ ] Message appears in User 1's chat
- [ ] Message appears in User 2's chat in real-time
- [ ] User 2 sends message
- [ ] Message appears in both chats
- [ ] Chat history preserved

*Audio/Video Controls*
- [ ] User 1 mutes microphone
- [ ] User 2 still hears User 1's audio (if unmuted before)
- [ ] User 1 disables camera
- [ ] User 1's video shows avatar instead
- [ ] User 2 can still see User 2's own video
- [ ] User 2 disables camera
- [ ] User 1 sees User 2's avatar

*Call Duration*
- [ ] Timer runs for both users
- [ ] Both see same duration
- [ ] Timer doesn't reset when actions taken

---

## Bug & Error Testing

### Permission Errors
- [ ] Deny camera permission → Shows error message
- [ ] Deny microphone permission → Shows error message
- [ ] Allow then revoke in browser settings → Shows error
- [ ] Can still join class even with denied permissions

### Network Issues
- [ ] Disable WiFi → Network test fails
- [ ] Enable WiFi → Network test passes
- [ ] Refresh page during call → CometChat reconnects
- [ ] Browser loses connection → Graceful error handling

### CometChat Errors
- [ ] Invalid credentials in .env.local → Error banner
- [ ] CometChat service down → Fallback to mock UI
- [ ] Auth token generation fails → Shows error
- [ ] Message send fails → Shows error with retry

### Component Errors
- [ ] Video component crashes → Error boundary catches
- [ ] Shows retry and reload buttons
- [ ] Development: Shows error stack trace

---

## Performance Testing

### Load Times
- [ ] Pre-check page loads <2 seconds
- [ ] Live page loads <2 seconds
- [ ] Video initializes <5 seconds
- [ ] Messages send <1 second

### Memory Usage
- [ ] Page doesn't leak memory over time
- [ ] Media streams cleanup on unmount
- [ ] Event listeners removed on cleanup
- [ ] No console warnings about memory

### Browser Compatibility
- [ ] Chrome: Works correctly
- [ ] Firefox: Works correctly
- [ ] Safari: Works correctly
- [ ] Edge: Works correctly
- [ ] Mobile (iOS Safari): Responsive and functional
- [ ] Mobile (Android Chrome): Responsive and functional

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all buttons and inputs
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Focus visible on all interactive elements

### Screen Reader (Optional)
- [ ] All buttons have labels
- [ ] Images have alt text
- [ ] Error messages announced
- [ ] Form labels associated with inputs

### Color Contrast
- [ ] All text meets WCAG AA contrast ratio
- [ ] Error messages visible in red text
- [ ] Success messages visible in green

---

## Security Testing

### Authentication
- [ ] Only authenticated users can join calls
- [ ] Non-authenticated users redirected to login
- [ ] Session maintained across page refresh
- [ ] Logout clears all session data

### Permissions
- [ ] Admin can only be set in database (not UI)
- [ ] Non-admin cannot access admin dashboard
- [ ] Users can only modify own preferences
- [ ] Auth tokens not exposed in client code

### Data Validation
- [ ] Invalid timezone rejected
- [ ] Invalid currency rejected
- [ ] XSS attempts in messages handled
- [ ] SQL injection not possible (using parameterized queries)

---

## Deployment Steps

### 1. Pre-Deployment
```bash
# Install dependencies
npm install

# Run linter/type check
npm run lint
npm run type-check

# Build project
npm run build

# Test build
npm run start
```

### 2. Environment Setup
- [ ] Create `.env.local` with all required variables
- [ ] Verify Supabase credentials correct
- [ ] Verify CometChat credentials correct
- [ ] Test connection to Supabase

### 3. Database Migrations
- [ ] Run `add_currency_to_profiles.sql` in Supabase
- [ ] Run `create_admin_user.sql` in Supabase (with real UUID)
- [ ] Verify tables/columns created correctly

### 4. Deploy to Staging
```bash
# Push to staging branch
git push origin main:staging

# Verify deployment
# Test all features in staging environment
```

### 5. Deploy to Production
```bash
# Create release tag
git tag -a v1.0.0-cometchat -m "CometChat integration complete"
git push origin v1.0.0-cometchat

# Deploy to production
# Verify all features working in production
```

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads
- [ ] Login/signup works
- [ ] Admin dashboard accessible
- [ ] Video call can be initiated
- [ ] Chat messages send/receive

### Monitor Errors
- [ ] Check error logs in Sentry/logging service
- [ ] Monitor Supabase query performance
- [ ] Check CometChat connection status
- [ ] Monitor browser console for errors

### User Feedback
- [ ] Collect user testing feedback
- [ ] Fix critical bugs immediately
- [ ] Schedule non-critical bug fixes
- [ ] Plan Phase 2 features

---

## Final Sign-Off

- [ ] All features tested and working
- [ ] All bugs documented and prioritized
- [ ] Performance acceptable
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Team trained on new features
- [ ] Ready for public release

---

## Next Phase (Phase 2 - Optional)

1. **Activity Logging**: Track all user actions in activity_log table
2. **Call Recording**: Implement call recording and playback
3. **Group Classes**: Extend to support multiple students
4. **Advanced Analytics**: Detailed usage dashboard
5. **Mobile App**: React Native version
6. **Payment Integration**: Stripe for bookings
7. **Notifications**: Push notifications for class reminders
8. **Review System**: Student reviews of teachers

---

**Questions?** Refer to:
- `FINAL_IMPLEMENTATION_SUMMARY.md` - Feature overview
- `COMETCHAT_IMPLEMENTATION_UPDATE.md` - Technical details
- `ADMIN_SETUP_GUIDE.md` - Admin user setup
- `COMETCHAT_INTEGRATION_STATUS.md` - Architecture details
