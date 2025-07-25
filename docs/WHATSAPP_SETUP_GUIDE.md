# WhatsApp Cloud API Setup Guide

This guide walks you through setting up the WhatsApp Cloud API integration for your Scholarise application.

## Prerequisites

1. A Meta Business Account
2. A WhatsApp Business Account
3. A Meta Developer App
4. A verified WhatsApp Business phone number

## Step 1: Create Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Log in with your Meta account
3. Click "Create App" → "Business" → "WhatsApp"
4. Fill in your app details and create the app

## Step 2: Set up WhatsApp Business API

1. In your Meta app dashboard, go to "WhatsApp" → "API Setup"
2. Add a phone number or use the test number provided
3. Note down the following values:
   - **Phone Number ID** (from the phone number dropdown)
   - **WhatsApp Business Account ID** (from the API Setup page)

## Step 3: Generate Access Token

1. In your app dashboard, go to "WhatsApp" → "API Setup"
2. In the "Access Token" section, click "Generate Token"
3. Select your WhatsApp Business Account
4. Copy the temporary access token
5. **Important**: For production, create a permanent access token:
   - Go to "App Settings" → "Basic"
   - Generate an App Secret
   - Use the permanent token generation process

## Step 4: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Meta WhatsApp Business Platform API
META_WHATSAPP_ACCESS_TOKEN=your-meta-whatsapp-access-token
META_WHATSAPP_PHONE_NUMBER_ID=123456789012345
META_WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
META_WHATSAPP_APP_SECRET=your-meta-app-secret
META_WHATSAPP_API_VERSION=v21.0
```

### Variable Details:

- **META_WHATSAPP_ACCESS_TOKEN**: Your access token from Step 3
- **META_WHATSAPP_PHONE_NUMBER_ID**: From WhatsApp API Setup page
- **META_WHATSAPP_BUSINESS_ACCOUNT_ID**: Your WhatsApp Business Account ID
- **META_WHATSAPP_WEBHOOK_VERIFY_TOKEN**: A secret string you choose (e.g., "scholarship-webhook-2024")
- **META_WHATSAPP_APP_SECRET**: From App Settings → Basic → App Secret
- **META_WHATSAPP_API_VERSION**: API version (optional, defaults to v21.0)

## Step 5: Configure Webhook

1. In your Meta app dashboard, go to "WhatsApp" → "Configuration"
2. Click "Edit" next to Webhook
3. Set the webhook URL to: `https://your-domain.com/api/webhooks/meta-whatsapp`
4. Set the verify token to the same value as `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`
5. Subscribe to the following webhook fields:
   - `messages` (for incoming messages)
   - `message_template_status_update` (for template approvals)

### Webhook URL Examples:
- Development: Use ngrok or similar tool to expose localhost
- Production: `https://your-domain.com/api/webhooks/meta-whatsapp`

## Step 6: Test the Integration

1. Use the built-in test endpoints:
   ```
   POST /api/communication/testWhatsAppConnection
   ```

2. Test template creation:
   - Go to Communication → Templates
   - Create a new template
   - Submit for approval

3. Test messaging:
   - Go to Communication → Send Message
   - Send a template message to a test number

## Common Issues and Solutions

### 1. Invalid Access Token
- **Error**: 401 Unauthorized
- **Solution**: Regenerate your access token and update the environment variable

### 2. Phone Number Not Found
- **Error**: Phone Number ID not found
- **Solution**: Verify the Phone Number ID in your Meta app's WhatsApp API Setup

### 3. Template Submission Fails
- **Error**: Template name already exists
- **Solution**: Use unique template names (lowercase, underscores only)

### 4. Webhook Verification Fails
- **Error**: Forbidden on webhook setup
- **Solution**: Ensure `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches exactly

### 5. Message Sending Fails
- **Error**: Template not approved
- **Solution**: Wait for Meta to approve your template (can take 24-48 hours)

## Template Guidelines

### Template Naming Rules:
- Lowercase letters only
- Underscores allowed
- No spaces or special characters
- Must be unique across your Business Account

### Template Content Rules:
- No promotional content in utility templates
- Use `{{1}}`, `{{2}}` for variable placeholders
- Keep content professional and compliant with WhatsApp policies

### Variable Mapping:
When creating templates, use this format:
```
Hello {{1}}, your payment of {{2}} is due on {{3}}.
```

Map variables in your app as:
```javascript
{
  "1": "student_name",
  "2": "amount", 
  "3": "due_date"
}
```

## Rate Limits

Meta WhatsApp Cloud API has the following limits:
- **Messaging**: 1000 messages per second per phone number
- **Template Creation**: 50 per day per Business Account
- **API Calls**: 4000 per hour per app

Our implementation includes automatic rate limiting with 200ms delays between bulk messages.

## Security Best Practices

1. **Secure Your Access Token**:
   - Never commit tokens to git
   - Use environment variables only
   - Regenerate tokens periodically

2. **Webhook Security**:
   - Always validate webhook signatures
   - Use HTTPS for webhook URLs
   - Keep your app secret secure

3. **Phone Number Validation**:
   - Validate all phone numbers before sending
   - Handle international formats correctly
   - Respect opt-out requests

## Troubleshooting

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and check the server logs for detailed API responses.

### Test Endpoints
Use these endpoints to test your integration:

```bash
# Test connection
curl -X POST https://your-domain.com/api/trpc/communication.testWhatsAppConnection

# Test environment
curl -X POST https://your-domain.com/api/trpc/communication.debugEnvironment

# Sync templates
curl -X POST https://your-domain.com/api/trpc/communication.syncTemplatesFromWhatsApp
```

### Meta Business Manager
Monitor your integration in [Meta Business Manager](https://business.facebook.com/):
- Check WhatsApp API usage
- Review template statuses
- Monitor messaging quality

## Support

For additional help:
1. Check [Meta WhatsApp API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
2. Review the application logs for detailed error messages
3. Use the built-in debug endpoints for diagnostics

## Production Checklist

Before going live:
- [ ] Permanent access token configured
- [ ] Webhook URL is HTTPS and accessible
- [ ] All templates approved by Meta
- [ ] Phone number verified and approved
- [ ] Rate limiting configured
- [ ] Error monitoring in place
- [ ] Backup communication method available 