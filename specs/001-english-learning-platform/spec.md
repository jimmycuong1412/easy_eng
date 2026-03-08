# Feature Specification: Modern English Learning Platform

**Feature Branch**: `001-english-learning-platform`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "Modern English learning platform with stunning student UI, multi-role dashboards, and innovative 'Cookies' virtual currency system for discounted class bookings"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Class Booking with Gems Discount (Priority: P1)

Students can browse available English classes, earn "Gems" through platform engagement, and use those Gems to get discounts when booking classes.

**Why this priority**: Core value proposition - enables students to book classes affordably while incentivizing platform engagement.

**Independent Test**: Student can log in, view their Gem balance, browse classes, apply Gems to get a discount, and successfully book a class.

**Acceptance Scenarios**:

1. **Given** a student has 100 Gems, **When** they select a class worth $50 and apply 50 Gems (each Gem = $0.50 discount), **Then** the final price should be $25
2. **Given** a student has insufficient Gems, **When** they try to apply more Gems than they have, **Then** the system should show an error and limit the discount to available Gems
3. **Given** a student books a class successfully, **When** they view their booking history, **Then** they should see the booking with the original price, discount applied, and final price paid

---

### User Story 2 - Multi-Role Dashboard Access (Priority: P1)

Different user roles (Students, Teachers, Administrators) can log in and access role-specific dashboards with relevant features and data.

**Why this priority**: Essential for platform operations - each role needs appropriate tools to perform their functions.

**Independent Test**: A user with a specific role can log in and see only the dashboard and features appropriate to their role.

**Acceptance Scenarios**:

1. **Given** a student logs in, **When** they access the dashboard, **Then** they see their upcoming classes, Gem balance, and booking options
2. **Given** a teacher logs in, **When** they access the dashboard, **Then** they see their schedule, student roster, and class materials
3. **Given** an administrator logs in, **When** they access the dashboard, **Then** they see platform analytics, user management, and system configuration options
4. **Given** a student tries to access teacher features, **When** they attempt unauthorized access, **Then** they receive a permission denied message

---

### User Story 3 - Career Path Avatar Progression System (Priority: P1)

Students can select their dream career path and see their 8-bit pixel art character evolve based on classroom performance, staying motivated to attend classes, complete assignments, and visualize their future career journey.

**Why this priority**: Elevated from P2 to P1 - Core engagement driver that directly ties learning activities to visible, emotionally resonant character progression. Expected to increase attendance by 30% and assignment completion by 25%.

**Independent Test**: Student selects a career path during onboarding, completes a class with quiz, earns XP and Gold, sees their character level up with visual evolution, and purchases a cosmetic item from the marketplace.

**Acceptance Scenarios**:

#### Career Path Selection
1. **Given** a new student completes registration, **When** they reach the onboarding flow, **Then** they can choose from 6 career archetypes: Doctor, Engineer, Warrior, Business Person, Artist, Scientist
2. **Given** a student selects "Doctor" career path, **When** the selection is confirmed, **Then** they see their 8-bit character with medical theme (green color scheme, healing animations)
3. **Given** a student wants to change their career path, **When** they access profile settings, **Then** they can switch careers (once per month) with a warning about incompatible equipped items

#### Dual Reward Currency System
4. **Given** a student completes a class (attendance + quiz), **When** the class is marked complete, **Then** they earn base 50 XP points
5. **Given** a student scores 90%+ on a class quiz, **When** the score is recorded, **Then** they earn bonus +25 XP (total 75 XP for the class)
6. **Given** a student completes a class, **When** rewards are calculated, **Then** they earn 10-30 Gold coins based on performance tier (10 for <75%, 20 for 75-89%, 30 for 90%+)
7. **Given** a student logs in for the first time today, **When** they access the dashboard, **Then** they earn 5 Gold as daily login bonus
8. **Given** a student has logged in 7 consecutive days, **When** they log in on day 7, **Then** they earn 50 Gold weekly streak bonus

#### Character Progression & Visualization
9. **Given** a student accumulates 500 XP, **When** the threshold is crossed, **Then** their character levels up from Level 1 to Level 2 with celebration animation
10. **Given** a student reaches Level 6, **When** they view their character, **Then** they see upgraded uniform and first skill animation unlocked
11. **Given** a student reaches Level 11, **When** they view their character, **Then** they see professional attire and advanced animations
12. **Given** a student reaches Level 21+, **When** they view their character, **Then** they see master-level appearance with career-specific effects
13. **Given** a student views their dashboard, **When** the page loads, **Then** they see real-time character preview with current equipment and level
14. **Given** a student levels up during an active video class, **When** the level-up threshold is crossed, **Then** the level-up celebration is queued and displays after the class ends (prevents interruption)
15. **Given** a student's 8-bit character is displayed, **When** rendered, **Then** the sprite is 64x64 pixels with career-specific color palette (6 palettes: Doctor-green, Engineer-blue, Warrior-red, Business-gold, Artist-purple, Scientist-cyan)

