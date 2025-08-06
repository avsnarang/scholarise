# WhatsApp Webhook Monitoring Guide 🔍

## ✅ **Issue Resolved!**

The automatic template status updates are now working. The problem was a **database type conversion issue** in the webhook handler.

### 🐛 **What Was Wrong**
- Meta sends template IDs as **integers** (e.g., `1056777666625539`)
- Database schema expects template IDs as **strings**
- Webhook handler was trying to save integer directly → **Type mismatch error**
- Templates were stuck at "PENDING" status despite Meta approval

### 🛠️ **Fix Applied**
Updated webhook handler to convert integer to string:
```typescript
// Before (causing errors):
metaTemplateId: message_template_id || template.metaTemplateId,

// After (working correctly):
metaTemplateId: message_template_id ? String(message_template_id) : template.metaTemplateId,
```

## 📡 **How to Monitor Webhooks**

### 1. **Real-time Webhook Logs**
Check server logs for webhook activity:
```bash
# In development
npm run dev

# Look for these log patterns:
🔵 META WEBHOOK STARTED [webhook_id]
📄 Processing template status update: APPROVED/REJECTED
✅ Template updated in database [update_id]
🟢 META WEBHOOK COMPLETED
```

### 2. **Database Monitoring**
Run the webhook debug toolkit:
```bash
npx tsx scripts/webhook-debug-toolkit.ts
```

This shows:
- Recent webhook activity logs
- Template status changes
- Webhook endpoint accessibility
- Configuration status

### 3. **Template Status Verification**
Check template status in the UI:
- Go to `/communication/templates`
- Look for **real-time status badges**:
  - 🟡 **PENDING** - Submitted, awaiting Meta review
  - 🟢 **APPROVED** - Ready to use
  - 🔴 **REJECTED** - Needs fixes (with reason shown)

### 4. **Manual Webhook Testing**
Test webhook simulation:
```bash
curl -X POST "http://localhost:3000/api/whatsapp/test" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "webhook_simulation",
    "type": "template_status", 
    "status": "APPROVED",
    "templateId": "123456789",
    "templateName": "your_template_name"
  }'
```

## 🔧 **Webhook Configuration**

### Meta Developer Console Setup
1. **App Dashboard** → WhatsApp → Configuration
2. **Webhook URL**: `https://scholarise.tsh.edu.in/api/webhooks/meta-whatsapp`
3. **Verify Token**: `UG2Tu6x4xxOvR6etzT2` (from env)
4. **Subscriptions**: ✅ `message_template_status_update`

### Environment Variables
```bash
✅ META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=UG2Tu6x4xxOvR6etzT2
✅ META_WHATSAPP_APP_SECRET=[32-char secret]
✅ NEXT_PUBLIC_APP_URL=https://scholarise.tsh.edu.in
```

## 📋 **Template Lifecycle**

1. **Create Template** → Status: `PENDING`
2. **Submit to Meta** → Webhook URL configured
3. **Meta Review** → Automatic webhook sent
4. **Status Update** → Real-time UI update
5. **Ready to Use** → Status: `APPROVED`

## 🚨 **Troubleshooting**

### If Templates Still Don't Auto-Update:

1. **Check Webhook URL is Public**
   ```bash
   curl -I https://scholarise.tsh.edu.in/api/webhooks/meta-whatsapp
   # Should return 200 OK
   ```

2. **Verify Meta Subscription**
   - Go to Meta Developer Console
   - Check webhook subscriptions include `message_template_status_update`

3. **Monitor Server Logs**
   ```bash
   # Look for webhook errors
   grep -i "webhook.*error" logs/
   ```

4. **Test Webhook Manually**
   ```bash
   npx tsx scripts/webhook-debug-toolkit.ts
   ```

5. **Force Sync if Needed**
   - Go to `/communication/templates`
   - Click "Sync Templates" button
   - This manually pulls latest status from Meta

## 🎯 **Expected Behavior Now**

✅ **Automatic Updates**: Templates update status within minutes of Meta approval/rejection  
✅ **Real-time Notifications**: Toast notifications appear when status changes  
✅ **No Manual Sync**: Sync button only needed for initial template import  
✅ **Error Handling**: Clear error messages if webhook delivery fails  

---

**Webhook monitoring is now active and working correctly! 🎉**