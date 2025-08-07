/**
 * Batch Message Sender Utility
 * 
 * This utility splits large recipient lists into manageable batches
 * to work within Supabase Edge Function timeout limits.
 * 
 * With parallel processing, each edge function can handle ~1,000 recipients.
 * This utility ensures reliable delivery to 3,000+ recipients.
 */

import { triggerMessageJob } from './edge-function-client';

interface BatchConfig {
  maxRecipientsPerBatch: number;  // Default: 800 (conservative for safety)
  delayBetweenBatches: number;     // Default: 2000ms
  onBatchProgress?: (batchIndex: number, totalBatches: number, processedRecipients: number) => void;
}

interface MessageJobPayload {
  jobId: string;
  messageId: string;
  templateData?: any;
  recipients: Array<{
    messageRecipientId: string;
    id: string;
    name: string;
    phone: string;
    type: string;
    additional?: any;
  }>;
  templateParameters?: Record<string, string>;
  templateDataMappings?: Record<string, { dataField: string; fallbackValue: string }>;
  whatsappConfig: {
    accessToken: string;
    phoneNumberId: string;
    apiVersion?: string;
  };
  dryRun?: boolean;
}

/**
 * Splits recipients into batches and triggers separate edge function invocations
 * 
 * @param payload - The complete message job payload
 * @param config - Batch processing configuration
 * @returns Promise that resolves when all batches are triggered
 */
export async function sendMessageInBatches(
  payload: MessageJobPayload,
  config: Partial<BatchConfig> = {}
): Promise<{
  totalBatches: number;
  totalRecipients: number;
  batchesTriggered: number;
  estimatedTime: string;
}> {
  const {
    maxRecipientsPerBatch = 800,  // Conservative limit for safety
    delayBetweenBatches = 2000,   // 2 seconds between batches
    onBatchProgress
  } = config;

  const { recipients, ...restPayload } = payload;
  const totalRecipients = recipients.length;
  
  // Calculate batches
  const totalBatches = Math.ceil(totalRecipients / maxRecipientsPerBatch);
  
  console.log(`📦 Splitting ${totalRecipients} recipients into ${totalBatches} batches`);
  console.log(`📊 Batch size: ${maxRecipientsPerBatch} recipients per batch`);
  
  // Estimate completion time
  const estimatedSecondsPerBatch = 120; // Conservative estimate
  const estimatedTotalSeconds = (totalBatches * estimatedSecondsPerBatch) + 
                                ((totalBatches - 1) * delayBetweenBatches / 1000);
  const estimatedMinutes = Math.ceil(estimatedTotalSeconds / 60);
  
  console.log(`⏱️ Estimated completion time: ${estimatedMinutes} minutes`);
  
  let batchesTriggered = 0;
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * maxRecipientsPerBatch;
    const endIdx = Math.min(startIdx + maxRecipientsPerBatch, totalRecipients);
    const batchRecipients = recipients.slice(startIdx, endIdx);
    
    console.log(`🚀 Triggering batch ${batchIndex + 1}/${totalBatches} (recipients ${startIdx + 1}-${endIdx})`);
    
    try {
      // Create a unique job ID for this batch
      const batchJobId = `${payload.jobId}_batch_${batchIndex + 1}`;
      
      // Trigger edge function for this batch
      await triggerMessageJob({
        ...restPayload,
        jobId: batchJobId,
        recipients: batchRecipients,
        // Add batch metadata for tracking
        batchInfo: {
          batchIndex: batchIndex + 1,
          totalBatches,
          parentJobId: payload.jobId,
          recipientRange: `${startIdx + 1}-${endIdx}`
        }
      } as any);
      
      batchesTriggered++;
      
      // Report progress
      if (onBatchProgress) {
        onBatchProgress(batchIndex + 1, totalBatches, endIdx);
      }
      
      // Add delay between batches (except for the last one)
      if (batchIndex < totalBatches - 1) {
        console.log(`⏸️ Waiting ${delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
      
    } catch (error) {
      console.error(`❌ Failed to trigger batch ${batchIndex + 1}:`, error);
      // Continue with other batches even if one fails
    }
  }
  
  return {
    totalBatches,
    totalRecipients,
    batchesTriggered,
    estimatedTime: `${estimatedMinutes} minutes`
  };
}

/**
 * Helper function to check if batch processing is needed
 * 
 * @param recipientCount - Number of recipients
 * @returns Boolean indicating if batch processing should be used
 */
export function shouldUseBatchProcessing(recipientCount: number): boolean {
  // With parallel processing, we can handle up to ~1000 recipients per function
  // Use batch processing for anything over 800 to be safe
  return recipientCount > 800;
}

/**
 * Helper function to estimate processing time
 * 
 * @param recipientCount - Number of recipients
 * @param useParallelProcessing - Whether parallel processing is enabled
 * @returns Estimated time in minutes
 */
export function estimateProcessingTime(
  recipientCount: number, 
  useParallelProcessing: boolean = true
): number {
  if (useParallelProcessing) {
    // With parallel processing and WhatsApp rate limit (20 messages/second)
    // We process 10 messages in parallel, then wait 500ms
    // Effective rate: ~20 messages per second = 1200 messages per minute
    // Adding overhead and edge function startup time
    return Math.ceil(recipientCount / 1000);
  } else {
    // Sequential processing (old method)
    // Approximately 30-50 messages per minute
    return Math.ceil(recipientCount / 40);
  }
}

/**
 * Usage example:
 * 
 * ```typescript
 * import { sendMessageInBatches, shouldUseBatchProcessing } from './batch-message-sender';
 * 
 * // In your API endpoint or message sending logic:
 * if (shouldUseBatchProcessing(recipients.length)) {
 *   const result = await sendMessageInBatches(
 *     payload,
 *     {
 *       maxRecipientsPerBatch: 800,
 *       onBatchProgress: (batch, total, processed) => {
 *         console.log(`Progress: Batch ${batch}/${total}, ${processed} recipients processed`);
 *       }
 *     }
 *   );
 *   
 *   console.log(`Triggered ${result.batchesTriggered} batches for ${result.totalRecipients} recipients`);
 * } else {
 *   // Send normally for smaller recipient lists
 *   await triggerMessageJob(payload);
 * }
 * ```
 */