#### Customization Marketplace
16. **Given** a student has 100 Gold, **When** they browse the marketplace, **Then** they see purchasable items: Hats (50-200 Gold), Outfits (100-500 Gold), Backgrounds (150 Gold), Emotes (75 Gold), Pets (300 Gold)
17. **Given** a student wants to buy a hat costing 75 Gold, **When** they have 100 Gold and click purchase, **Then** the item is added to inventory, 75 Gold is deducted, and they see purchase confirmation
18. **Given** a student owns an item, **When** they access customization, **Then** they can equip/unequip items and see live preview on their character
19. **Given** a student has 50 Gold but tries to buy a 75 Gold item, **When** they click purchase, **Then** they see "Insufficient Gold" error with their current balance
20. **Given** marketplace items have career compatibility tags, **When** a student with "Doctor" career views items, **Then** universal items show "All Careers" tag and career-specific items show compatibility (e.g., "Doctor Only" or "Not compatible with Doctor")
21. **Given** two students attempt to purchase the same item simultaneously, **When** both click purchase, **Then** system uses database row-level locking on student Gold balance to process transactions sequentially and prevent negative balances

#### Leaderboards & Social
22. **Given** a student views leaderboards, **When** the page loads, **Then** they see top characters ranked by XP within each career path
23. **Given** a student is ranked #15 in "Engineer" leaderboard, **When** they view the leaderboard, **Then** they see their position highlighted with character preview

#### Parental Controls
24. **Given** parental controls are enabled with 100 Gold/day spending limit, **When** a student tries to spend 150 Gold in one day, **Then** the purchase is blocked with explanation message

---

### User Story 4 - Teacher Class Management (Priority: P2)

Teachers can create class schedules, manage class capacity, view enrolled students, and update class materials.

**Why this priority**: Enables teachers to independently manage their classes without admin intervention.

**Independent Test**: Teacher can create a new class, set its details, and see students who have enrolled.

**Acceptance Scenarios**:

1. **Given** a teacher wants to create a new class, **When** they fill in class details (time, topic, capacity, price), **Then** the class appears in the student booking system
2. **Given** a class has reached capacity, **When** a student tries to book it, **Then** they see a "Class Full" message
3. **Given** a student enrolled in a class, **When** the teacher views the class roster, **Then** they see the student's name and contact information

---

### User Story 5 - Live Video Classes (Priority: P1)

Teachers and students can participate in real-time video classes with face-to-face interaction, screen sharing, and in-call chat functionality.

**Why this priority**: Core learning experience - students need direct video interaction with teachers for effective English learning.

**Independent Test**: Teacher starts a scheduled class video session, students with valid bookings can join, both parties can see and hear each other, teacher can share screen, and attendance is tracked for rewards.

**Acceptance Scenarios**:

#### Teacher Starting a Class
1. **Given** a teacher has a scheduled class starting within 15 minutes, **When** they view their dashboard, **Then** they see a "Start Class" button for that class
2. **Given** a teacher clicks "Start Class", **When** the video room loads, **Then** they see their own video preview and waiting room for students
3. **Given** a teacher is in the video room, **When** students join, **Then** the teacher sees each student's video feed and name

#### Student Joining a Class
4. **Given** a student has booked a class that is currently live, **When** they view their dashboard, **Then** they see a "Join Class" button with a green "LIVE" indicator
5. **Given** a student clicks "Join Class", **When** they enter the video room, **Then** they see the teacher's video and can enable their own camera/microphone
6. **Given** a student has not booked the class, **When** they try to access the video room URL, **Then** they receive an "Access Denied - Booking Required" message

#### In-Class Features
7. **Given** a video class is in progress, **When** the teacher enables screen sharing, **Then** all students see the teacher's shared screen
8. **Given** a video class is in progress, **When** a participant sends a chat message, **Then** all participants see the message within 1 second
9. **Given** a student's internet connection is unstable, **When** video quality drops, **Then** the system automatically adjusts to maintain audio quality

#### Class End and Rewards
10. **Given** a teacher ends the class, **When** the session closes, **Then** all participants are redirected to a "Class Ended" summary page showing:
    - Session duration and attendance percentage
    - XP and Gold earned (for students who met 50% attendance threshold)
    - Teacher rating prompt (5-star system)
    - "Book Next Class" button with recommended classes
    - Session transcript/chat history download option
11. **Given** a class has ended, **When** the system processes attendance, **Then** students who attended receive their XP and Gold rewards
12. **Given** a video class is in progress, **When** participants view the interface, **Then** they see a session timer displaying elapsed time (MM:SS format) and scheduled end time
13. **Given** the session timer reaches scheduled end time, **When** class continues, **Then** timer shows overrun duration in orange/yellow with "+ MM:SS" format

