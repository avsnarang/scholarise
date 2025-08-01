/**
 * Rate Limiter for WhatsApp Cloud API
 * Implements Meta's rate limiting requirements:
 * - 1000 messages per second per phone number
 * - 80 requests per second per app
 * - Burst protection and exponential backoff
 */

export interface RateLimitConfig {
  messagesPerSecond: number;
  requestsPerSecond: number;
  burstAllowance: number;
  maxRetries: number;
  baseDelay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  delay: number;
  remainingRequests: number;
  resetTime: number;
}

export class WhatsAppRateLimiter {
  private messageTokens: number;
  private requestTokens: number;
  private lastMessageRefill: number;
  private lastRequestRefill: number;
  private config: RateLimitConfig;
  private phoneNumberQueues = new Map<string, number[]>();

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      messagesPerSecond: 20, // Conservative rate (Meta allows 1000/sec)
      requestsPerSecond: 50,  // Conservative rate (Meta allows 80/sec)
      burstAllowance: 5,      // Allow small bursts
      maxRetries: 3,
      baseDelay: 200,         // Base delay between messages in ms
      ...config
    };

    this.messageTokens = this.config.messagesPerSecond;
    this.requestTokens = this.config.requestsPerSecond;
    this.lastMessageRefill = Date.now();
    this.lastRequestRefill = Date.now();
  }

  /**
   * Check if a message can be sent and apply rate limiting
   */
  async checkMessageLimit(phoneNumberId: string): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Refill tokens based on elapsed time
    this.refillTokens(now);
    
    // Check per-phone-number rate limiting
    const phoneQueue = this.phoneNumberQueues.get(phoneNumberId) || [];
    const oneSecondAgo = now - 1000;
    
    // Clean old entries
    const recentMessages = phoneQueue.filter(timestamp => timestamp > oneSecondAgo);
    this.phoneNumberQueues.set(phoneNumberId, recentMessages);
    
    // Check if we're hitting per-phone-number limits
    if (recentMessages.length >= this.config.messagesPerSecond) {
      return {
        allowed: false,
        delay: 1000,
        remainingRequests: 0,
        resetTime: Math.max(...recentMessages) + 1000
      };
    }
    
    // Check global message tokens
    if (this.messageTokens < 1) {
      const waitTime = 1000 / this.config.messagesPerSecond;
      return {
        allowed: false,
        delay: waitTime,
        remainingRequests: Math.floor(this.messageTokens),
        resetTime: now + waitTime
      };
    }
    
    // Consume tokens
    this.messageTokens -= 1;
    recentMessages.push(now);
    this.phoneNumberQueues.set(phoneNumberId, recentMessages);
    
    return {
      allowed: true,
      delay: this.config.baseDelay,
      remainingRequests: Math.floor(this.messageTokens),
      resetTime: now + (1000 / this.config.messagesPerSecond)
    };
  }

  /**
   * Check if an API request can be made
   */
  async checkRequestLimit(): Promise<RateLimitResult> {
    const now = Date.now();
    this.refillTokens(now);
    
    if (this.requestTokens < 1) {
      const waitTime = 1000 / this.config.requestsPerSecond;
      return {
        allowed: false,
        delay: waitTime,
        remainingRequests: Math.floor(this.requestTokens),
        resetTime: now + waitTime
      };
    }
    
    this.requestTokens -= 1;
    
    return {
      allowed: true,
      delay: 0,
      remainingRequests: Math.floor(this.requestTokens),
      resetTime: now + (1000 / this.config.requestsPerSecond)
    };
  }

  /**
   * Apply exponential backoff for retries
   */
  calculateBackoffDelay(attempt: number): number {
    return Math.min(
      this.config.baseDelay * Math.pow(2, attempt),
      30000 // Max 30 seconds
    );
  }

  /**
   * Refill token buckets based on elapsed time
   */
  private refillTokens(now: number): void {
    // Refill message tokens
    const messageElapsed = (now - this.lastMessageRefill) / 1000;
    if (messageElapsed > 0) {
      this.messageTokens = Math.min(
        this.config.messagesPerSecond + this.config.burstAllowance,
        this.messageTokens + (messageElapsed * this.config.messagesPerSecond)
      );
      this.lastMessageRefill = now;
    }
    
    // Refill request tokens
    const requestElapsed = (now - this.lastRequestRefill) / 1000;
    if (requestElapsed > 0) {
      this.requestTokens = Math.min(
        this.config.requestsPerSecond + this.config.burstAllowance,
        this.requestTokens + (requestElapsed * this.config.requestsPerSecond)
      );
      this.lastRequestRefill = now;
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    messageTokens: number;
    requestTokens: number;
    phoneNumberQueues: Record<string, number>;
  } {
    const now = Date.now();
    this.refillTokens(now);
    
    const phoneNumberStatus: Record<string, number> = {};
    this.phoneNumberQueues.forEach((queue, phoneId) => {
      phoneNumberStatus[phoneId] = queue.length;
    });
    
    return {
      messageTokens: Math.floor(this.messageTokens),
      requestTokens: Math.floor(this.requestTokens),
      phoneNumberQueues: phoneNumberStatus
    };
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  reset(): void {
    const now = Date.now();
    this.messageTokens = this.config.messagesPerSecond;
    this.requestTokens = this.config.requestsPerSecond;
    this.lastMessageRefill = now;
    this.lastRequestRefill = now;
    this.phoneNumberQueues.clear();
  }
}

// Global rate limiter instance
let globalRateLimiter: WhatsAppRateLimiter;

/**
 * Get the global rate limiter instance
 */
export function getWhatsAppRateLimiter(): WhatsAppRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new WhatsAppRateLimiter();
  }
  return globalRateLimiter;
}

