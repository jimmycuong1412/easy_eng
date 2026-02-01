# Payment Integration Guide

**Phase 13 - Payment Integration**
**Status**: ✅ Complete
**Date**: 2026-02-01

## Overview

The Easy English Learning Platform integrates with multiple payment gateways to support both Vietnamese and international users:

- **VNPay**: Vietnam domestic cards and Internet Banking
- **MoMo**: Vietnam mobile wallet
- **ZaloPay**: Vietnam mobile wallet
- **Stripe**: International credit/debit cards

## Architecture

### Backend Services

```
backend/src/services/
├── payment-gateways/
│   ├── vnpay.service.ts       # VNPay integration
│   ├── momo.service.ts        # MoMo integration
│   ├── zalopay.service.ts     # ZaloPay integration
│   └── stripe.service.ts      # Stripe integration
├── payment.unified.service.ts  # Unified payment orchestrator
└── refund.service.ts          # Refund processing
```

### Frontend Components

```
frontend/src/
├── components/booking/
│   └── PaymentMethodSelector.tsx  # Payment method selection UI
└── app/[locale]/student/bookings/
    ├── payment/page.tsx           # Payment processing page
    ├── success/page.tsx           # Payment success page
    └── failed/page.tsx            # Payment failure page
```

### Database

```sql
-- Payments table (supabase/migrations/039_payments.sql)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  transaction_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  payment_method VARCHAR(50),
  status VARCHAR(50),
  payment_url TEXT,
  gateway_response JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

## Configuration

### Environment Variables

Add the following to `backend/.env`:

```bash
# VNPay
VNPAY_TMN_CODE=your-vnpay-merchant-code
VNPAY_HASH_SECRET=your-vnpay-hash-secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/student/bookings/payment-return
VNPAY_IPN_URL=http://localhost:4000/api/webhooks/payment/vnpay

# MoMo
MOMO_PARTNER_CODE=your-momo-partner-code
MOMO_ACCESS_KEY=your-momo-access-key
MOMO_SECRET_KEY=your-momo-secret-key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api
MOMO_REDIRECT_URL=http://localhost:3000/student/bookings/payment-return
MOMO_IPN_URL=http://localhost:4000/api/webhooks/payment/momo

# ZaloPay
ZALOPAY_APP_ID=your-zalopay-app-id
ZALOPAY_KEY1=your-zalopay-key1
ZALOPAY_KEY2=your-zalopay-key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:4000/api/webhooks/payment/zalopay

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/student/bookings/success
STRIPE_CANCEL_URL=http://localhost:3000/student/bookings/failed
```

### Production URLs

For production, update the URLs to use your production domain:

```bash
VNPAY_URL=https://vnpayment.vn/paymentv2/vpcpay.html  # Production
VNPAY_RETURN_URL=https://yourdomain.com/student/bookings/payment-return
VNPAY_IPN_URL=https://yourdomain.com/api/webhooks/payment/vnpay

MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api  # Production
# ... etc
```

## Payment Flow

### 1. Student Initiates Payment

```typescript
// Student selects payment method and clicks "Pay"
const response = await fetch('/api/payments/create', {
  method: 'POST',
  body: JSON.stringify({
    booking_id: bookingId,
    student_id: userId,
    amount: finalPrice,
    currency: 'USD',
    payment_method: 'stripe', // or vnpay, momo, zalopay
    description: 'Payment for English Class',
    customer_email: userEmail,
  }),
});
```

### 2. Backend Processes Payment

```typescript
// UnifiedPaymentService routes to appropriate gateway
const paymentService = new UnifiedPaymentService(
  supabase,
  vnpayConfig,
  momoConfig,
  zalopayConfig,
  stripeConfig
);

const result = await paymentService.processPayment(request);
// Returns: { success: true, paymentUrl: "https://...", transactionId: "..." }
```

### 3. Student Redirects to Gateway

```typescript
// Frontend redirects to payment URL
window.location.href = result.payment_url;
```

### 4. Gateway Processes Payment

- User completes payment on gateway website/app
- Gateway sends webhook/IPN to backend

### 5. Backend Confirms Payment

```typescript
// Webhook handler verifies signature and updates status
router.post('/vnpay', async (req, res) => {
  const isValid = vnpay.verifyIPN(req.query);
  if (isValid && vnpay.isPaymentSuccessful(req.query.vnp_ResponseCode)) {
    await confirmPayment(transactionId);
  }
});
```

### 6. Student Returns to Success Page

```typescript
// Frontend displays success with booking details
router.push(`/student/bookings/success?booking_id=${bookingId}`);
```

## Webhook Endpoints

Each payment gateway requires webhook configuration:

| Gateway | Method | Endpoint                           | Purpose           |
| ------- | ------ | ---------------------------------- | ----------------- |
| VNPay   | GET    | `/api/webhooks/payment/vnpay`      | Payment IPN       |
| MoMo    | POST   | `/api/webhooks/payment/momo`       | Payment IPN       |
| ZaloPay | POST   | `/api/webhooks/payment/zalopay`    | Payment callback  |
| Stripe  | POST   | `/api/webhooks/payment/stripe`     | Payment webhook   |

### Webhook Security

All webhooks verify signatures before processing:

- **VNPay**: HMAC SHA512 signature with hash secret
- **MoMo**: HMAC SHA256 signature with secret key
- **ZaloPay**: HMAC SHA256 MAC verification
- **Stripe**: Signature verification with webhook secret

## Refund Processing

### Refund Policies

```typescript
const CANCELLATION_POLICIES = [
  { hoursBeforeClass: 24, refundPercentage: 100 }, // Full refund if 24+ hours
  { hoursBeforeClass: 12, refundPercentage: 50 }, // 50% refund if 12-24 hours
  { hoursBeforeClass: 0, refundPercentage: 0 }, // No refund if <12 hours
];
```

### Processing a Refund

```typescript
const refundService = new RefundService(supabase, vnpay, momo, zalopay, stripe);

