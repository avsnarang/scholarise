# WhatsApp Messaging Troubleshooting Guide

## "Failed to send message: Authenticate" Error

This error occurs when trying to send WhatsApp messages through the 24-hour window but the Twilio credentials are not properly configured in the production environment.

### Root Cause

The Twilio environment variables are either:
- Not set in production
- Set to empty strings (which become `undefined`)
- Set with incorrect values
- Missing proper format validation

### Immediate Solution

1. **Check Environment Variables**
   
   Ensure these environment variables are set in your production deployment:
   
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

2. **Validate Environment Variables**
   
   Run the diagnostic tool at `/communication/settings` and click "Test Connection" to check:
   - ✅ TWILIO_ACCOUNT_SID is present and starts with "AC"
   - ✅ TWILIO_AUTH_TOKEN is present and is 32 characters long
   - ✅ TWILIO_WHATSAPP_FROM is present and formatted correctly

3. **Common Issues & Solutions**

   | Issue | Solution |
   |-------|----------|
   | `TWILIO_ACCOUNT_SID is missing` | Add the Account SID from your Twilio Console |
   | `TWILIO_AUTH_TOKEN is missing` | Add the Auth Token from your Twilio Console |
   | `Invalid Account SID format` | Ensure it starts with "AC" |
   | `Auth Token should be 32 characters` | Verify you copied the complete token |
   | `Authentication failed (401)` | Verify credentials are correct and active |

### Step-by-Step Fix

#### Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Account → API keys & tokens
3. Copy your Account SID (starts with AC...)
4. Copy or regenerate your Auth Token (32 characters)
5. Go to Messaging → Try it out → Send a WhatsApp message
6. Copy your WhatsApp Business number (e.g., whatsapp:+14155238886)

#### Step 2: Set Environment Variables

**For Vercel:**
```bash
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN  
vercel env add TWILIO_WHATSAPP_FROM
```

**For AWS/Docker:**
```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

**For Railway/Heroku:**
Add through the dashboard or CLI:
```bash
# Railway
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Heroku  
heroku config:set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 3: Verify Configuration

1. Redeploy your application
2. Go to `/communication/settings`
3. Click "Test Connection"
4. Check for success message

#### Step 4: Test WhatsApp Messaging

1. Go to `/communication/chat`
2. Select a conversation within 24-hour window
3. Send a test message
4. Verify message sends successfully

### Prevention

1. **Environment Variable Validation**
   - The system now validates environment variables at startup
   - Missing credentials will show clear error messages

2. **Monitoring**
   - Set up alerts for WhatsApp messaging failures
   - Monitor the Communication Logs for authentication errors

3. **Documentation**
   - Keep Twilio credentials documented in your team's secure password manager
   - Document the deployment process including environment variable setup

### Debug Tools

#### 1. Connection Test
Navigate to `/communication/settings` and use the "Test Connection" button to diagnose issues.

#### 2. Environment Debug
Click "Debug Environment" to see which variables are missing.

#### 3. Console Logs
Check the application logs for detailed error messages:
- `🚨 CRITICAL: Missing Twilio credentials in production environment`
- `❌ Failed to create default Twilio client`
- `💡 Solution: Configure the following environment variables`

#### 4. API Response Inspection
Enable detailed logging by checking the Network tab in browser dev tools when testing connections.

### Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 20003 | Authentication Error | Check Account SID and Auth Token |
| 21211 | Invalid Phone Number | Verify phone number format |
| 21408 | Permission Denied | Check WhatsApp Business API permissions |
| 63016 | Phone not registered | Number not registered with WhatsApp Business |

### Support

If issues persist after following this guide:

1. Check the Communication Logs at `/communication/history`
2. Review the webhook status at `/api/webhooks/health`
3. Verify Twilio account status in Twilio Console
4. Contact your system administrator with the specific error messages

### Related Documentation

- [Twilio WhatsApp API Documentation](https://www.twilio.com/docs/whatsapp)
- [Environment Variable Configuration](./DEPLOYMENT.md)
- [Communication System Overview](./COMMUNICATION_SYSTEM.md) 