/**
 * Utility function to apply rate limiting with automatic retry
 */
export async function withRateLimit<T>(
  phoneNumberId: string,
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const rateLimiter = getWhatsAppRateLimiter();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check message rate limit
    const messageLimit = await rateLimiter.checkMessageLimit(phoneNumberId);
    if (!messageLimit.allowed) {
      if (attempt === maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
      }
      
      const delay = attempt === 0 ? messageLimit.delay : rateLimiter.calculateBackoffDelay(attempt);
      console.log(`⏱️  Rate limited, waiting ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    // Check API request rate limit
    const requestLimit = await rateLimiter.checkRequestLimit();
    if (!requestLimit.allowed) {
      if (attempt === maxRetries) {
        throw new Error(`API rate limit exceeded after ${maxRetries} attempts`);
      }
      
      const delay = rateLimiter.calculateBackoffDelay(attempt);
      console.log(`⏱️  API rate limited, waiting ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    try {
      // Apply base delay for smooth operation
      if (messageLimit.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, messageLimit.delay));
      }
      
      return await operation();
    } catch (error: any) {
      // Check if it's a rate limit error from Meta
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = rateLimiter.calculateBackoffDelay(attempt + 1);
        console.log(`⏱️  Meta API rate limit error, backing off ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-rate-limit error, throw immediately
      throw error;
    }
  }
  
  throw new Error('Unexpected end of retry loop');
}

/**
 * Batch operations with rate limiting
 */
export async function processBatchWithRateLimit<T, R>(
  phoneNumberId: string,
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number, result: R) => void
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];
  
  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  console.log(`📦 Processing ${items.length} items in ${batches.length} batches of ${batchSize}`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    if (!batch) continue;
    
    console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);
    
    for (const item of batch) {
      try {
        const result = await withRateLimit(phoneNumberId, () => processor(item));
        results.push(result);
        
        if (onProgress) {
          onProgress(results.length, items.length, result);
        }
      } catch (error) {
        console.error(`❌ Failed to process item:`, error);
        // Continue with next item
      }
    }
    
    // Inter-batch delay
    if (batchIndex < batches.length - 1) {
      const interBatchDelay = 1000; // 1 second between batches
      console.log(`⏸️  Inter-batch delay: ${interBatchDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, interBatchDelay));
    }
  }
  
  return results;
} 