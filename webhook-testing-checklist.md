# 🔍 WhatsApp Webhook Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Webhook URL configured in Twilio Console
- [ ] Environment variables set correctly
- [ ] Application deployed and running
- [ ] Database accessible

## 📱 Basic Message Testing

### Text Messages
- [ ] Send simple text message: "Hello test"
- [ ] Check logs for: `🔵 WEBHOOK STARTED`
- [ ] Verify: `✅ WEBHOOK SUCCESS`
- [ ] Confirm message appears in chat interface

### Media Messages  
- [ ] Send image message
- [ ] Send document/PDF
- [ ] Send audio message
- [ ] Verify media URLs are captured

## 👥 Contact Recognition Testing

### Known Contacts
- [ ] Send from parent's registered phone number
- [ ] Send from teacher's registered phone number  
- [ ] Send from employee's registered phone number
- [ ] Verify correct participant identification

### Unknown Contacts
- [ ] Send from unregistered number
- [ ] Verify "Unknown Contact" handling
- [ ] Check conversation creation

## 🔧 Error Handling Testing

### Invalid Requests
- [ ] Test malformed webhook payload
- [ ] Test missing required fields
- [ ] Verify proper error responses

### Fallback Testing
- [ ] Temporarily disable primary webhook
- [ ] Send message to trigger fallback
- [ ] Verify fallback processes message
- [ ] Check for "FALLBACK WEBHOOK TRIGGERED" logs

## 📊 Monitoring & Verification

### Application Logs
Look for these log patterns:
```
🔵 WEBHOOK STARTED: [timestamp]
📩 Webhook received body length: [number]
🔐 Verifying Twilio signature...
✅ Twilio signature validated
📋 WEBHOOK PAYLOAD: {...}
✅ Payload validation passed
✅ WEBHOOK SUCCESS: Message processed in [X]ms
📨 Message from [phone] saved to conversation [id]
🟢 WEBHOOK COMPLETED: [timestamp]
```

### Database Verification
- [ ] Check `ChatMessage` table for new records
- [ ] Verify `Conversation` table updates
- [ ] Confirm `twilioMessageId` is populated

### Chat Interface
- [ ] Messages appear in real-time
- [ ] Conversation list updates
- [ ] Unread counts increment
- [ ] Media messages display correctly

## 🚨 Troubleshooting

### Common Issues

**401 Unauthorized**
- ✅ Expected for manual curl tests
- ❌ Problem if coming from Twilio

**No logs appearing**
- Check webhook URL in Twilio Console
- Verify SSL certificate is valid
- Test endpoint accessibility

**Messages not in database**
- Check database connection
- Verify branch configuration
- Check for processing errors

**Participant not recognized**
- Verify phone number format in database
- Check partial matching logic
- Review participant identification logs

## 📈 Performance Testing

### Load Testing
- [ ] Send multiple messages rapidly
- [ ] Monitor processing times
- [ ] Check for timeouts or failures

### Expected Performance
- ✅ Webhook response time: < 5 seconds
- ✅ Message processing: < 2 seconds  
- ✅ Database writes: < 1 second

## 🔍 Real-Time Monitoring

### Production Logs
```bash
# Vercel/Netlify
Check your hosting platform's function logs

# PM2 (if self-hosted)
pm2 logs your-app-name --lines 100 | grep WEBHOOK

# Docker
docker logs your-container-name -f | grep WEBHOOK
```

### Database Monitoring
```sql
-- Check recent messages
SELECT * FROM "ChatMessage" 
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;

-- Check webhook processing
SELECT * FROM "ChatMessage" 
WHERE "twilioMessageId" IS NOT NULL
ORDER BY "createdAt" DESC LIMIT 10;
```

## ✅ Success Criteria

Your webhook is working correctly if:

1. **Logs show successful processing** with timing info
2. **Messages appear in database** within seconds
3. **Chat interface updates** in real-time  
4. **All message types** (text, media) work
5. **Contact recognition** functions properly
6. **Error handling** gracefully handles edge cases

## 🎯 Quick Test Command

Test your webhook is reachable:
```bash
curl -I https://your-domain.com/api/webhooks/twilio
# Should return: HTTP/2 405 (Method Not Allowed for GET)
```

For a complete test, send a WhatsApp message and watch the logs! 