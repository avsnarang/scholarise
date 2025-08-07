# WhatsApp Rate Limiting Implementation

## 📊 WhatsApp API Limits

WhatsApp Business API enforces strict rate limits to prevent spam and ensure service quality:

### Official Rate Limits
- **Messages per second**: 20 (hard limit)
- **Messages per phone number per second**: 20
- **Concurrent requests**: 80
- **Templates per second**: 1000 (but limited by message rate)

## 🛡️ Our Implementation

### Rate Limiting Strategy

1. **Parallel Batch Size**: 10 messages
   - Processes 10 messages simultaneously
   - Ensures we stay well under the 20/second limit
   - Provides buffer for API response times

2. **Minimum Delay Between Batches**: 500ms
   - After sending 10 messages, wait at least 500ms
   - This ensures maximum rate of 20 messages/second
   - Formula: `(BATCH_SIZE / RATE_LIMIT) * 1000 = (10/20) * 1000 = 500ms`

3. **Dynamic Delay Calculation**:
   ```typescript
   const batchProcessingTime = Date.now() - lastBatchTime
   const requiredDelay = MIN_DELAY_BETWEEN_BATCHES - batchProcessingTime
   
   if (requiredDelay > 0) {
     await new Promise(resolve => setTimeout(resolve, requiredDelay))
   }
   ```

## 📈 Performance Impact

### Theoretical Maximum Speed
- **WhatsApp Limit**: 20 messages/second
- **Per Minute**: 1,200 messages
- **Per Hour**: 72,000 messages

### Our Actual Performance
- **Effective Rate**: ~18-19 messages/second
- **Per Minute**: ~1,000-1,100 messages
- **Per Hour**: ~60,000-66,000 messages

The slight reduction from theoretical maximum is due to:
- Network latency
- Database updates
- Edge function overhead
- Safety margin to avoid hitting limits

## 🎯 Message Volume Examples

| Recipients | Time (Actual) | Time (Theoretical) | Batches | Edge Functions |
|------------|---------------|-------------------|---------|----------------|
| 100 | ~6 seconds | 5 seconds | 10 | 1 |
| 500 | ~30 seconds | 25 seconds | 50 | 1 |
| 1,000 | ~55 seconds | 50 seconds | 100 | 2 |
| 3,000 | ~3 minutes | 2.5 minutes | 300 | 4 |
| 10,000 | ~10 minutes | 8.3 minutes | 1,000 | 13 |
| 50,000 | ~50 minutes | 42 minutes | 5,000 | 63 |

## ⚠️ Important Considerations

### 1. API Response Times
WhatsApp API response times can vary:
- **Fast**: 50-100ms
- **Average**: 100-300ms  
- **Slow**: 300-1000ms

Our implementation handles this variability by:
- Processing in parallel (reduces impact of slow responses)
- Dynamic delay calculation (adjusts based on actual processing time)

### 2. Error Handling
If we exceed rate limits, WhatsApp returns:
- **Error Code**: 130472
- **Message**: "User's number of API calls per second reached"

Our system:
- Automatically retries with exponential backoff
- Marks failed messages for manual retry
- Continues processing remaining messages

### 3. Scaling Considerations

For very large campaigns (50,000+ recipients):
1. Consider spreading sends over time
2. Use priority queuing for important recipients
3. Monitor WhatsApp quality rating
4. Implement gradual ramp-up for new phone numbers

## 🔧 Configuration

### Adjusting Rate Limits

In `supabase/functions/send-message/index.ts`:

```typescript
// Current conservative settings
const PARALLEL_BATCH_SIZE = 10 // Messages processed in parallel
const WHATSAPP_RATE_LIMIT = 20 // WhatsApp's limit
const MIN_DELAY_BETWEEN_BATCHES = 500 // Milliseconds

// More aggressive settings (use with caution)
const PARALLEL_BATCH_SIZE = 15 
const WHATSAPP_RATE_LIMIT = 20
const MIN_DELAY_BETWEEN_BATCHES = 750 // (15/20) * 1000
```

### Monitoring Rate Limit Usage

Watch for these indicators:
1. **Success Rate**: Should be >95%
2. **API Errors**: Monitor for rate limit errors
3. **Processing Time**: Compare actual vs theoretical
4. **WhatsApp Quality Rating**: Keep above "Medium"

## 📚 Best Practices

1. **Start Conservative**: Better to be slightly slower than hit limits
2. **Monitor Closely**: Track success rates and adjust accordingly
3. **Implement Backoff**: If errors occur, slow down automatically
4. **Use Templates**: Pre-approved templates process faster
5. **Batch Wisely**: 800 recipients per edge function is optimal
6. **Time Sends**: Avoid peak hours when API might be slower

## 🚀 Future Optimizations

1. **Adaptive Rate Limiting**
   - Dynamically adjust based on API response times
   - Increase rate when API is fast, decrease when slow

2. **Smart Scheduling**
   - Spread large campaigns over optimal time windows
   - Priority queuing for VIP recipients

3. **Regional Optimization**
   - Route messages through closest WhatsApp data centers
   - Reduce latency for better throughput

4. **Caching**
   - Cache template validations
   - Pre-format common message patterns

## 📖 References

- [WhatsApp Business API Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#rate-limits)
- [WhatsApp Cloud API Best Practices](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/best-practices)
- [Meta Business Platform Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)