# Administrator User Guide - Easy Eng Learning Platform

## Welcome, Administrator!

This comprehensive guide covers all administrative functions for managing the Easy Eng Learning Platform.

---

## Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [User Management](#user-management)
3. [Gem System Management](#gem-system-management)
4. [Class and Booking Management](#class-and-booking-management)
5. [Analytics and Reporting](#analytics-and-reporting)
6. [Payment and Revenue Management](#payment-and-revenue-management)
7. [Data Reconciliation](#data-reconciliation)
8. [System Monitoring](#system-monitoring)
9. [Security and Access Control](#security-and-access-control)
10. [Platform Configuration](#platform-configuration)
11. [Troubleshooting](#troubleshooting)

---

## Admin Dashboard Overview

Access your admin dashboard at `/admin/dashboard`

### Key Metrics

- **Total Users**: Active students, teachers, and parents
- **Total Classes**: All classes (scheduled, live, completed)
- **Total Bookings**: All time booking count
- **Platform Revenue**: Total revenue and growth trends
- **Gem Circulation**: Total Gems earned, spent, and expired
- **Active Sessions**: Currently live classes

### Quick Actions

- **Create User**: Manually add new users
- **View Users**: Access user management
- **Gem Adjustments**: Award or deduct Gems
- **Platform Alerts**: View system notifications
- **Reports**: Generate analytics reports

---

## User Management

### Viewing All Users

Navigate to `/admin/users` to see:

- **User List**: All registered users with filters
- **User Details**: Full profiles and activity history
- **Search**: Find users by name, email, or ID
- **Filters**: Filter by role, status, registration date

### User Roles

1. **Student**: Can book classes, earn Gems, take quizzes
2. **Teacher**: Can create classes, teach, earn revenue
3. **Parent**: Can monitor child's progress (future feature)
4. **Admin**: Full platform access

### Managing Individual Users

#### View User Profile
1. Click on user from user list
2. View complete profile information:
   - Personal details
   - Booking history
   - Gem transactions
   - Activity log
   - Payment history

#### Edit User Information
1. Click "Edit" on user profile
2. Modify allowed fields:
   - Name
   - Email (with verification)
   - Role assignment
   - Status (active/suspended)
3. Save changes

#### Suspend or Delete User
1. Navigate to user profile
2. Click "Manage User" dropdown
3. Select "Suspend" or "Delete"
4. Provide reason for action
5. Confirm action

**Warning**: Deleting users is irreversible. Prefer suspension for temporary issues.

### Bulk User Operations

- **Export Users**: Download CSV of all users
- **Import Users**: Bulk upload via CSV template
- **Bulk Email**: Send announcements to user segments

---

## Gem System Management

### Gem Rules Configuration

Navigate to `/admin/gems-rules` to manage:

#### Earning Rules
- **Lesson Completion**: 10 Gems per completed class
- **Attendance Streak**: 50 Gems for 7-day streak
- **Referral Bonus**: 100 Gems per successful referral
- **Profile Completion**: 20 Gems for complete profile
- **First Review**: 15 Gems for first class review
- **Quiz Performance**: 10-30 Gems based on score

#### Spending Rules
- **Gem to Dollar Conversion**: 1 Gem = $0.50 USD
- **Maximum Discount**: 50% of class price
- **Minimum Price Floor**: $5.00 (cannot go below)
- **Gem Balance Cap**: 1,000 Gems maximum
- **Expiration Period**: 365 days from earning date

### Adjusting Gem Rules

1. Navigate to `/admin/gems-rules`
2. Click "Edit" on rule to modify
3. Update values:
   - Gem amounts
   - Conversion rates
   - Caps and limits
   - Expiration periods
4. Click "Save Changes"
5. Changes take effect immediately

**Note**: All rule changes are logged in audit trail

### Manual Gem Adjustments

#### Award Gems to User
1. Go to user profile
2. Click "Adjust Gems"
3. Select "Award Gems"
4. Enter amount and reason
5. Confirm adjustment

Reasons for awarding Gems:
- Compensation for platform issues
- Promotional bonuses
- Community contributions
- Special achievements

#### Deduct Gems from User
1. Go to user profile
2. Click "Adjust Gems"
3. Select "Deduct Gems"
4. Enter amount and reason
5. Confirm deduction

Reasons for deducting Gems:
- Fraudulent activity
- Policy violations
- Correction of errors
- Abuse prevention

### Gem Analytics

View Gem metrics at `/admin/analytics`:
- **Total Gems Earned**: All-time Gem earnings
- **Total Gems Spent**: Gems redeemed on discounts
- **Total Gems Expired**: Gems that expired
- **Active Gem Balance**: Current total Gems held by users
- **Gem Velocity**: Rate of Gem earning and spending
- **Fraud Flags**: Suspicious Gem activity

---

## Class and Booking Management

### Managing Classes

Navigate to `/admin/classes` to:

#### View All Classes
- See all classes across all teachers
- Filter by status, teacher, level, date
- Search by class name or description

#### Moderate Class Content
1. Review class details for compliance
2. Check if content meets platform standards
3. Approve or flag for removal
4. Contact teacher if issues found

#### Cancel Classes
1. Select class to cancel
2. Click "Cancel Class"
3. Provide cancellation reason
4. Confirm cancellation
5. System automatically:
   - Refunds all students
   - Notifies teacher
   - Logs the cancellation

### Managing Bookings

Navigate to `/admin/bookings` to:

#### View All Bookings
- Complete list of all bookings
- Filter by status, date, student, teacher
- Export booking data

#### Booking Status
- **Confirmed**: Payment successful, booking active
- **Pending**: Awaiting payment confirmation
- **Cancelled**: Cancelled by student or admin
- **Completed**: Class finished
- **No-Show**: Student didn't attend

#### Refund Bookings
1. Find booking in booking list
2. Click "Actions" > "Process Refund"
3. Select refund type:
   - Full refund (100%)
   - Partial refund (specify percentage)
   - Gem refund only
   - Payment refund only
4. Enter reason
5. Confirm refund

---

## Analytics and Reporting

### Platform Analytics Dashboard

Access at `/admin/analytics`

#### User Analytics
- **User Growth**: New registrations over time
- **Active Users**: Daily/monthly active users
- **User Retention**: Retention cohorts
- **User Segments**: Distribution by role and activity
- **Churn Rate**: User attrition metrics

#### Booking Analytics
- **Total Bookings**: All-time and period-specific
- **Booking Trends**: Booking patterns over time
- **Popular Classes**: Most booked classes
- **Peak Times**: When most bookings occur
- **Cancellation Rate**: Booking cancellation percentage

#### Revenue Analytics
- **Total Revenue**: Gross platform revenue
- **Platform Share**: 30% platform fee collected
- **Teacher Payouts**: 70% paid to teachers
- **Revenue by Class**: Revenue breakdown per class
- **Growth Rate**: Revenue growth trends

#### Gem Analytics
- **Gem Circulation**: Total Gems in system
- **Earning Sources**: Where Gems come from
- **Spending Patterns**: How Gems are used
- **Expiration Rates**: Gem expiration analytics

### Generating Reports

1. Navigate to `/admin/analytics`
2. Select report type
3. Choose date range
4. Apply filters
5. Click "Generate Report"
6. Download as CSV or PDF

### Automated Reports

Schedule recurring reports:
- **Daily**: User signups, bookings, revenue
- **Weekly**: Platform performance summary
- **Monthly**: Comprehensive analytics
- **Quarterly**: Executive summary

---

## Payment and Revenue Management

### Revenue Dashboard

View at `/admin/revenue`:
- **Gross Revenue**: Total payments received
- **Net Revenue**: After refunds and adjustments
- **Platform Revenue**: 30% platform share
- **Teacher Revenue**: 70% teacher earnings
- **Payment Gateway Fees**: Transaction costs

### Payment Gateway Management

#### Configured Gateways
- **Stripe**: International cards
- **VNPay**: Vietnam local cards
- **MoMo**: Mobile wallet (Vietnam)
- **ZaloPay**: Mobile wallet (Vietnam)

#### Managing Gateways
1. Navigate to `/admin/settings/payments`
2. View gateway configuration
3. Enable/disable gateways
4. Update API credentials (securely)
5. Configure webhook endpoints

### Teacher Payout Management

View pending payouts at `/admin/payouts`:

#### Payout Queue
- **Pending Payouts**: Awaiting processing
- **In Progress**: Currently processing
- **Completed**: Successfully paid
- **Failed**: Failed transactions

#### Processing Payouts
1. Review payout request
2. Verify teacher payment information
3. Confirm payout amount (70% of class price)
4. Approve or reject request
5. Process through payment system
6. Mark as complete

#### Payout Issues
- **Failed Transfers**: Retry or contact teacher
- **Invalid Bank Info**: Request updated information
- **Disputed Amounts**: Review class and booking details

---

## Data Reconciliation

### Gem Balance Reconciliation

Navigate to `/admin/reconciliation` for:

#### Automated Reconciliation
- **Daily Checks**: Automated balance verification
- **Discrepancy Detection**: Identifies mismatches
- **Audit Trail**: Complete transaction history

#### Running Manual Reconciliation
1. Click "Run Reconciliation"
2. Select reconciliation type:
   - Gem balances
   - Payment transactions
   - Booking counts
3. Review results
4. Address any discrepancies found

### Reconciliation Report

Report shows:
- **Total Discrepancies**: Number of issues found
- **Affected Users**: Users with balance issues
- **Amount Variance**: Total discrepancy value
- **Resolution Status**: Fixed, pending, investigating

### Resolving Discrepancies

1. Identify discrepancy in report
2. Review transaction history
3. Determine root cause
4. Apply correction:
   - Adjust user balance
   - Log correction in audit trail
   - Notify user if significant
5. Document resolution

---

## System Monitoring

### System Health Dashboard

Access at `/admin/monitoring`:

#### Key Metrics
- **Server Status**: All services operational
- **Response Times**: API performance
- **Error Rate**: System errors per hour
- **Database Performance**: Query times
- **Active Users**: Current online users
- **Live Classes**: Active video sessions

### Performance Monitoring

#### API Performance
- **Average Response Time**: Should be <200ms
- **p95 Response Time**: 95th percentile latency
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per minute

#### Database Monitoring
- **Query Performance**: Slow query log
- **Connection Pool**: Active connections
- **Cache Hit Rate**: Query cache effectiveness
- **Storage Usage**: Database size and growth

### Rollback Monitoring

View at `/admin/monitoring/rollbacks`:
- **Failed Transactions**: Transactions that needed rollback
- **Rollback Success Rate**: Percentage successful
- **Common Failure Points**: Where failures occur
- **Recovery Time**: How long to recover

### Alerts and Notifications

Configure alerts for:
- **High Error Rate**: >5% error rate
- **Slow Response**: >1s average response time
- **Failed Payments**: Payment processing issues
- **System Downtime**: Service unavailability
- **Security Events**: Suspicious activity

---

## Security and Access Control

### User Permissions

#### Role-Based Access Control (RBAC)
- **Students**: Can access own data only
- **Teachers**: Can access own classes and students
- **Admins**: Full platform access

#### Managing Admin Accounts
1. Navigate to `/admin/users`
2. Filter by role: Admin
3. Add new admin:
   - Click "Create Admin"
   - Enter email and name
   - Assign permissions
   - Send invitation
4. Remove admin access:
   - Click on admin user
   - Change role to another type
   - Confirm change

### Security Audit Log

View all administrative actions at `/admin/audit`:
- **User Actions**: Who did what and when
- **Data Changes**: Before/after values
- **Permission Changes**: Role assignments
- **Login Attempts**: Failed and successful logins
- **Suspicious Activity**: Flagged actions

### Data Protection

#### Student Data Access
- **GDPR Compliance**: User data export and deletion
- **Data Retention**: Automatic cleanup of old data
- **Encryption**: All sensitive data encrypted at rest
- **Access Logs**: Track who accessed what data

#### Handling Data Requests
1. **Data Export Request**:
   - Verify user identity
   - Generate complete data export
   - Deliver securely to user
   - Log the export

2. **Data Deletion Request**:
   - Verify user identity
   - Review deletion implications
   - Process deletion (irreversible)
   - Confirm completion to user

---

## Platform Configuration

### General Settings

Navigate to `/admin/settings`:

#### Platform Information
- **Platform Name**: Easy Eng
- **Support Email**: support@easyeng.com
- **Contact Phone**: Platform phone number
- **Timezone**: Default timezone setting

#### Feature Toggles
- **Enable/Disable Features**:
  - Student registration
  - Teacher registration
  - Live video classes
  - Quiz system
  - Gem system
  - Referral program
  - Marketplace (future)

### Email Configuration

#### Email Templates
- **Welcome Email**: New user onboarding
- **Booking Confirmation**: Class booking receipt
- **Class Reminder**: 1 hour before class
- **Payment Receipt**: Payment confirmation
- **Payout Notification**: Teacher earnings paid

#### Email Settings
- **SMTP Configuration**: Email server settings
- **From Address**: Sender email address
- **Reply-To Address**: Where replies go
- **Email Signature**: Default signature

### Notification Settings

Configure notification delivery:
- **Email Notifications**: Enabled/disabled
- **Push Notifications**: Enabled/disabled
- **In-App Notifications**: Enabled/disabled
- **SMS Notifications**: Enabled/disabled (future)

---

## Troubleshooting

### Common Issues

#### Video Class Issues
**Problem**: Teacher or student can't join class
**Solutions**:
- Check CometChat service status
- Verify user has valid booking
- Check class timing (not started/ended)
- Verify internet connection
- Check browser compatibility

#### Payment Issues
**Problem**: Payment failed or pending
**Solutions**:
- Check payment gateway status
- Verify payment method validity
- Review transaction logs
- Contact payment provider
- Process manual refund if needed

#### Gem Discrepancies
**Problem**: User reports incorrect Gem balance
**Solutions**:
- Run Gem reconciliation for user
- Review Gem transaction history
- Check for failed transactions
- Manually adjust if confirmed discrepancy
- Document resolution in audit log

### Support Escalation

#### Level 1 Support (Platform Admins)
- Basic user issues
- Account access
- Booking questions
- General platform help

#### Level 2 Support (Technical Team)
- Payment gateway issues
- Video platform problems
- Database issues
- API errors

#### Level 3 Support (Engineering)
- Critical system failures
- Security incidents
- Data corruption
- Architecture issues

### Emergency Procedures

#### Platform Downtime
1. Check system status dashboard
2. Identify affected services
3. Notify engineering team
4. Post status update
5. Communicate to users
6. Monitor restoration

#### Data Breach
1. **IMMEDIATELY** isolate affected systems
2. Notify security team
3. Document incident details
4. Follow incident response plan
5. Notify affected users
6. Report to authorities if required

#### Payment Issues
1. Pause payment processing if needed
2. Contact payment gateway support
3. Notify affected users
4. Process manual refunds
5. Document all actions

---

## Best Practices

### Daily Admin Tasks
- ☐ Review dashboard metrics
- ☐ Check pending payouts
- ☐ Monitor system alerts
- ☐ Review user reports
- ☐ Respond to support tickets

### Weekly Admin Tasks
- ☐ Run reconciliation reports
- ☐ Review analytics trends
- ☐ Check fraud flags
- ☐ Audit new content
- ☐ Review security logs

### Monthly Admin Tasks
- ☐ Generate comprehensive reports
- ☐ Review platform policies
- ☐ Analyze revenue trends
- ☐ Plan improvements
- ☐ Team performance review

### Security Best Practices
- Use strong, unique passwords
- Enable two-factor authentication
- Log out after each session
- Don't share admin credentials
- Review audit logs regularly
- Report suspicious activity immediately

---

## Keyboard Shortcuts

- **Ctrl + K**: Quick search
- **Ctrl + D**: Dashboard
- **Ctrl + U**: User management
- **Ctrl + A**: Analytics
- **Ctrl + S**: Settings

---

## Contact and Support

### Internal Team
- **Engineering**: engineering@easyeng.com
- **Product**: product@easyeng.com
- **Security**: security@easyeng.com
- **Finance**: finance@easyeng.com

### External Support
- **CometChat Support**: For video platform issues
- **Supabase Support**: For database issues
- **Payment Gateway Support**: For payment processing

---

## Appendix

### Admin API Access
Admins have access to all platform APIs for automation and integrations.

### Database Access
Direct database access requires special authorization. Use admin UI for standard operations.

### Backup and Recovery
- **Daily Backups**: Automated at 2 AM UTC
- **Backup Retention**: 30 days
- **Recovery Time**: <6 hours for full restore

---

**Last Updated**: February 2026
**Version**: 1.0
**Administrator Access Level**: Full Platform Control

For emergency issues outside business hours, contact on-call engineering: [Emergency Contact]

**Remember**: With great power comes great responsibility. Always verify actions before confirming, especially deletions and bulk operations.