---

### User Story 6 - Admin Platform Analytics (Priority: P3)

Administrators can view comprehensive platform metrics including user growth, class bookings, Cookie circulation, revenue, and engagement trends.

**Why this priority**: Important for business insights but not critical for core platform operations.

**Independent Test**: Admin can log in and view accurate, up-to-date analytics dashboards.

**Acceptance Scenarios**:

1. **Given** an admin accesses the analytics dashboard, **When** they view the metrics, **Then** they see total users, active users, total bookings, and revenue for the selected time period
2. **Given** Cookie transactions occur, **When** admin views Cookie analytics, **Then** they see total Cookies issued, redeemed, and current circulation

---

### Edge Cases

#### Booking and Scheduling Edge Cases

1. **Last-minute bookings**: When a student tries to book a class starting in less than 1 hour, system displays a warning "Late booking - class starts soon" but allows the booking if spots available
2. **Concurrent booking conflicts**: When multiple students try to book the last available spot simultaneously, system uses transaction locking to ensure only one succeeds; others receive "Class Full" message and can join waitlist
3. **Class time conflicts**: When a student tries to book a class that overlaps with an already-booked class, system prevents the booking and shows the conflict
4. **Timezone handling**: When students and teachers are in different timezones, all times displayed in user's local timezone with UTC offset shown for clarity

#### Gem System Edge Cases

5. **Gem expiration**: Gems earned do NOT expire by default; however, administrators can configure expiration policies (e.g., expire after 12 months of inactivity) if needed for business reasons
6. **Partial Gem discounts**: When a class costs $45 and student has 100 Gems (max $50 discount), but maximum discount is capped at 50%, system allows using only 45 Gems ($22.50 discount)
7. **Gem fraud prevention**: System detects patterns like rapid account creation for referral bonuses, completion of same activity repeatedly, or bot-like behavior and flags suspicious accounts for admin review
8. **Negative Gem balance**: System prevents Gem balance from going negative; all spending transactions check balance first
9. **Gem transaction failures**: If Gem deduction succeeds but booking fails, system automatically refunds the Gems and logs the incident

#### Cancellation and Refund Edge Cases

10. **Teacher-initiated cancellations**: When a teacher cancels a class that students booked with Gems, students receive full refund (both money paid AND Gems spent) plus bonus compensation Gems for inconvenience
11. **Student-initiated cancellations**: When a student cancels a booking, refund policy applies (e.g., full refund if >24 hours before class, 50% if 2-24 hours, no refund if <2 hours); Gems are refunded following same timeline
12. **No-show students**: When a student doesn't attend a booked class, no refund is issued; Gems spent are not returned
13. **Partial refunds**: When partial refunds are issued, both money and Gems are refunded proportionally (e.g., 50% refund = 50% of money + 50% of Gems)

#### Role and Permission Edge Cases

14. **Role changes**: When a user's role changes (e.g., student becomes teacher), system preserves their existing data (student keeps Gem balance) while granting new permissions
15. **Account suspension**: When an account is suspended for policy violations, Gem balance is frozen but not deleted; restored upon reinstatement
16. **Multiple role assignments**: System allows users to have multiple roles simultaneously (e.g., a teacher who is also a student) with unified dashboard showing both perspectives

#### System and Data Edge Cases

17. **Database inconsistencies**: If Gem balance calculation error is detected, system flags discrepancy for admin review and prevents further transactions until resolved
18. **Payment processing failures**: When payment succeeds but booking creation fails, system initiates automatic refund and notifies support team
19. **Orphaned data**: When a teacher deletes their account, their past classes remain in students' booking history but marked as "Former Teacher"
20. **Class capacity changes**: When a teacher reduces class capacity after bookings exceed new limit, existing bookings are honored; no new bookings accepted

#### Video Class Edge Cases

