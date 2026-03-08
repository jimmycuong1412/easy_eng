# Edge Functions Detailed Documentation

**Version**: 1.0
**Last Updated**: 2026-02-03

This document provides detailed specifications for all Supabase Edge Functions in the English Learning Platform.

---

## Table of Contents

- [Gem System](#gem-system)
- [Streak & Referral](#streak--referral)
- [Analytics](#analytics)
- [Audit & Fraud Detection](#audit--fraud-detection)
- [Video Integration](#video-integration)
- [Notifications](#notifications)
- [Payment & Revenue](#payment--revenue)
- [Quiz System](#quiz-system)

---

## Gem System

### award-lesson-gems

Awards gems to students upon lesson completion.

**Endpoint**: `POST /award-lesson-gems`

**Authentication**: Required (Student/System)

**Request Body**:
```typescript
{
  booking_id: string;          // Required: Booking UUID
  quiz_score?: number;         // Optional: Quiz score (0-100)
  attendance_verified?: boolean; // Default: true
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  gems_awarded: number;
  transaction_id: string | null;
}
```

**Example**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/award-lesson-gems \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "quiz_score": 85,
    "attendance_verified": true
  }'
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Awarded 50 gems for lesson_completion",
  "gems_awarded": 50,
  "transaction_id": "tx_123abc"
}
```

**Error Responses**:
- `400`: Invalid booking_id or quiz_score
- `409`: Lesson already marked as completed
- `429`: Rate limit exceeded

---

### award-profile-gems

Awards gems for completing profile milestones.

**Endpoint**: `POST /award-profile-gems`

**Authentication**: Required (Student)

**Request Body**:
```typescript
{
  user_id: string;
  milestone: 'avatar_upload' | 'bio_complete' | 'profile_verified';
}
```

**Response**:
```typescript
{
  success: boolean;
  gems_awarded: number;
  milestone: string;
}
```

**Example**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/award-profile-gems \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "milestone": "avatar_upload"
  }'
```

**Gem Amounts**:
- `avatar_upload`: 10 gems (one-time)
- `bio_complete`: 15 gems (one-time)
- `profile_verified`: 25 gems (one-time)

---

### award-review-gems

Awards gems for writing class reviews.

**Endpoint**: `POST /award-review-gems`

**Authentication**: Required (Student)

**Request Body**:
```typescript
{
  review_id: string;
  booking_id: string;
  rating: number;        // 1-5
  has_comment: boolean;
}
```

**Response**:
```typescript
{
  success: boolean;
  gems_awarded: number;
  transaction_id: string;
}
```

**Gem Calculation**:
- Base: 20 gems
- With detailed comment (>50 chars): +10 gems
- 5-star rating: +5 gems
- Total possible: 35 gems per review

**Rate Limit**: 1 review per booking, max 5 reviews per day

---

### award-gems

General purpose gem awarding function (admin only).

**Endpoint**: `POST /award-gems`

**Authentication**: Required (Admin)

**Request Body**:
```typescript
{
  user_id: string;
  amount: number;           // Positive integer
  reason: string;           // Description
  transaction_type: string; // e.g., 'admin_bonus'
  reference_id?: string;    // Optional reference
}
```

**Example**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/award-gems \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "amount": 100,
    "reason": "Community contribution bonus",
    "transaction_type": "admin_bonus"
  }'
```

**Constraints**:
- Amount must be between 1 and 10,000
- User's total balance cannot exceed 1,000 gems (cap)

---

### expire-gems

Process gem expirations (scheduled function).

**Endpoint**: `POST /expire-gems`

**Authentication**: System/Cron only

**Trigger**: Daily at 00:00 UTC

**Functionality**:
- Finds gems older than 90 days
- Marks them as expired
- Deducts from user balance
- Creates expiration transaction record

**Response**:
```typescript
{
  success: boolean;
  gems_expired: number;
  users_affected: number;
}
```

---

### notify-gem-expiration

Notifies users of soon-to-expire gems.

**Endpoint**: `POST /notify-gem-expiration`

**Authentication**: System/Cron only

**Trigger**: Daily at 09:00 UTC

**Functionality**:
- Finds gems expiring in 7 days
- Sends email notification
- Creates in-app notification

**Request Body**:
```typescript
{
  days_before_expiry?: number; // Default: 7
}
```

---

### refund-gems

Refunds gems when a booking is cancelled.

**Endpoint**: `POST /refund-gems`

**Authentication**: System only

**Request Body**:
```typescript
{
  booking_id: string;
  reason: string;
}
```

**Functionality**:
- Returns gems used in booking
- Creates refund transaction
- Updates booking status

---

## Streak & Referral

### calculate-streak

Calculates and updates student attendance streaks.

**Endpoint**: `POST /calculate-streak`

**Authentication**: Required (Student/System)

**Request Body**:
```typescript
{
  student_id: string;
  attendance_date?: string; // ISO date, default: today
}
```

**Response**:
```typescript
{
  success: boolean;
  current_streak: number;
  previous_streak: number;
  is_new_record: boolean;
  streak_bonus_awarded: boolean;
  gems_awarded: number;
}
```

**Example**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/calculate-streak \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "student-uuid",
    "attendance_date": "2026-02-03"
  }'
```

**Streak Bonuses**:
- 7-day streak: 50 gems
- 14-day streak: 100 gems
- 30-day streak: 250 gems
- 60-day streak: 500 gems
- 90-day streak: 1,000 gems

---

### daily-streak-check

Checks all users' streaks and resets broken streaks.

**Endpoint**: `POST /daily-streak-check`

**Authentication**: System/Cron only

**Trigger**: Daily at 01:00 UTC

**Functionality**:
- Identifies users with broken streaks
- Resets current streak to 0
- Preserves longest streak record
- Sends notification if streak was >7 days

---

### generate-referral-code

Generates a unique referral code for a student.

**Endpoint**: `POST /generate-referral-code`

**Authentication**: Required (Student)

**Request Body**:
```typescript
{
  student_id: string;
  preferred_code?: string; // Optional custom code
}
```

**Response**:
```typescript
{
  success: boolean;
  referral_code: string;
  referral_url: string;
}
```

**Example**:
```json
{
  "success": true,
  "referral_code": "JOHN2026",
  "referral_url": "https://easyeng.com/signup?ref=JOHN2026"
}
```

**Code Rules**:
- 6-12 alphanumeric characters
- Must be unique
- Case-insensitive

---

### process-referral

Processes a referral when a new user signs up.

**Endpoint**: `POST /process-referral`

**Authentication**: System only

**Request Body**:
```typescript
{
  referral_code: string;
  new_user_id: string;
}
```

**Functionality**:
- Validates referral code
- Awards 100 gems to referrer
- Awards 50 gems to new user
- Creates referral record

**Fraud Detection**:
- Same IP address check
- Same device fingerprint
- Account age verification
- Activity pattern analysis

---

## Analytics

### get-user-analytics

Retrieves user growth and registration analytics.

**Endpoint**: `GET /get-user-analytics`

**Authentication**: Required (Admin)

**Query Parameters**:
```typescript
{
  start_date?: string;  // ISO date, default: 30 days ago
  end_date?: string;    // ISO date, default: today
  role?: 'student' | 'teacher' | 'admin' | 'all'; // default: 'all'
  interval?: 'day' | 'week' | 'month'; // default: 'day'
}
```

**Example**:
```bash
curl "https://your-project.supabase.co/functions/v1/get-user-analytics?start_date=2026-01-01&end_date=2026-02-03&role=all&interval=day" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    user_growth: Array<{
      date: string;
      role: string;
      new_users: number;
      cumulative_users: number;
    }>;
    current_counts: {
      student: number;
      teacher: number;
      admin: number;
      total: number;
    };
    growth_rates: {
      [role: string]: number; // Percentage growth vs previous period
    };
    period: {
      start: string;
      end: string;
      days: number;
    };
  };
}
```

---

### get-booking-analytics

Retrieves booking trends and statistics.

**Endpoint**: `GET /get-booking-analytics`

**Authentication**: Required (Admin)

**Query Parameters**:
```typescript
{
  start_date?: string;
  end_date?: string;
  status?: 'confirmed' | 'cancelled' | 'completed' | 'all';
  interval?: 'day' | 'week' | 'month';
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    booking_trends: Array<{
      date: string;
      new_bookings: number;
      completed_bookings: number;
      cancelled_bookings: number;
      total_revenue: number;
    }>;
    summary: {
      total_bookings: number;
      completion_rate: number;
      cancellation_rate: number;
      average_class_size: number;
    };
  };
}
```

---

### get-gem-analytics

Retrieves gem circulation and usage metrics.

**Endpoint**: `GET /get-gem-analytics`

**Authentication**: Required (Admin)

**Query Parameters**:
```typescript
{
  start_date?: string;
  end_date?: string;
  transaction_type?: string; // Filter by type
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    circulation: {
      total_gems_issued: number;
      total_gems_spent: number;
      total_gems_expired: number;
      net_circulation: number;
    };
    by_type: Array<{
      transaction_type: string;
      count: number;
      total_gems: number;
    }>;
    top_earners: Array<{
      user_id: string;
      total_earned: number;
    }>;
    top_spenders: Array<{
      user_id: string;
      total_spent: number;
    }>;
  };
}
```

---

### get-revenue-analytics

Retrieves revenue and financial metrics.

**Endpoint**: `GET /get-revenue-analytics`

**Authentication**: Required (Admin)

**Query Parameters**:
```typescript
{
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  interval?: 'day' | 'week' | 'month';
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    revenue_trends: Array<{
      date: string;
      gross_revenue: number;
      gem_discounts: number;
      net_revenue: number;
      transaction_count: number;
    }>;
    by_payment_method: Array<{
      method: string;
      total_revenue: number;
      transaction_count: number;
    }>;
    summary: {
      total_revenue: number;
      average_transaction: number;
      discount_rate: number;
    };
  };
}
```

---

## Audit & Fraud Detection

### reconcile-gem-balances

Reconciles gem balances to ensure integrity.

**Endpoint**: `POST /reconcile-gem-balances`

**Authentication**: Required (Admin)

**Request Body**:
```typescript
{
  user_id?: string; // Optional: reconcile specific user
  fix_discrepancies?: boolean; // Default: false (dry-run)
}
```

**Response**:
```typescript
{
  success: boolean;
  users_checked: number;
  discrepancies_found: number;
  discrepancies_fixed: number;
  details: Array<{
    user_id: string;
    expected_balance: number;
    actual_balance: number;
    difference: number;
    fixed: boolean;
  }>;
}
```

---

### detect-discrepancies

Detects transaction anomalies and inconsistencies.

**Endpoint**: `POST /detect-discrepancies`

**Authentication**: Required (Admin)

**Response**:
```typescript
{
  success: boolean;
  issues_found: Array<{
    type: 'negative_balance' | 'missing_transaction' | 'duplicate_transaction';
    severity: 'critical' | 'high' | 'medium' | 'low';
    user_id: string;
    description: string;
    recommended_action: string;
  }>;
}
```

---

### detect-referral-fraud

Detects fraudulent referral activity.

**Endpoint**: `POST /detect-referral-fraud`

**Authentication**: System/Admin

**Functionality**:
- Analyzes referral patterns
- Detects same-IP referrals
- Identifies suspicious timing
- Flags mass-referral accounts

**Response**:
```typescript
{
  success: boolean;
  suspicious_referrals: Array<{
    referrer_id: string;
    referred_id: string;
    fraud_indicators: string[];
    confidence_score: number; // 0-100
  }>;
}
```

---

### flag-suspicious-activity

Flags suspicious user activity patterns.

**Endpoint**: `POST /flag-suspicious-activity`

**Authentication**: System only

**Triggers**:
- Rapid gem accumulation
- Unusual booking patterns
- Multiple failed payment attempts
- Device/IP mismatches

---

### recover-failed-transaction

Attempts to recover failed gem transactions.

**Endpoint**: `POST /recover-failed-transaction`

**Authentication**: Required (Admin)

**Request Body**:
```typescript
{
  transaction_id: string;
  retry_strategy: 'immediate' | 'scheduled';
}
```

---

## Video Integration

### cometchat-user-sync

Syncs a user to CometChat for video functionality.

**Endpoint**: `POST /cometchat-user-sync`

**Authentication**: System only (triggered by database)

**Request Body**:
```typescript
{
  user_id: string;
  name: string;
  avatar?: string;
  role: 'student' | 'teacher';
}
```

**Functionality**:
- Creates CometChat user
- Syncs profile data
- Sets user metadata

---

### cometchat-webhook

Handles CometChat event webhooks.

**Endpoint**: `POST /cometchat-webhook`

**Authentication**: Webhook signature verification

**Events Handled**:
- `call.started`: Log call start
- `call.ended`: Log call end, award participation gems
- `user.joined`: Track participant join
- `user.left`: Track participant leave

---

### award-class-rewards

Awards gems for class attendance and participation.

**Endpoint**: `POST /award-class-rewards`

**Authentication**: System only

**Request Body**:
```typescript
{
  session_id: string;
  user_id: string;
  participation_score: number; // 0-100
}
```

**Gem Calculation**:
- Base attendance: 30 gems
- High participation (>80%): +20 gems
- Early arrival bonus: +5 gems

---

### validate-class

Validates a class session can start.

**Endpoint**: `POST /validate-class`

**Authentication**: Required (Teacher)

**Request Body**:
```typescript
{
  class_id: string;
}
```

**Validation Checks**:
- Class time is within 15 minutes
- Teacher is assigned
- At least 1 student enrolled
- No conflicting sessions

---

## Notifications

### send-email

Sends email notifications.

**Endpoint**: `POST /send-email`

**Authentication**: System only

**Request Body**:
```typescript
{
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}
```

**Templates**:
- `booking_confirmation`
- `class_reminder`
- `gem_expiration_warning`
- `payout_processed`
- `password_reset`

---

### send-booking-confirmation

Sends booking confirmation email and notification.

**Endpoint**: `POST /send-booking-confirmation`

**Authentication**: System only

**Request Body**:
```typescript
{
  booking_id: string;
}
```

---

### send-gem-notification

Notifies user of gems earned.

**Endpoint**: `POST /send-gem-notification`

**Authentication**: System only

**Request Body**:
```typescript
{
  user_id: string;
  gems_awarded: number;
  reason: string;
}
```

---

### send-class-reminder

Sends class reminder notifications.

**Endpoint**: `POST /send-class-reminder`

**Authentication**: System/Cron only

**Trigger**: 24h and 1h before class

**Request Body**:
```typescript
{
  hours_before?: number; // Default: 24
}
```

---

### create-notification

Creates in-app notification.

**Endpoint**: `POST /create-notification`

**Authentication**: System only

**Request Body**:
```typescript
{
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
}
```

---

### send-push-reminder

Sends push notifications for reminders.

**Endpoint**: `POST /send-push-reminder`

**Authentication**: System/Cron only

---

## Payment & Revenue

### calculate-teacher-earnings

Calculates teacher earnings for a period.

**Endpoint**: `POST /calculate-teacher-earnings`

**Authentication**: System only

**Request Body**:
```typescript
{
  teacher_id: string;
  start_date: string;
  end_date: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  earnings: {
    total_classes: number;
    total_students: number;
    gross_revenue: number;
    platform_fee: number;
    net_earnings: number;
  };
}
```

**Calculation**:
- Teacher receives 70% of class revenue
- Platform takes 30% fee
- Excludes cancelled classes

---

### process-payout

Processes teacher payout request.

**Endpoint**: `POST /process-payout`

**Authentication**: Required (Admin)

**Request Body**:
```typescript
{
  payout_request_id: string;
  payment_method: string;
  notes?: string;
}
```

---

### process-cancellation

Handles booking cancellation.

**Endpoint**: `POST /process-cancellation`

**Authentication**: Required (Student/Teacher)

**Request Body**:
```typescript
{
  booking_id: string;
  reason: string;
  cancelled_by: 'student' | 'teacher';
}
```

**Functionality**:
- Calculates refund based on cancellation policy
- Refunds gems
- Processes payment refund if applicable
- Sends notifications

---

### teacher-cancel-class

Teacher-initiated class cancellation.

**Endpoint**: `POST /teacher-cancel-class`

**Authentication**: Required (Teacher)

**Request Body**:
```typescript
{
  class_id: string;
  reason: string;
  notify_students: boolean;
}
```

**Functionality**:
- Cancels all bookings
- Full refund to all students
- Notifies all enrolled students
- Applies penalty to teacher if within 24h

---

## Quiz System

### grade-quiz

Grades a quiz attempt and awards gems.

**Endpoint**: `POST /grade-quiz`

**Authentication**: System only

**Request Body**:
```typescript
{
  attempt_id: string;
  answers: Record<string, any>;
}
```

**Response**:
```typescript
{
  success: boolean;
  score: number;
  passed: boolean;
  gems_awarded: number;
  correct_answers: number;
  total_questions: number;
}
```

**Gem Rewards**:
- 60-69%: 10 gems
- 70-79%: 20 gems
- 80-89%: 30 gems
- 90-100%: 50 gems
- Perfect score: 75 gems

---

## Error Codes Reference

### Authentication Errors
- `AUTH_001`: Missing authentication token
- `AUTH_002`: Invalid or expired token
- `AUTH_003`: Insufficient permissions

### Validation Errors
- `VAL_001`: Missing required field
- `VAL_002`: Invalid field format
- `VAL_003`: Value out of range

### Business Logic Errors
- `BIZ_001`: Insufficient gems
- `BIZ_002`: Rate limit exceeded
- `BIZ_003`: Duplicate entry
- `BIZ_004`: Resource not found
- `BIZ_005`: Capacity full

### System Errors
- `SYS_001`: Database error
- `SYS_002`: External service error
- `SYS_003`: Internal server error

---

**Last Updated**: 2026-02-03
**Maintainer**: Development Team
