# Teacher User Guide - Easy Eng Learning Platform

## Welcome, Teacher!

This guide will help you navigate and use the Easy Eng Learning Platform to manage your classes, students, and earnings.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Creating and Managing Classes](#creating-and-managing-classes)
4. [Scheduling and Availability](#scheduling-and-availability)
5. [Conducting Live Video Classes](#conducting-live-video-classes)
6. [Managing Students](#managing-students)
7. [Creating Quizzes and Assessments](#creating-quizzes-and-assessments)
8. [Uploading Class Materials](#uploading-class-materials)
9. [Tracking Your Earnings](#tracking-your-earnings)
10. [Payment and Payouts](#payment-and-payouts)
11. [Support and Resources](#support-and-resources)

---

## Getting Started

### Logging In
1. Navigate to the login page at `/auth/login`
2. Enter your registered email and password
3. Click "Login" to access your teacher dashboard

### First-Time Setup
1. Complete your teacher profile at `/settings/profile`
2. Add your payment information for earnings payouts
3. Set your teaching availability in the Schedule section

---

## Dashboard Overview

Your teacher dashboard (`/teacher/dashboard`) displays:

- **Upcoming Classes**: Next scheduled classes with student counts
- **Today's Schedule**: All classes scheduled for today
- **Student Roster**: List of enrolled students across all your classes
- **Earnings Summary**: Total earnings, pending payouts, and revenue trends
- **Quick Actions**: Create new class, view schedule, check earnings

---

## Creating and Managing Classes

### Creating a New Class

1. Navigate to `/teacher/classes/new`
2. Fill in the class details:
   - **Class Name**: Clear, descriptive title (e.g., "Beginner English Conversation")
   - **Description**: Detailed description of what students will learn
   - **Level**: Beginner, Intermediate, Advanced
   - **Duration**: 25, 50, or custom minutes
   - **Price**: Set your price per class (platform takes 30%, you receive 70%)
   - **Maximum Students**: Capacity limit (recommended: 1-5 for effective teaching)
   - **Schedule**: Date and time for the class
3. Click "Create Class"

### Editing an Existing Class

1. Go to `/teacher/classes`
2. Click on the class you want to edit
3. Click "Edit Class" button
4. Update any details as needed
5. Save changes

### Class Status

- **Scheduled**: Class is created and open for bookings
- **Live**: Class is currently in progress
- **Completed**: Class has ended
- **Cancelled**: Class was cancelled (students receive full refund)

---

## Scheduling and Availability

### Setting Your Availability

1. Navigate to `/teacher/schedule`
2. Use the calendar interface to:
   - Click on time slots to mark them as available
   - Drag to select multiple time slots
   - Set recurring availability patterns
3. Students can only book classes during your available slots

### Managing Your Schedule

- **View**: See all scheduled classes in calendar view
- **Reschedule**: Contact admin to reschedule (affects student bookings)
- **Block Time**: Mark specific times as unavailable

---

## Conducting Live Video Classes

### Starting a Class

1. Navigate to your class at `/class/[classId]/live` at least 15 minutes before start time
2. Click "Start Class" button when ready
3. Allow camera and microphone permissions
4. Wait for students to join in the waiting room

### During the Class

**Video Controls:**
- **Camera**: Toggle video on/off
- **Microphone**: Mute/unmute audio
- **Screen Share**: Share your screen with students
- **Chat**: Send text messages to students
- **End Class**: Finish the class session

**Best Practices:**
- Start on time (within 15 minutes of scheduled start)
- Greet each student as they join
- Use screen sharing for presentations or materials
- Check chat regularly for student questions
- Engage students with interactive activities
- End the class with a summary and homework assignment

### Ending a Class

1. Click "End Class" button
2. Confirm the class end
3. Students receive attendance rewards automatically
4. You'll be redirected to the class summary page

### Technical Requirements

- **Internet**: Stable broadband connection (minimum 2 Mbps upload)
- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Hardware**: Webcam and microphone
- **Resolution**: Minimum 720p video quality recommended

---

## Managing Students

### Viewing Enrolled Students

1. Go to `/teacher/classes/[id]`
2. Click on "Enrolled Students" tab
3. View list of students who booked the class

### Student Information

- **Name**: Student's display name
- **Booking Date**: When they booked
- **Payment Status**: Confirmed, Pending, Refunded
- **Attendance**: Present, Absent, Late

### Communication

- Use in-class chat during live sessions
- Students can leave reviews after class completion
- Contact platform support for student issues

---

## Creating Quizzes and Assessments

### Creating a Quiz

1. Navigate to `/teacher/quiz/create`
2. Fill in quiz details:
   - **Quiz Title**: Clear, descriptive name
   - **Description**: What the quiz covers
   - **Time Limit**: Duration in minutes
   - **Passing Score**: Minimum percentage to pass
3. Add questions:
   - **Question Text**: The question to ask
   - **Question Type**: Multiple choice, True/False
   - **Options**: Add answer choices
   - **Correct Answer**: Mark the correct option
   - **Points**: Assign points to each question
4. Set Gem rewards:
   - **90%+ Score**: 30 Gems
   - **75-89% Score**: 20 Gems
   - **Below 75%**: 10 Gems
5. Save and publish the quiz

### Managing Quizzes

- View all your quizzes at `/teacher/quizzes`
- Edit quiz questions and settings
- View student results and scores
- Deactivate or delete quizzes as needed

---

## Uploading Class Materials

### Adding Materials to a Class

1. Go to your class at `/teacher/classes/[id]`
2. Click on "Class Materials" tab
3. Click "Upload Materials" button
4. Select files to upload:
   - **Supported Formats**: PDF, DOCX, PPTX, images, videos
   - **Max Size**: 50MB per file
5. Add description for each material
6. Click "Upload"

### Managing Materials

- Students can access materials after booking
- You can add/remove materials anytime
- Materials are automatically available in class sessions

---

## Tracking Your Earnings

### Viewing Earnings

Navigate to `/teacher/earnings` to see:

- **Total Earnings**: All-time revenue (70% of class prices)
- **This Month**: Earnings for current month
- **Pending Payout**: Amount ready for withdrawal
- **Earnings History**: Detailed transaction log

### How Earnings Work

1. **Student Books Class**: Payment is processed
2. **Platform Split**: You receive 70%, platform keeps 30%
3. **After Class Completion**: Earnings are confirmed
4. **Accumulation**: Earnings accumulate in your account
5. **Payout**: Request payout when ready (minimum threshold may apply)

### Earnings Breakdown

Each class shows:
- **Class Name**: Which class generated earnings
- **Date**: When the class occurred
- **Students**: Number of students attended
- **Gross Amount**: Total booking price
- **Your Share**: 70% of gross amount
- **Status**: Paid, Pending, Scheduled

---

## Payment and Payouts

### Requesting a Payout

1. Navigate to `/teacher/earnings`
2. Click "Request Payout" button
3. Verify your payout amount
4. Confirm payout destination (bank account or PayPal)
5. Submit request

### Payout Methods

- **Bank Transfer**: Direct deposit to your bank account
- **PayPal**: Transfer to your PayPal account
- **Local Payment Gateways**: VNPay, MoMo, ZaloPay (Vietnam)

### Payout Timeline

- **Processing Time**: 3-5 business days
- **Minimum Amount**: Check platform policy for minimum payout threshold
- **Payout Schedule**: You can request payouts anytime after minimum is reached

### Payment Information

Update your payment information:
1. Go to `/settings/profile`
2. Click "Payment Information" tab
3. Add or update bank details
4. Save changes

---

## Support and Resources

### Getting Help

- **Help Center**: Visit `/help` for FAQs and guides
- **Contact Support**: Email support@easyeng.com
- **Community Forum**: Connect with other teachers
- **Live Chat**: Available during business hours

### Best Practices for Success

1. **Be Punctual**: Start classes on time
2. **Engage Students**: Use interactive teaching methods
3. **Provide Feedback**: Give constructive comments to students
4. **Quality Materials**: Upload helpful resources
5. **Professional Setup**: Good lighting, clear audio, organized background
6. **Continuous Improvement**: Review student feedback and improve

### Technical Support

For technical issues:
- **Video Issues**: Check camera/mic permissions in browser
- **Connection Problems**: Ensure stable internet connection
- **Platform Bugs**: Report to support@easyeng.com

### Teacher Resources

- **Teaching Tips**: Best practices for online teaching
- **Content Library**: Downloadable teaching materials
- **Webinars**: Regular training sessions for teachers
- **Newsletter**: Stay updated with platform news

---

## Keyboard Shortcuts

- **Alt + V**: Toggle video
- **Alt + A**: Toggle audio
- **Alt + S**: Share screen
- **Alt + C**: Open chat
- **Esc**: Exit full screen

---

## Terms and Policies

- Review the Teacher Agreement for platform policies
- Understand cancellation policies and refund rules
- Comply with content guidelines and teaching standards
- Respect student privacy and data protection

---

## Frequently Asked Questions

**Q: What happens if I need to cancel a class?**
A: Contact support immediately. Students will receive full refunds, and your earnings for that class will be forfeited.

**Q: How many students should I accept per class?**
A: We recommend 1-5 students for optimal engagement. You can set your own maximum.

**Q: When do I receive payment for completed classes?**
A: Earnings are confirmed after class completion and available for payout immediately. Processing takes 3-5 business days.

**Q: Can I teach multiple classes at the same time?**
A: No, you can only conduct one live class at a time.

**Q: What if a student doesn't show up?**
A: If a student is marked absent, they don't receive attendance rewards, but you still receive your earnings for that booking.

**Q: How do I improve my teaching rating?**
A: Provide quality instruction, engage students, upload helpful materials, and respond to student feedback.

---

## Contact Information

- **Email**: support@easyeng.com
- **Phone**: [Platform Phone Number]
- **Website**: https://easyeng.com
- **Hours**: Monday - Friday, 9 AM - 6 PM (Vietnam Time)

---

**Last Updated**: February 2026
**Version**: 1.0

For additional help, visit our Help Center or contact support.

Happy Teaching! 🎓
