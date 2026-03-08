# API Documentation Overview

**Version**: 1.0
**Last Updated**: 2026-02-03
**Base URL**: `https://your-project.supabase.co/functions/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Edge Functions List](#edge-functions-list)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Error Response Format](#error-response-format)
6. [Common Headers](#common-headers)
7. [Quick Start](#quick-start)

---

## Overview

The English Learning Platform uses Supabase Edge Functions for serverless API endpoints. All functions are deployed to Deno Deploy and are automatically scaled.

### Architecture

- **Runtime**: Deno
- **Framework**: Supabase Edge Functions
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT)

---

## Edge Functions List

### Gem System Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `award-lesson-gems` | POST | Award gems for lesson completion | Yes |
| `award-profile-gems` | POST | Award gems for profile completion | Yes |
| `award-review-gems` | POST | Award gems for writing reviews | Yes |
| `award-gems` | POST | General gem awarding function | Admin |
| `expire-gems` | POST | Process gem expirations | Cron |
| `notify-gem-expiration` | POST | Notify users of expiring gems | Cron |
| `refund-gems` | POST | Refund gems on cancellation | System |

### Streak & Referral Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `calculate-streak` | POST | Update attendance streaks | Yes |
| `daily-streak-check` | POST | Daily streak validation | Cron |
| `generate-referral-code` | POST | Create referral code | Student |
| `process-referral` | POST | Process referral rewards | System |

### Analytics Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `get-user-analytics` | GET | User growth statistics | Admin |
| `get-booking-analytics` | GET | Booking trends data | Admin |
| `get-gem-analytics` | GET | Gem circulation metrics | Admin |
| `get-revenue-analytics` | GET | Revenue reports | Admin |

### Audit & Fraud Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `reconcile-gem-balances` | POST | Reconcile gem discrepancies | Admin |
| `detect-discrepancies` | POST | Find transaction errors | Admin |
| `detect-referral-fraud` | POST | Detect fraudulent referrals | System |
| `flag-suspicious-activity` | POST | Flag suspicious patterns | System |
| `recover-failed-transaction` | POST | Retry failed transactions | Admin |

### Video Integration Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `cometchat-user-sync` | POST | Sync user to CometChat | System |
| `cometchat-webhook` | POST | Handle CometChat events | Webhook |
| `award-class-rewards` | POST | Award gems for class attendance | System |
| `validate-class` | POST | Validate class session | Teacher |

### Notification Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `send-email` | POST | Send email notification | System |
| `send-booking-confirmation` | POST | Send booking confirmation | System |
| `send-gem-notification` | POST | Send gem earned notification | System |
| `send-class-reminder` | POST | Send class reminder | Cron |
| `create-notification` | POST | Create in-app notification | System |
| `send-push-reminder` | POST | Send push notification | Cron |

### Payment & Revenue Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `calculate-teacher-earnings` | POST | Calculate teacher payouts | System |
| `process-payout` | POST | Process teacher payout | Admin |
| `process-cancellation` | POST | Handle booking cancellation | Student/Teacher |
| `teacher-cancel-class` | POST | Teacher-initiated cancellation | Teacher |

### Quiz Functions

| Function | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `grade-quiz` | POST | Grade quiz attempt | System |

---

## Authentication

### JWT Bearer Token

All authenticated endpoints require a JWT token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Obtaining a Token

Use Supabase Auth to sign in and receive a JWT:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session?.access_token;
```

### Service Role Key

Some functions require service role access (admin/system functions):

```bash
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
apikey: YOUR_SERVICE_ROLE_KEY
```

### Anonymous Access

Public endpoints (none currently) can be accessed with the anon key:

```bash
apikey: YOUR_ANON_KEY
```

---

## Rate Limiting

### Default Limits