21. **Teacher no-show**: When a teacher doesn't start the class within 15 minutes of scheduled time, system sends automated notification to admin and students receive option to reschedule or get full refund
22. **Connection drops**: When a participant loses connection during class, system attempts automatic reconnection for 60 seconds; if unsuccessful, logs partial attendance
23. **Browser compatibility**: When a student's browser doesn't support WebRTC, system displays clear error message with supported browser list and download links
24. **Device permissions denied**: When camera/microphone permissions are blocked, system shows step-by-step guide to enable permissions for each browser type
25. **Multiple device login**: When same user attempts to join video class from multiple devices simultaneously, system allows only one active session and disconnects older sessions
26. **Class overrun**: When a teacher continues past scheduled end time, system sends 5-minute warning; after 15 minutes overrun, displays "Class Extended" to students but doesn't force disconnect
27. **Network bandwidth**: When detected bandwidth is below 500kbps, system automatically disables video and maintains audio-only mode with notification to user
28. **Concurrent student joins**: When multiple students join simultaneously within 1 second, system queues join requests and processes sequentially to prevent CometChat API race conditions; students see "Joining class..." indicator
29. **Teacher ends while student joining**: When teacher ends session while student is in process of joining, student receives "Class Ended" message with session summary instead of entering empty room
30. **CometChat service outage**: When CometChat API is unreachable, system displays "Video service unavailable" error with estimated recovery time and allows students to reschedule or request refund
31. **Session cleanup on end**: When teacher ends class, system executes cleanup sequence: (1) disconnect all participants, (2) finalize attendance records, (3) trigger reward calculations, (4) archive session metadata, (5) update class status
32. **Late join window**: Students can join live class up to 10 minutes after scheduled start time; joining after 10 minutes shows "Class in progress - late join may affect participation credit"
33. **Minimum attendance for rewards**: Students must attend at least 50% of session duration (based on joined_at to left_at timestamps) to qualify for XP/Gold rewards
34. **Server restart during session**: Active video sessions continue in CometChat infrastructure (unaffected); database reconnection logic ensures attendance tracking resumes when server recovers

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support user authentication with role-based access control (Student, Teacher, Administrator)
- **FR-002**: System MUST allow students to browse and search available classes with filters (date, time, topic, teacher, price)
- **FR-003**: System MUST maintain a Gem balance for each student account
- **FR-004**: System MUST calculate class prices with Gem discounts applied (1 Gem = $0.50 discount)
- **FR-005**: System MUST prevent students from using more Gems than they have
- **FR-006**: System MUST award Gems automatically when students complete qualifying activities
- **FR-007**: System MUST allow teachers to create, update, and manage their class schedules
- **FR-008**: System MUST enforce class capacity limits and prevent overbooking
- **FR-009**: System MUST provide role-specific dashboards with appropriate features for each user type
- **FR-010**: System MUST track and display booking history with price breakdowns (original price, Gem discount, final price)
- **FR-011**: System MUST send notifications for important events (booking confirmations, Gem earnings, class reminders)
- **FR-012**: System MUST provide administrators with analytics and reporting capabilities
- **FR-013**: System MUST handle payment processing for class bookings
- **FR-014**: System MUST log all Gem transactions (earned, spent, refunded) for audit purposes
- **FR-015**: System MUST provide a stunning, responsive UI that works on desktop and mobile devices
- **FR-016**: System MUST allow students to select one of six career paths (Doctor, Engineer, Warrior, Business, Artist, Scientist) during onboarding
- **FR-017**: System MUST maintain XP and Gold balances for each student character
- **FR-018**: System MUST award XP (50 base + 25 quiz bonus) automatically upon class completion
- **FR-019**: System MUST award Gold (10-30 based on performance tier) automatically upon class completion
- **FR-020**: System MUST calculate character level as floor(totalXP / 500) + 1
- **FR-021**: System MUST display 8-bit character with visual evolution based on level ranges (1-5, 6-10, 11-20, 21+)
- **FR-022**: System MUST provide a marketplace where students can purchase cosmetic items with Gold
- **FR-023**: System MUST prevent Gold purchases when balance is insufficient
- **FR-024**: System MUST allow students to equip/unequip owned items on their character
- **FR-025**: System MUST track daily login streaks and award 5 Gold per daily login
- **FR-026**: System MUST track weekly streaks and award 50 Gold bonus every 7 consecutive days
- **FR-027**: System MUST display career-specific leaderboards ranked by XP
- **FR-028**: System MUST support parental controls for marketplace purchase limits
- **FR-029**: System MUST log all XP and Gold transactions for audit purposes
- **FR-030**: System MUST provide real-time video calling for live classes via CometChat integration
- **FR-031**: System MUST allow teachers to start video sessions for scheduled classes
- **FR-032**: System MUST allow students with valid bookings to join live video classes
- **FR-033**: System MUST track video session attendance for XP/Gold reward calculation
- **FR-034**: System MUST provide in-call chat functionality during video sessions
- **FR-035**: System MUST support screen sharing for teachers during video classes
- **FR-036**: System MUST display class session status (scheduled, live, ended) in real-time

### Key Entities *(include if feature involves data)*