const result = await refundService.processRefund({
  bookingId: 'booking-uuid',
  reason: 'Student requested cancellation',
  initiatedBy: 'student',
});

// Returns:
// {
//   success: true,
//   refundId: "refund-uuid",
//   refundAmount: 25.00,
//   gemsRestored: 50
// }
```

### Gem Restoration

When a booking is refunded, any Gems used for discount are automatically restored:

```typescript
// Restore Gems to student's balance
await supabase.from('gem_transactions').insert({
  student_id: studentId,
  amount: gemsUsed,
  transaction_type: 'refund',
  reason: 'Booking cancellation - gems restored',
  related_booking_id: bookingId,
});
```

## Testing

### Test Credentials

Each gateway provides test credentials for sandbox testing:

**VNPay Sandbox**:
- URL: https://sandbox.vnpayment.vn
- Test cards: [VNPay Documentation](https://sandbox.vnpayment.vn/apis/docs/)

**MoMo Sandbox**:
- URL: https://test-payment.momo.vn
- Docs: [MoMo Developer Portal](https://developers.momo.vn/)

**ZaloPay Sandbox**:
- URL: https://sb-openapi.zalopay.vn
- Docs: [ZaloPay Documentation](https://docs.zalopay.vn/)

**Stripe Test Mode**:
- Use test API keys (sk_test_...)
- Test card: 4242 4242 4242 4242 (any future expiry, any CVC)

### Test Scenarios

1. **Successful Payment**
   - Select payment method
   - Complete payment on gateway
   - Verify booking status = 'confirmed'
   - Check payment record status = 'completed'

2. **Failed Payment**
   - Use invalid card/insufficient funds
   - Verify error handling
   - Check payment record status = 'failed'
   - Booking remains 'pending'

3. **Webhook Delivery**
   - Use ngrok or similar for local testing
   - Configure webhook URLs with gateway
   - Verify signature validation
   - Test payment confirmation flow

4. **Refund Processing**
   - Create confirmed booking
   - Process refund within policy window
   - Verify refund amount calculation
   - Check Gems restoration

## Error Handling

### Common Errors

| Error                        | Cause                               | Solution                             |
| ---------------------------- | ----------------------------------- | ------------------------------------ |
| "Booking not found"          | Invalid booking ID                  | Verify booking exists                |
| "Amount mismatch"            | Price changed after booking created | Refresh booking details              |
| "Payment already processed"  | Duplicate payment attempt           | Check payment status first           |
| "Signature verification failed" | Invalid webhook signature        | Verify secret keys match             |
| "Gateway timeout"            | Network issues                      | Implement retry logic                |

### Error Logging

All payment errors are logged with context:

```typescript
logger.error('Payment processing failed:', {
  bookingId,
  paymentMethod,
  amount,
  error: error.message,
  stack: error.stack,
});
```

## Security Considerations

### PCI Compliance

- **Never store card details** on the backend
- All card processing happens on gateway's secure servers
- Use HTTPS for all payment-related endpoints

### Signature Verification

Always verify webhook signatures before processing:

```typescript
// VNPay example
const isValid = vnpay.verifyIPN(params);
if (!isValid) {
  return res.json({ RspCode: '97', Message: 'Invalid signature' });
}
```

### Rate Limiting

Implement rate limiting on payment endpoints:

```typescript
// Limit payment creation to 5 requests per minute per user
rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many payment requests',
});
```

### Input Validation

Validate all payment inputs:

```typescript
const paymentSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['vnpay', 'momo', 'zalopay', 'stripe']),
});
```

## Monitoring

### Key Metrics

Track these metrics for payment health:

- **Payment Success Rate**: (successful / total) * 100
- **Average Processing Time**: Time from initiation to confirmation
- **Refund Rate**: (refunds / completed payments) * 100
- **Gateway Uptime**: Availability of each gateway

### Alerts

Set up alerts for:

- Payment success rate drops below 95%
- Webhook delivery failures
- Unusual refund patterns
- Gateway API errors

## Production Deployment

### Checklist

- [ ] Update all URLs to production domains
- [ ] Switch to production API keys
- [ ] Configure webhook URLs with gateways
- [ ] Test webhook delivery in production
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Document incident response procedures
- [ ] Train support team on payment issues

### Gateway Registration

1. **VNPay**: Register at https://vnpay.vn
2. **MoMo**: Apply at https://business.momo.vn
3. **ZaloPay**: Register at https://merchant.zalopay.vn
4. **Stripe**: Sign up at https://dashboard.stripe.com

Each gateway requires business verification and contract signing.

## Support

For payment-related issues:

- **VNPay**: support@vnpay.vn
- **MoMo**: hotro@momo.vn
- **ZaloPay**: support@zalopay.vn
- **Stripe**: https://support.stripe.com

## References

- [VNPay API Documentation](https://sandbox.vnpayment.vn/apis/docs/)
- [MoMo Developer Portal](https://developers.momo.vn/)
- [ZaloPay Documentation](https://docs.zalopay.vn/)
- [Stripe API Reference](https://stripe.com/docs/api)

---

**Phase 13 Status**: ✅ Complete (12/12 tasks)
**Last Updated**: 2026-02-01
**Maintained By**: Development Team
