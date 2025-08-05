# Razorpay Payment Gateway Setup Guide

This guide explains how to set up and configure Razorpay payment gateway for the Scholarise application.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com)
2. Access to your application's environment variables
3. A verified domain for webhooks (for production)

## Step 1: Get Razorpay API Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **API Keys**
3. Generate API keys for both test and live modes:
   - Test mode keys start with `rzp_test_`
   - Live mode keys start with `rzp_live_`
4. Copy your **Key ID** and **Key Secret**

## Step 2: Configure Webhook Secret

1. In Razorpay Dashboard, go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Set the Webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
4. Generate and copy the **Webhook Secret**
5. Enable these events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `order.paid`

## Step 3: Set Environment Variables

Add these variables to your `.env.local` file:

```env
# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx

# Razorpay Webhook Secret
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx

# Environment: 'test' or 'production'
RAZORPAY_ENV=test
```

## Step 4: Security Best Practices

### API Key Security
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys periodically
- Restrict key access to authorized personnel only

### Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement idempotency to handle duplicate webhooks
- Log all webhook events for audit trails

### Payment Security
- Always create orders on the server side
- Verify payment signatures before processing
- Never trust client-side payment data
- Implement proper error handling and logging

## Step 5: Testing

### Test Mode
1. Use test mode keys (starting with `rzp_test_`)
2. Use Razorpay test cards:
   - Success: `4111 1111 1111 1111`
   - Failure: `5105 1051 0510 5100`
3. Test various scenarios:
   - Successful payments
   - Failed payments
   - Cancelled payments
   - Webhook processing

### Test Checklist
- [ ] Payment creation works
- [ ] Razorpay checkout opens correctly
- [ ] Successful payment updates database
- [ ] Failed payment shows appropriate error
- [ ] Webhooks are received and processed
- [ ] Receipt generation works
- [ ] Payment status is correctly reflected

## Step 6: Going Live

1. **Get Business Verification**: Complete KYC in Razorpay Dashboard
2. **Update API Keys**: Switch to live mode keys
3. **Update Environment**: Set `RAZORPAY_ENV=production`
4. **Update Webhook URL**: Ensure production domain is configured
5. **Test Live Payment**: Make a small real payment to verify
6. **Monitor**: Check logs and dashboard for any issues

## Troubleshooting

### Common Issues

1. **"Payment gateway is not configured"**
   - Check if all environment variables are set
   - Restart the application after setting variables

2. **"Invalid signature" errors**
   - Verify webhook secret is correct
   - Ensure raw request body is used for verification

3. **Webhook not received**
   - Check webhook URL is accessible
   - Verify webhook events are enabled
   - Check server logs for errors

4. **Payment fails but money deducted**
   - Check webhook processing
   - Verify database transaction handling
   - Contact Razorpay support with payment ID

### Debug Checklist
- [ ] Check server logs for errors
- [ ] Verify environment variables are loaded
- [ ] Test webhook endpoint manually
- [ ] Check Razorpay Dashboard for payment status
- [ ] Verify database records are created/updated

## Support

- **Razorpay Documentation**: https://razorpay.com/docs/
- **Razorpay Support**: https://razorpay.com/support/
- **API Reference**: https://razorpay.com/docs/api/

## Additional Features

Razorpay offers additional features you can implement:

1. **Payment Links**: Generate shareable payment links
2. **Subscriptions**: Set up recurring payments
3. **Smart Collect**: Virtual accounts for bank transfers
4. **Route**: Split payments between multiple accounts
5. **Invoices**: Generate and send payment invoices

Refer to Razorpay documentation for implementing these features.