- **User**: Represents a platform user with role (Student/Teacher/Administrator), authentication credentials, profile information
- **Student**: Extends User, includes Gem balance, booking history, achievement data, referral tracking
- **Teacher**: Extends User, includes class history, rating, bio, availability schedule
- **Class**: Represents an English class with topic, teacher, schedule (date/time), capacity, price, enrolled students
- **Booking**: Links a Student to a Class with booking details (Gems used, discount amount, final price paid, status)
- **Gem Transaction**: Records Gem movements (type: earned/spent/refunded, amount, reason, timestamp, related entity)
- **Activity Rule**: Defines how students earn Gems (activity type, Gem reward amount, qualifying conditions)
- **Career Path**: Defines a career archetype (Doctor, Engineer, Warrior, Business, Artist, Scientist) with unique theme colors, base character sprite, and level evolution stages
- **Student Character**: Links a Student to their chosen Career Path with XP balance, Gold balance, current level, equipped items, and streak tracking
- **Marketplace Item**: Cosmetic item purchasable with Gold (category: hat/outfit/background/emote/pet) with price, sprite, and career compatibility
- **Student Inventory**: Records items owned by a student with purchase timestamp and Gold spent
- **Progression Transaction**: Audit log of XP/Gold movements (type: xp_earned/gold_earned/gold_spent/level_up) with balance tracking
- **Class Session**: Tracks live video session metadata (CometChat group ID, session status, start/end times, participant count, recording URL)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can complete a full booking flow (browse → select → apply Gems → book) in under 3 minutes
- **SC-002**: System maintains <200ms p95 response time for class browsing and booking operations
- **SC-003**: UI achieves WCAG 2.1 Level AA accessibility standards
- **SC-004**: 90% of students successfully book their first class on first attempt without support
- **SC-005**: System accurately calculates and applies Gem discounts with 100% accuracy (zero calculation errors)
- **SC-006**: Platform handles 1000+ concurrent users without performance degradation
- **SC-007**: All role-based access controls enforce proper permissions with zero unauthorized access incidents
- **SC-008**: Gem earning system triggers automatically within 1 second of qualifying activity completion
- **SC-009**: Mobile UI renders correctly on devices with screens as small as 320px width
- **SC-010**: System achieves 99.9% uptime during business hours (measured monthly)
- **SC-011**: 80% of students select a career path within their first week on the platform
- **SC-012**: 30% increase in class attendance after Career Path system launch (measured over 3 months)
- **SC-013**: 25% improvement in assignment/quiz completion rates after Career Path system launch
- **SC-014**: Character viewer renders at 60fps on modern devices with <100ms XP update reflection
- **SC-015**: XP and Gold calculations achieve 100% accuracy with zero balance discrepancies
- **SC-016**: Video calls connect within 5 seconds of joining for 95% of attempts
- **SC-017**: Video quality maintains minimum 720p resolution on stable broadband connections
- **SC-018**: In-call chat messages deliver within 500ms during active video sessions

## Assumptions *(mandatory)*

- Students have basic internet access and can use modern web browsers or mobile devices
- Payment processing is handled through VNPay, MoMo, ZaloPay (Vietnam market) with Stripe as international fallback
- Teachers are verified before being granted access to create and manage classes
- Gem-to-dollar conversion rate (1 Gem = $0.50) is set by business team and may be adjusted in future
- Students understand basic gamification concepts (earning rewards, spending currency)
- Platform launches with Vietnamese UI (primary) and English (secondary)
- Standard class duration is **25 minutes** (optimized for focus and scheduling flexibility)
- Class scheduling assumes teachers set their own availability in their declared timezone
- Users declare their timezone in profile settings (default: Asia/Ho_Chi_Minh UTC+7)
- Email, in-app, and browser push notifications are primary communication channels
- Gem transactions are non-refundable once spent (except in case of class cancellations by teachers)
- Teachers receive **70% of booking price** (after Gem discounts); platform retains 30%
- Gems are primarily earned through **referral coupons** (100 Gems when referred friend completes first booking)
- Quizzes are **built into the platform** with 5-10 questions, 70% pass threshold
- Character sprites are **AI-generated** with manual cleanup for consistency (quality validated by design team before deployment)
- **Video class network requirements**: Target market (Vietnam) has adequate broadband infrastructure - minimum 5 Mbps down / 2 Mbps up available to 85%+ of urban users (validated via 2025 Vietnam Internet Speed Report)
- **Camera/microphone hardware**: Students are expected to have device with camera and microphone (desktop webcam, laptop built-in, or smartphone); students without hardware can attend audio-only with prior teacher notification
- **CometChat encryption**: Video/audio streams are encrypted end-to-end by CometChat infrastructure (AES-256); platform does not implement additional encryption layer

## Constraints *(optional)*

### Business Constraints
- Gem discounts cannot reduce class price below **$5 USD minimum** (approximately 125,000 VND)
- Maximum Gem discount per booking is capped at 50% of class price to ensure revenue sustainability
- Teachers receive 70% of final booking price (after Gem discounts applied)
- Free Gem giveaways for promotions must be approved by administrators
- Refund policies must comply with Vietnamese consumer protection regulations

### User Experience Constraints
- Student UI must be mobile-first design (majority of users expected on mobile devices)
- Dashboard load time must be under 2 seconds on 3G network speeds
- All critical user flows must work without JavaScript enabled (graceful degradation)
- Platform must support users with disabilities per WCAG 2.1 Level AA

