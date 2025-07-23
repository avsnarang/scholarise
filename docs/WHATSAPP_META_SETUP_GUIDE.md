# Meta WhatsApp Business API Setup Guide

This guide will help you set up Meta's WhatsApp Business API for your application.

## 🎯 Benefits of Meta's WhatsApp API

- **Lower Costs**: Direct pricing from Meta without third-party markup
- **Latest Features**: Access to newest WhatsApp features immediately
- **Better Control**: Direct template management and approval
- **Higher Limits**: Better rate limits and message throughput
- **Rich Media**: Support for interactive messages, buttons, and media

## 📋 Prerequisites

Before starting, ensure you have:

1. **Meta Business Account** with admin access
2. **WhatsApp Business Account** (can be existing WhatsApp Business)
3. **Phone Number** for WhatsApp Business verification
4. **System Admin Access** to configure environment variables
5. **SSL Certificate** for webhook URL (HTTPS required)

## 🚀 Step 1: Create Meta Business Account

1. **Visit Meta Business**
   - Go to [Meta Business](https://business.facebook.com)
   - Create a new business account or use an existing one
   - Complete business verification if required

2. **Add WhatsApp Product**
   - Go to [Meta Developers](https://developers.facebook.com)
   - Create a new app or select existing app
   - Add "WhatsApp Business" product to your app

## 🏢 Step 2: Set Up WhatsApp Business Account

1. **Add Phone Number**
   - In your Meta app, go to WhatsApp > Getting Started
   - Click "Add phone number"
   - Enter your business phone number
   - Complete the verification process

2. **Get Important IDs**
   - **Phone Number ID**: Found in WhatsApp > Getting Started
   - **Business Account ID**: Found in WhatsApp > Getting Started
   - **App ID**: Found in app dashboard

3. **Generate Access Token**
   - Go to WhatsApp > Getting Started
   - Generate a temporary token for testing
   - For production, create a system user with permanent token:
     - Go to Business Settings > System Users
     - Create new system user
     - Assign WhatsApp Business Management permission
     - Generate access token

## 🔑 Step 3: Configure Environment Variables

Add these environment variables to your deployment:

```bash
# Meta WhatsApp Business API Configuration (REQUIRED)
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_WHATSAPP_PHONE_NUMBER_ID=1234567890123456
META_WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
META_WHATSAPP_API_VERSION=v21.0
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token_here
```

### 🔍 Understanding Each Variable:

| Variable | Description | Where to Find | Example |
|----------|-------------|---------------|---------|
| `META_WHATSAPP_ACCESS_TOKEN` | Your app's access token | App > WhatsApp > Getting Started | `EAAxxxxxx...` |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp phone number ID | App > WhatsApp > Getting Started | `1234567890123456` |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Your WhatsApp business account ID | App > WhatsApp > Getting Started | `1234567890123456` |
| `META_WHATSAPP_API_VERSION` | Graph API version to use | Optional (defaults to v21.0) | `v21.0` |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **Custom token you create** | You choose this | `my_secure_token_123` |

### ⚠️ Important: Webhook Verify Token

The `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` is **NOT** provided by Meta. You create this yourself:

1. **Choose a secure random string** (e.g., `my_app_webhook_verify_2024_xyz`)
2. **Set it in your environment variables**
3. **Use the same value when configuring the webhook in Meta**

This token ensures that webhook requests are actually coming from Meta and not malicious sources.

## 🔗 Step 4: Set Up Webhooks

### Webhook URL

Your webhook URL will be:
```
https://your-domain.com/api/webhooks/meta-whatsapp
```

Replace `your-domain.com` with your actual domain.

### Configure in Meta

1. **Go to Meta App Console**
   - Navigate to your app > WhatsApp > Configuration

2. **Set Webhook URL**
   - Webhook URL: `https://your-domain.com/api/webhooks/meta-whatsapp`
   - Verify Token: Use the **same token** you set in `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`

3. **Subscribe to Fields**
   - Check `messages` (required for receiving messages)
   - Check `message_deliveries` (optional, for delivery status)

4. **Verify Webhook**
   - Click "Verify and Save"
   - Meta will send a verification request to your webhook URL

### Webhook Verification Process

When you click "Verify and Save" in Meta:

1. Meta sends a GET request to your webhook URL
2. Your server checks if the verify token matches
3. If it matches, your server responds with the challenge
4. Meta confirms the webhook is working

## 🧪 Step 5: Test the Setup

### 1. Test API Connection

Navigate to your app and test the connection:
```bash
# If you have a test endpoint
curl -X GET "https://your-domain.com/api/debug/whatsapp-connection"
```

### 2. Test Message Sending

1. **Send Test Message**
   - Go to your app's communication section
   - Create a simple text message
   - Send to your own WhatsApp number

2. **Expected Flow**
   ```
   Your App → Meta API → WhatsApp → Your Phone
   ```

### 3. Test Webhook Reception

1. **Send Message to Business Number**
   - Use your personal WhatsApp
   - Send a message to your WhatsApp Business number

2. **Expected Flow**
   ```
   Your Phone → WhatsApp → Meta API → Your Webhook → Your App
   ```

3. **Check Logs**
   - Look for webhook logs in your application
   - Message should appear in your chat interface

## 📋 Step 6: Template Management

### Create Message Templates

Templates must be approved by Meta before use:

1. **Create in Meta Business Manager**
   - Go to [Meta Business Manager](https://business.facebook.com)
   - Navigate to WhatsApp Manager > Message Templates
   - Click "Create Template"

2. **Template Guidelines**
   - Use clear, professional language
   - Avoid promotional content (unless approved for marketing)
   - Include placeholders for dynamic content: `{{1}}`, `{{2}}`, etc.

3. **Submit for Approval**
   - Templates need Meta approval (usually 24-48 hours)
   - Once approved, you can use them in your app

### Add Templates to Your App

1. **Get Template Information**
   - Template name (e.g., `welcome_message`)
   - Language code (e.g., `en`)
   - Variable placeholders

2. **Create Template in App**
   - Go to Communication > Templates
   - Add new template with Meta template name
   - Map variables and test

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid Access Token"
**Error**: 401 Unauthorized
**Solution**: 
- Regenerate access token in Meta Developer Console
- Ensure token has WhatsApp Business permissions
- For production, use system user token (permanent)

#### 2. "Phone Number Not Found"
**Error**: Phone number ID not recognized
**Solution**:
- Verify Phone Number ID in Meta app console
- Ensure phone number is verified and active
- Check if you're using test vs production phone number

#### 3. "Webhook Verification Failed"
**Error**: Webhook cannot be verified
**Solution**:
- Ensure webhook URL is accessible (HTTPS required)
- Check that `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches exactly
- Verify your app is deployed and running
- Test webhook URL manually: `curl https://your-domain.com/api/webhooks/meta-whatsapp`

#### 4. "Template Not Found"
**Error**: Template name not recognized
**Solution**:
- Ensure template is approved in Meta Business Manager
- Check template name spelling (case-sensitive)
- Verify template language matches

#### 5. "Messages Not Received"
**Error**: Sent messages don't appear in WhatsApp
**Solution**:
- Check phone number format (include country code)
- Verify phone number is registered with WhatsApp
- Check if you're in the 24-hour messaging window
- Use approved templates outside 24-hour window

### Debug Commands

1. **Check API Configuration**
   ```javascript
   // In your app's debug console
   const client = getDefaultWhatsAppClient();
   const result = await client.testConnection();
   console.log(result);
   ```

2. **Test Template**
   ```javascript
   const response = await client.sendTemplateMessage({
     to: "1234567890",
     templateName: "hello_world",
     templateLanguage: "en"
   });
   console.log(response);
   ```

## 🎉 Production Checklist

Before going live, ensure:

- [ ] **Environment Variables**: All Meta API variables configured
- [ ] **Webhook**: URL accessible and verification working
- [ ] **Templates**: All templates approved by Meta
- [ ] **Phone Number**: Business number verified and active
- [ ] **SSL Certificate**: HTTPS enabled for webhook
- [ ] **Rate Limits**: Understand Meta's rate limiting
- [ ] **Monitoring**: Error logging and alerts configured
- [ ] **Backup Plan**: Alternative communication method ready

## 📊 Monitoring & Analytics

### Track Message Delivery

Monitor these metrics:
- **Sent vs Delivered**: Track delivery rates
- **Template Approval**: Monitor template status
- **Webhook Health**: Ensure webhooks are processing
- **Error Rates**: Monitor API errors and failures

### Database Queries

Check message status:
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN "metaMessageId" IS NOT NULL THEN 1 END) as sent_messages,
  DATE("createdAt") as date
FROM "CommunicationMessage"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

## 🔐 Security Best Practices

1. **Secure Access Tokens**
   - Store in secure environment variables
   - Rotate tokens regularly
   - Use system user tokens for production

2. **Webhook Security**
   - Use strong verify tokens
   - Validate webhook signatures
   - Rate limit webhook endpoints

3. **Phone Number Protection**
   - Validate phone numbers before sending
   - Implement opt-out mechanisms
   - Respect messaging windows

## 📞 Support Resources

- **Meta WhatsApp Documentation**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Business API Guide**: [developers.facebook.com/docs/whatsapp/cloud-api](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Template Guidelines**: [developers.facebook.com/docs/whatsapp/message-templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- **Rate Limits**: [developers.facebook.com/docs/whatsapp/cloud-api/overview](https://developers.facebook.com/docs/whatsapp/cloud-api/overview)

---

**Important**: Meta's WhatsApp Business API has specific requirements and limitations. Always review the latest Meta documentation for the most current guidelines and best practices. 