- **Authenticated Users**: 100 requests/minute
- **Anonymous Users**: 10 requests/minute
- **Webhooks**: Unlimited (validated by signature)
- **Cron Jobs**: Unlimited (internal only)

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1675434000
```

### Exceeded Rate Limit

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

**Status Code**: `429 Too Many Requests`

---

## Error Response Format

### Standard Error Response

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

```typescript
// Authentication Errors
"UNAUTHORIZED"          // Missing authentication
"FORBIDDEN"             // Insufficient permissions
"INVALID_TOKEN"         // Token expired or malformed

// Validation Errors
"INVALID_INPUT"         // Invalid request parameters
"MISSING_FIELD"         // Required field missing
"INVALID_FORMAT"        // Data format incorrect

// Business Logic Errors
"INSUFFICIENT_GEMS"     // Not enough gems
"RATE_LIMIT_EXCEEDED"   // Activity rate limit hit
"DUPLICATE_ENTRY"       // Resource already exists
"CAPACITY_FULL"         // Class is full
"BOOKING_CONFLICT"      // Time slot conflict

// System Errors
"DATABASE_ERROR"        // Database operation failed
"EXTERNAL_SERVICE_ERROR" // Third-party service failed
"INTERNAL_ERROR"        // Unexpected error
```

---

## Common Headers

### Request Headers

```bash
# Required for all authenticated requests
Authorization: Bearer YOUR_JWT_TOKEN

# Required for all requests
Content-Type: application/json

# Recommended for idempotency
Idempotency-Key: unique-request-id

# Client identification (optional)
X-Client-Version: 1.0.0
X-Client-Platform: web
```

### Response Headers

```bash
# CORS headers
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type

# Content type
Content-Type: application/json

# Rate limiting
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1675434000

# Request ID (for support)
X-Request-ID: req_abc123xyz
```

---

## Quick Start

### Example: Award Lesson Gems

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/award-lesson-gems \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "uuid-here",
    "quiz_score": 85,
    "attendance_verified": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Awarded 50 gems for lesson_completion",
  "gems_awarded": 50,
  "transaction_id": "tx_uuid"
}
```

### Example: Get User Analytics

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-user-analytics?start_date=2026-01-01&end_date=2026-02-03&role=all&interval=day" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_growth": [
      {
        "date": "2026-02-03",
        "role": "student",
        "new_users": 15,
        "cumulative_users": 250
      }
    ],
    "current_counts": {
      "student": 250,
      "teacher": 30,
      "admin": 5,
      "total": 285
    },
    "growth_rates": {
      "student": 12.5,
      "teacher": 5.3
    },
    "period": {
      "start": "2026-01-01",
      "end": "2026-02-03",
      "days": 33
    }
  }
}
```

---

## Testing

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Serve a function locally
npx supabase functions serve award-lesson-gems --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/award-lesson-gems \
  -H "Authorization: Bearer YOUR_LOCAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "test-uuid"}'
```

### Deployment

```bash
# Deploy all functions
npx supabase functions deploy

# Deploy specific function
npx supabase functions deploy award-lesson-gems

# Set environment variables
npx supabase secrets set SENDGRID_API_KEY=your-key
```

---

## Monitoring

### Logs

View function logs in real-time:

```bash
npx supabase functions logs award-lesson-gems --tail
```

Or in Supabase Dashboard:
- Navigate to **Functions** > Select function > **Logs**

### Metrics

Available in Supabase Dashboard:
- **Invocations**: Total function calls
- **Errors**: Failed invocations
- **Duration**: Average execution time
- **Success Rate**: Percentage of successful calls

---

## Best Practices

1. **Idempotency**: Use `Idempotency-Key` header for critical operations
2. **Error Handling**: Always handle errors gracefully
3. **Retries**: Implement exponential backoff for failed requests
4. **Timeouts**: Set reasonable timeout values (default: 60s)
5. **Logging**: Include request IDs for troubleshooting
6. **Security**: Never expose service role keys in client code

---

## Support

- **Documentation**: See [edge-functions.md](./edge-functions.md) for detailed function docs
- **Issues**: Report bugs in GitHub repository
- **Questions**: Contact development team

---

**Next**: See [edge-functions.md](./edge-functions.md) for detailed documentation of each Edge Function.