### Data Constraints
- Gem balance history must be retained for minimum 12 months for audit purposes
- User data must be retained according to data protection regulations (GDPR, CCPA compliance)
- Class booking data must be available for reporting for minimum 24 months

## Dependencies *(optional)*

### External Systems
- Third-party payment gateway for processing class payments
- Email service provider for sending notifications and confirmations
- Authentication service for secure user login and session management
- Cloud storage for class materials and user profile images
- Analytics platform for tracking user behavior and platform metrics
- **CometChat** for real-time video/voice calling and in-call chat (Build Plan - Free Tier for development, Basic Plan for production)
  - **Rate Limits**: 100 requests/minute for user provisioning API, 500 requests/minute for session operations
  - **MAU Limits**: Free tier supports 100 monthly active users, Basic tier supports unlimited MAU
  - **Concurrent Session Estimation**: Free tier ~20 concurrent sessions, Basic tier unlimited (based on MAU distribution)

### Prerequisites
- User registration and authentication system must be operational before class booking
- Payment integration must be tested and verified before enabling paid bookings
- Gem earning rules must be configured by administrators before student activities can earn Gems
- Teacher onboarding process must be complete before they can create classes
- **CometChat account must be created and API keys configured before video classes can function**
- **User sync between Supabase Auth and CometChat must be operational for video class access**

## Out of Scope *(optional)*

This feature specification explicitly **excludes**:

- ~~Video conferencing or live class delivery infrastructure~~ *(NOW IN SCOPE via CometChat integration)*
- Content creation tools for teachers (teachers provide their own materials)
- Automated grading or assessment systems
- Social networking features (friend connections, messaging between students)
- Multi-language support (English only for initial release)
- Gem trading or gifting between students
- Marketplace for third-party course content
- Integration with external learning management systems (LMS)
- Mobile native apps (web-based responsive design only for initial release)
- AI-powered features (chatbots, personalized learning paths)

## Security & Privacy Considerations *(optional)*

### Security Requirements
- All user passwords must be securely hashed (never stored in plain text)
- All payment transactions must be processed over encrypted connections
- Role-based access control must prevent unauthorized access to dashboards and features
- Gem transaction logs must be tamper-proof to prevent fraud
- Session management must automatically expire inactive sessions
- Admin actions (user management, Gem adjustments) must be logged for audit trail

### Privacy Requirements
- Students' personal information visible only to authorized teachers and administrators
- Students cannot see other students' Gem balances or transaction histories
- Teachers cannot access student data from classes they don't teach
- Gem earning activities must not expose sensitive student learning data publicly
- User consent required before collecting analytics or behavioral data
- Data retention policies must allow users to request data deletion per regulations

### Fraud Prevention
- System must detect and prevent Gem farming or gaming the earning system
- Referral Gem bonuses must verify legitimate new user signups (prevent fake accounts)
- Multiple accounts from same user must be detected and prevented
- Unusual Gem spending patterns should trigger review flags

## Non-Functional Requirements *(optional)*

### Performance
- **NFR-001**: Dashboard pages load in under 2 seconds on 3G connections (mobile)
- **NFR-002**: Class search results return in under 500ms for catalogs up to 10,000 classes
- **NFR-003**: System supports 1,000 concurrent users with <200ms p95 response time
- **NFR-004**: Payment processing completes within 10 seconds under normal conditions
- **NFR-027**: Video class connection establishes within 5 seconds for 95% of attempts
- **NFR-028**: Video sessions maintain stable quality on broadband connections ≥5 Mbps download, ≥2 Mbps upload, <100ms latency
- **NFR-029**: Video quality automatically adjusts based on network conditions with defined tiers:
  - **High Quality**: ≥10 Mbps down / ≥4 Mbps up → 1080p @ 30fps
  - **Standard Quality**: ≥5 Mbps down / ≥2 Mbps up → 720p @ 30fps (minimum requirement)
  - **Low Quality**: ≥2 Mbps down / ≥1 Mbps up → 480p @ 24fps
  - **Audio-Only Fallback**: <2 Mbps down → disable video, maintain audio
- **NFR-030**: In-call chat messages deliver within 500ms during active video sessions
- **NFR-031**: Session metadata queries (join validation, participant list) complete within 200ms
- **NFR-032**: Video session creation (CometChat group setup) completes within 3 seconds

### Scalability
- **NFR-005**: Platform architecture supports horizontal scaling to accommodate 100,000+ registered users
- **NFR-006**: Database design supports efficient queries as Gem transaction history grows to millions of records
- **NFR-007**: System handles peak booking loads (e.g., 500 bookings/minute during promotions)
- **NFR-033**: System supports up to 20 concurrent video sessions on Free tier (100 MAU limit), unlimited on Basic tier
- **NFR-034**: Database indexes support efficient session participant queries for up to 1000 concurrent video sessions
- **NFR-035**: CometChat API rate limits honored: 100 requests/minute for user sync, 500 requests/minute for session operations

