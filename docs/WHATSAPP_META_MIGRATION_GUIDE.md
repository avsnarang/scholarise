# WhatsApp Migration: From Twilio to Meta's WhatsApp Business API

This guide will help you migrate your WhatsApp messaging from Twilio's API to Meta's WhatsApp Business API directly.

## 🎯 Benefits of Migrating to Meta's API

- **Lower Costs**: Meta's pricing is typically more competitive than Twilio's markup
- **Direct Control**: Access to Meta's latest features without waiting for Twilio integration
- **Better Rate Limits**: Higher message throughput with Meta's native API
- **Template Management**: Direct access to Meta's template approval system
- **Enhanced Features**: Access to advanced messaging features like interactive messages

## 📋 Prerequisites

Before starting the migration, ensure you have:

1. **Meta Business Account** with WhatsApp Business API access
2. **WhatsApp Business Account** verified and approved
3. **System Admin Access** to update environment variables
4. **Template Backup** of existing Twilio templates

## 🚀 Migration Steps

### Step 1: Set Up Meta WhatsApp Business API

1. **Create Meta Business Account**
   - Go to [Meta Business](https://business.facebook.com)
   - Create or use existing business account
   - Verify your business information

2. **Set Up WhatsApp Business API**
   - Navigate to WhatsApp Business API section
   - Add your phone number
   - Complete verification process
   - Note down your **Phone Number ID** and **Business Account ID**

3. **Generate Access Token**
   - Go to [Meta Developers](https://developers.facebook.com)
   - Create a new app or use existing one
   - Add WhatsApp Business product
   - Generate a permanent access token
   - Note down your **Access Token**

### Step 2: Configure Environment Variables

Add the following environment variables to your deployment:

```bash
# Meta WhatsApp Business API Configuration
META_WHATSAPP_ACCESS_TOKEN=your_access_token_here
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
META_WHATSAPP_API_VERSION=v21.0
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here

# Keep Twilio variables for gradual migration (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_token_here
TWILIO_WHATSAPP_FROM=your_twilio_number_here
```

### Step 3: Set Up Webhooks

1. **Configure Meta Webhook**
   - In your Meta app, go to WhatsApp > Configuration
   - Set webhook URL: `https://your-domain.com/api/webhooks/meta-whatsapp`
   - Use the verify token you set in `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to `messages` events

2. **Test Webhook Connection**
   - Send a test message to your WhatsApp Business number
   - Check logs to ensure webhook is receiving messages

### Step 4: Update Database Schema

Run the database migration to add Meta API support:

```sql
-- Apply the Meta WhatsApp support migration
\i prisma/migrations/manual/add_meta_whatsapp_support.sql
```

Or if using Prisma:

```bash
npx prisma db push
```

### Step 5: Migrate Templates

#### Option A: Manual Template Migration

1. **Export Existing Templates**
   ```sql
   SELECT id, name, twilioContentSid, templateBody, templateVariables 
   FROM "WhatsAppTemplate" 
   WHERE twilioContentSid IS NOT NULL;
   ```

2. **Create Templates in Meta**
   - Go to [Meta Business Manager](https://business.facebook.com)
   - Navigate to WhatsApp Manager > Message Templates
   - Create new templates based on your existing ones
   - Note the template names and approval status

3. **Update Database Records**
   ```sql
   UPDATE "WhatsAppTemplate" 
   SET 
     metaTemplateName = 'your_meta_template_name',
     metaTemplateLanguage = 'en',
     metaTemplateStatus = 'APPROVED'
   WHERE id = 'your_template_id';
   ```

#### Option B: Automated Template Sync (Coming Soon)

The system will include automatic template synchronization in a future update.

### Step 6: Update Communication Settings

1. **Navigate to Communication Settings**
   - Go to `/communication/settings` in your application
   - Switch to the "Meta API Configuration" tab

2. **Configure Meta Settings**
   - Access Token: Your Meta WhatsApp access token
   - Phone Number ID: Your WhatsApp Business phone number ID
   - Business Account ID: Your Meta Business account ID
   - API Version: v21.0 (or latest)
   - Webhook Verify Token: Your webhook verification token
   - Set "Meta API Active" to `true`

3. **Test Connection**
   - Click "Test Meta Connection" button
   - Verify successful authentication

### Step 7: Gradual Migration

The system supports both APIs simultaneously, allowing for gradual migration:

1. **Phase 1: Parallel Running**
   - Keep both Twilio and Meta APIs active
   - New messages will use Meta API (auto-detected)
   - Existing conversations continue with their original provider

2. **Phase 2: Template Migration**
   - Migrate templates one by one
   - Test each template thoroughly
   - Update template configurations

3. **Phase 3: Full Migration**
   - Disable Twilio API: Set `twilioIsActive = false`
   - Remove Twilio environment variables
   - Monitor for any issues

## 🧪 Testing the Migration

### 1. Test Connection

```bash
# Check API connectivity
curl -X GET "https://your-domain.com/api/debug/whatsapp-connection"
```

### 2. Test Message Sending

1. **Send Test Text Message**
   - Go to `/communication/send`
   - Create a test message
   - Send to a small group first

2. **Send Test Template Message**
   - Select a migrated template
   - Test with template variables
   - Verify message formatting

### 3. Test Webhook Reception

1. **Send message to your WhatsApp Business number**
2. **Check conversation in `/chat`**
3. **Verify message appears correctly**

## 📊 Monitoring and Analytics

### Provider Detection

Check which API is being used:

```sql
SELECT 
  provider,
  COUNT(*) as message_count,
  DATE(created_at) as date
FROM (
  SELECT 
    CASE 
      WHEN "metaMessageId" IS NOT NULL THEN 'META'
      WHEN "twilioMessageId" IS NOT NULL THEN 'TWILIO'
      ELSE 'UNKNOWN'
    END as provider,
    "createdAt"
  FROM "CommunicationMessage"
  WHERE "createdAt" >= NOW() - INTERVAL '7 days'
) provider_stats
GROUP BY provider, DATE(created_at)
ORDER BY date DESC;
```

### Template Usage Analysis

```sql
SELECT 
  t.name,
  t."metaTemplateName",
  t."twilioContentSid",
  COUNT(cm.id) as usage_count
FROM "WhatsAppTemplate" t
LEFT JOIN "CommunicationMessage" cm ON t.id = cm."templateId"
WHERE cm."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name, t."metaTemplateName", t."twilioContentSid"
ORDER BY usage_count DESC;
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid Access Token"
- **Solution**: Regenerate access token in Meta Developer Console
- **Check**: Token permissions include WhatsApp Business API access

#### 2. "Phone Number Not Found"
- **Solution**: Verify Phone Number ID is correct
- **Check**: Phone number is verified in Meta Business Manager

#### 3. "Template Not Found"
- **Solution**: Ensure template is approved in Meta
- **Check**: Template name matches exactly (case-sensitive)

#### 4. "Webhook Verification Failed"
- **Solution**: Check webhook verify token matches environment variable
- **Check**: Webhook URL is accessible and using HTTPS

### Debug Commands

1. **Check API Configuration**
   ```sql
   SELECT * FROM check_whatsapp_api_configuration('your_branch_id');
   ```

2. **View Provider Configuration**
   ```sql
   SELECT * FROM "BranchWhatsAppConfiguration";
   ```

3. **Test Template Migration**
   ```sql
   SELECT migrate_twilio_template_to_meta(
     'template_id', 
     'meta_template_name', 
     'en'
   );
   ```

## 📝 Environment Variable Reference

### Required Meta Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `META_WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp access token | `EAAxxxxxx...` |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Phone number ID | `1234567890123456` |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | Business account ID | `1234567890123456` |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification token | `your_secure_token` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `META_WHATSAPP_API_VERSION` | Meta Graph API version | `v21.0` |

## 📞 Support and Migration Assistance

### Pre-Migration Checklist

- [ ] Meta Business Account created and verified
- [ ] WhatsApp Business number verified
- [ ] Access token generated with correct permissions
- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Webhook URL configured and tested
- [ ] Templates exported from Twilio
- [ ] Templates recreated in Meta (if manual migration)

### Post-Migration Checklist

- [ ] All templates migrated and tested
- [ ] Message sending works correctly
- [ ] Webhook receiving works correctly
- [ ] Analytics show Meta provider usage
- [ ] Twilio API disabled (when ready)
- [ ] Cost monitoring updated for new provider

### Rollback Plan

If issues occur, you can quickly rollback:

1. **Disable Meta API**
   ```sql
   UPDATE "CommunicationSettings" 
   SET "metaIsActive" = false 
   WHERE "branchId" = 'your_branch_id';
   ```

2. **Re-enable Twilio**
   ```sql
   UPDATE "CommunicationSettings" 
   SET "twilioIsActive" = true 
   WHERE "branchId" = 'your_branch_id';
   ```

3. **Restart Application** (if environment variables changed)

## 🎉 Migration Complete!

Once migration is complete, you should see:

- ✅ Messages sent via Meta API (check provider in logs)
- ✅ Lower messaging costs
- ✅ Improved delivery rates
- ✅ Access to Meta's latest features
- ✅ Direct template management in Meta Business Manager

For additional support, please refer to:
- [Meta WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business Platform Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- Your internal system documentation

---

**Note**: This migration maintains backward compatibility. You can run both APIs simultaneously during the transition period. 