### Reliability
- **NFR-008**: System maintains 99.9% uptime during business hours (6am-midnight local time)
- **NFR-009**: Booking transactions are atomic (either fully complete or fully rollback, no partial states)
- **NFR-010**: Automatic backup of critical data (user accounts, bookings, Gem balances) every 6 hours

### Usability
- **NFR-011**: New students can create account and book first class without help documentation (intuitive UI)
- **NFR-012**: UI works on all modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- **NFR-013**: Forms provide clear validation messages that guide users to correct errors
- **NFR-014**: Dashboard provides contextual help tooltips for Gem system features

### Smooth UI & Animations
- **NFR-018**: All UI transitions MUST run at 60fps with no visible jank or stuttering
- **NFR-019**: Page transitions use smooth fade/slide animations (200-300ms duration, ease-out curve)
- **NFR-020**: Interactive elements provide immediate visual feedback (<50ms response time)
- **NFR-021**: Loading states use smooth skeleton animations instead of spinners where appropriate
- **NFR-022**: Micro-interactions (button clicks, toggles, hovers, Gem counter updates) have subtle, satisfying animations
- **NFR-023**: Modal/drawer appearances use spring physics for natural feel
- **NFR-024**: Scroll behavior is smooth with momentum on touch devices
- **NFR-025**: Character sprite animations maintain consistent 60fps playback
- **NFR-026**: Users can disable animations via "Reduce Motion" accessibility preference

### Maintainability
- **NFR-015**: Gem earning rules can be updated by administrators without code deployment
- **NFR-016**: New user roles can be added without major system redesign
- **NFR-017**: System logs sufficient information for debugging issues reported by users

## User Experience Principles *(optional)*

To achieve the "stunning student UI" goal, the platform must embody these principles:

### Visual Design
- **Modern, clean aesthetic**: Minimalist design with ample white space, avoiding clutter
- **Vibrant color palette**: Energetic colors that appeal to language learners (dark blue theme with vibrant accents)
- **Consistent design language**: Unified visual style across all pages and components
- **Buttery smooth interactions**: All animations at 60fps, spring-physics transitions, satisfying micro-interactions (Cookie counters, XP gains, level-ups)

### Information Architecture
- **Student-centric navigation**: Most important features (Browse Classes, My Gems, My Bookings) easily accessible
- **Progressive disclosure**: Show essential information first, details available on demand
- **Clear visual hierarchy**: Typography and spacing guide users' attention to key actions
- **Contextual guidance**: Inline help and tooltips explain Gem system without overwhelming users

### Mobile Experience
- **Touch-optimized**: Large tap targets, swipe gestures where appropriate
- **Thumb-friendly**: Primary actions within easy reach on mobile screens
- **Fast loading**: Optimized images, lazy loading for better mobile performance
- **Offline-aware**: Graceful handling of connectivity issues with clear feedback

### Gamification UX
- **Celebrate achievements**: Visual feedback when earning Gems (animations, shimmer effects, gem shine particles)
- **Progress visibility**: Clear display of Gem balance, upcoming rewards, achievement milestones
- **Motivation cues**: Remind students how many more Gems needed for desired discounts
- **Social proof**: Show (anonymized) leaderboards or achievement badges to inspire engagement

### Accessibility
- **Inclusive design**: Works for users with various disabilities (screen readers, keyboard navigation)
- **Clear contrast**: Text readable for users with visual impairments
- **Flexible text sizing**: UI adapts to user's preferred text size settings
- **Descriptive labels**: Form fields and buttons clearly labeled for assistive technologies

## Glossary *(optional)*

**Gems**: Virtual currency units earned by students through platform engagement and activities. Can be spent for discounts on class bookings. Conversion rate: 1 Gem = $0.50 discount. Represented by precious gemstone icons (💎💠) with shimmer effects in the UI.

**Gem Transaction**: A recorded event of Gem movement, including earnings (credited) and spending (debited). Each transaction logs the amount, type, reason, timestamp, and related entity.

**Booking**: A confirmed reservation linking a student to a specific class. Includes details of payment, any Gem discount applied, and final amount charged.

**Class**: An English learning session with defined attributes: topic, teacher, scheduled date/time, capacity limit, and price.

**Role**: User permission level determining dashboard access and features. Three roles: Student (learning), Teacher (instruction), Administrator (management).

**Dashboard**: Personalized home screen showing role-specific information and actions. Students see classes and Gems; Teachers see schedules and rosters; Admins see analytics and controls.

**Activity Rule**: Configuration defining how students earn Gems. Specifies the qualifying activity type, Gem reward amount, and any conditions required.

**Capacity**: Maximum number of students who can enroll in a class. Set by teacher when creating the class.

**Refund Policy**: Rules governing when and how much money/Gems are returned when bookings are cancelled. Varies based on timing and who initiates cancellation.

**P95 Response Time**: Performance metric indicating that 95% of requests complete within the specified time threshold.

**WCAG 2.1 Level AA**: Web Content Accessibility Guidelines standard ensuring the platform is usable by people with disabilities.

**Attendance Streak**: Consecutive number of classes attended without gaps. Used to calculate bonus Gem rewards.

**Waitlist**: Queue of students interested in a full class, who will be notified if a spot becomes available.

**Career Path**: One of six predefined career archetypes (Doctor, Engineer, Warrior, Business Person, Artist, Scientist) that determines a student's 8-bit character appearance, color theme, and evolution animations.

**Experience Points (XP)**: Primary progression currency earned through class completion. 50 XP base per class, +25 bonus for 90%+ quiz scores. Every 500 XP = 1 level up.

**Gold Coins**: Secondary cosmetic currency earned through class performance (10-30 per class), daily login (5), and weekly streaks (50). Used to purchase items in the marketplace.

**Character Level**: Student's progression tier calculated as floor(totalXP / 500) + 1. Determines character visual evolution: Levels 1-5 (basic), 6-10 (upgraded), 11-20 (professional), 21+ (master).

**Marketplace**: In-platform store where students spend Gold to purchase cosmetic items (hats, outfits, backgrounds, emotes, pets) for their 8-bit character.

**8-bit Character**: Retro pixel art avatar representing the student's chosen career path. Evolves visually as the student levels up and can be customized with marketplace items.

**CometChat**: Third-party real-time communication platform providing video/voice calling and chat functionality for live classes. Integrated via JavaScript SDK and React UI Kit.

**Class Session**: A live video instance of a scheduled class. Tracked by session ID, status (scheduled/live/ended), and participant attendance for reward calculation.

**Video Room**: The virtual classroom interface where teachers and students interact via video call. Includes video feeds, screen sharing, and in-call chat.

**WebRTC**: Web Real-Time Communication technology underlying CometChat's video calling, enabling peer-to-peer audio/video streams in the browser.

## Future Enhancements *(optional)*

Ideas for potential features beyond the current scope (not planned for initial release):

### Advanced Gamification
- **Achievement badges**: Visual badges for milestones (e.g., "10 Classes Completed", "Gem Collector")
- **Student levels**: Progression system where students level up based on activity, unlocking perks
- **Leaderboards**: Public or class-specific rankings showing top Gem earners or most active learners
- **Challenges**: Time-limited special activities offering bonus Gem rewards

### Social Features
- **Student profiles**: Public profiles showing achievements, level, and optionally Gem earnings
- **Peer reviews**: Students can rate and review classes, visible to other students
- **Study groups**: Students form groups to book classes together or share learning resources
- **Direct messaging**: Secure messaging between students and teachers for questions

### Advanced Booking
- **Subscription packages**: Students buy bundles of classes at discounted rates
- **Recurring bookings**: Automatically book the same weekly class for multiple weeks
- **Waitlist auto-booking**: Automatically book if a spot opens in a full class
- **Class recommendations**: Suggest classes based on student's learning history and goals

### Enhanced Learning Tools
- **Progress tracking**: Detailed analytics showing student's learning progress over time
- **Lesson notes**: Students can take and store notes during/after classes
- **Recording access**: Students can review recordings of classes they attended (if teachers opt-in)
- **Homework assignments**: Teachers assign and grade homework, students earn Gems for completion

### Platform Expansion
- **Mobile native apps**: iOS and Android apps with push notifications and offline features
- **Multi-language support**: Platform available in multiple languages for global reach
- **Video integration**: Built-in video conferencing instead of third-party tool integration
- **Content marketplace**: Teachers can sell pre-recorded courses or learning materials

### Analytics and AI
- **Predictive analytics**: Identify students at risk of dropping out, suggest interventions
- **Personalized learning paths**: AI recommends classes based on goals and learning patterns
- **Chatbot support**: Automated assistant for common student questions
- **Smart scheduling**: Suggest optimal class times based on student's booking history

### Gem System Enhancements
- **Gem tiers**: Different Gem types (Ruby, Sapphire, Emerald, Diamond) with varying benefits
- **Gem gifting**: Students can send Gems to friends as gifts or rewards
- **Gem marketplace**: Students trade Gems for merchandise or other rewards
- **Time-limited Gem bonuses**: Special promotions offering double Gems for certain activities ("Gem Rush" events)

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-22  
**Updated By**: AI Specification Agent  
**Change Summary**: Enhanced with comprehensive sections including Assumptions, Constraints, Dependencies, Security considerations, Non-functional requirements, UX principles, expanded Edge Cases, Glossary, and Future Enhancements
