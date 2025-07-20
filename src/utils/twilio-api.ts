import { env } from "@/env.js";
import { formatDistanceToNow } from "date-fns";

console.log('🔧 Twilio API utility loaded');

// Twilio API Request/Response interfaces
export interface TwilioSendTemplateMessageRequest {
  from: string;
  to: string;
  contentSid: string;
  contentVariables?: string; // JSON string of variables
}

export interface TwilioSendTextMessageRequest {
  from: string;
  to: string;
  body: string;
}

export interface TwilioSendMessageResponse {
  sid: string;
  status: string;
  error_code?: string;
  error_message?: string;
  to: string;
  from: string;
  body?: string;
  price?: string;
  price_unit?: string;
}

export interface TwilioTemplate {
  sid: string;
  friendly_name: string;
  language: string;
  status: string;
  variables: Record<string, string>;
  types: {
    [key: string]: string;
  };
}

export interface TwilioApiResponse<T> {
  result: boolean;
  data?: T;
  error?: string;
  info?: string;
}

export interface TwilioValidatedNumber {
  original: string;
  formatted: string;
  isValid: boolean;
}

// Utility functions
export function formatTemplateVariables(
  template: TwilioTemplate,
  parameters: Record<string, string>
): string {
  // Convert parameters object to JSON string format expected by Twilio
  const variables: Record<string, string> = {};
  
  // Map the parameters to the template variables
  Object.keys(template.variables || {}).forEach((key, index) => {
    const paramValue = parameters[key] || parameters[`${index + 1}`] || '';
    variables[`${index + 1}`] = paramValue;
  });
  
  return JSON.stringify(variables);
}

export function createBroadcastName(title: string): string {
  return title.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

export class TwilioApiClient {
  private twilioClient: any;
  private fromNumber: string;
  
  constructor(
    accountSid?: string,
    authToken?: string,
    fromNumber?: string
  ) {
    // Use provided credentials or fall back to environment variables
    const sid = accountSid || env.TWILIO_ACCOUNT_SID;
    const token = authToken || env.TWILIO_AUTH_TOKEN;
    this.fromNumber = fromNumber || env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    
    console.log('Twilio Client Initialization:');
    console.log('- Account SID provided:', !!sid, sid ? `${sid.substring(0, 8)}...` : 'missing');
    console.log('- Auth Token provided:', !!token, token ? 'yes' : 'missing');
    console.log('- From Number:', this.fromNumber);
    console.log('- Environment variables:', {
      TWILIO_ACCOUNT_SID: !!env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!env.TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM: !!env.TWILIO_WHATSAPP_FROM
    });
    
    // Enhanced validation for production environments
    if (!sid || !token) {
      const missingVars = [];
      if (!sid) missingVars.push('TWILIO_ACCOUNT_SID');
      if (!token) missingVars.push('TWILIO_AUTH_TOKEN');
      
      const errorMessage = `Twilio credentials are required for WhatsApp messaging. Missing: ${missingVars.join(', ')}. Please configure these environment variables in your production deployment.`;
      
      // In production, this is a critical error
      if (env.NODE_ENV === 'production') {
        console.error('🚨 CRITICAL: Missing Twilio credentials in production environment');
        console.error('Required environment variables:', {
          TWILIO_ACCOUNT_SID: 'Your Twilio Account SID (starts with AC)',
          TWILIO_AUTH_TOKEN: 'Your Twilio Auth Token',
          TWILIO_WHATSAPP_FROM: 'Your WhatsApp Business number (e.g., whatsapp:+14155238886)'
        });
      }
      
      throw new Error(errorMessage);
    }
    
    // Validate Account SID format
    if (!sid.startsWith('AC')) {
      throw new Error(`Invalid Twilio Account SID format. Expected format: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx, got: ${sid.substring(0, 8)}...`);
    }
    
    // Validate Auth Token format (should be 32 characters)
    if (token.length !== 32) {
      console.warn(`⚠️ Twilio Auth Token length is ${token.length}, expected 32 characters. This may cause authentication issues.`);
    }
    
    // Initialize Twilio client
    try {
      const twilio = require('twilio');
      this.twilioClient = twilio(sid, token);
      console.log('✅ Twilio client initialized successfully');
      console.log('- Client Account SID:', this.twilioClient.accountSid || 'Not available');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
      throw new Error(`Failed to initialize Twilio client: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the twilio package is installed and credentials are valid.`);
    }
  }

  /**
   * Test connection to Twilio API
   */
  async testConnection(): Promise<TwilioApiResponse<any>> {
    try {
      console.log('Testing Twilio connection...');
      console.log('Account SID:', this.twilioClient?.accountSid || 'Not found');
      console.log('From Number:', this.fromNumber);
      
      // Check if client exists
      if (!this.twilioClient) {
        throw new Error('Twilio client is not initialized');
      }
      
      // Check if accountSid exists
      const accountSid = this.twilioClient.accountSid;
      if (!accountSid) {
        throw new Error('Twilio Account SID is missing');
      }
      
      // Check if accountSid looks valid (starts with AC)
      if (!accountSid.startsWith('AC')) {
        throw new Error(`Invalid Account SID format: ${accountSid}`);
      }
      
      // Make an actual API call to verify authentication
      console.log('🌐 Making real API call to verify authentication...');
      try {
        // Fetch account details to verify auth
        const account = await this.twilioClient.api.v2010.accounts(accountSid).fetch();
        console.log('✅ Real API call successful - account status:', account.status);
        
        // Also verify WhatsApp messaging capabilities if possible
        let whatsappStatus = 'Unknown';
        try {
          // Try to list WhatsApp senders to verify WhatsApp permissions
          const whatsappSenders = await this.twilioClient.messaging.v1.services.list({ limit: 1 });
          whatsappStatus = whatsappSenders.length > 0 ? 'Available' : 'No services configured';
        } catch (whatsappError) {
          console.warn('WhatsApp capability check failed:', whatsappError);
          whatsappStatus = 'Check required';
        }
        
        return {
          result: true,
          data: {
            accountSid: accountSid.substring(0, 8) + '...',
            status: account.status,
            fromNumber: this.fromNumber,
            whatsappStatus,
            realApiCall: true
          },
          info: 'Twilio API connection and authentication verified'
        };
      } catch (apiError: any) {
        console.error('❌ Real API call failed:', apiError);
        
        // Parse Twilio-specific errors
        let errorMessage = apiError.message || 'API call failed';
        if (apiError.code === 20003) {
          errorMessage = 'Authentication failed: Invalid Account SID or Auth Token';
        } else if (apiError.status === 401) {
          errorMessage = 'Authentication failed: Invalid credentials';
        } else if (apiError.status === 403) {
          errorMessage = 'Authentication failed: Account permissions issue';
        }
        
        return {
          result: false,
          error: errorMessage,
          info: 'Real API authentication failed'
        };
      }
      
    } catch (error: any) {
      console.error('Twilio connection test failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        twilioClient: !!this.twilioClient,
        accountSid: this.twilioClient?.accountSid || 'missing'
      });
      
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to connect to Twilio API'
      };
    }
  }

  /**
   * Get available content templates
   */
  async getTemplates(): Promise<TwilioTemplate[]> {
    try {
      const contents = await this.twilioClient.content.v1.contents.list();
      
      return contents.map((content: any) => ({
        sid: content.sid,
        friendly_name: content.friendlyName,
        language: content.language,
        status: content.status,
        variables: content.variables || {},
        types: content.types || {}
      }));
    } catch (error: any) {
      console.error('Failed to fetch Twilio templates:', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
  }

  /**
   * Get a specific template by SID
   */
  async getTemplate(contentSid: string): Promise<TwilioTemplate | null> {
    try {
      const content = await this.twilioClient.content.v1.contents(contentSid).fetch();
      
      return {
        sid: content.sid,
        friendly_name: content.friendlyName,
        language: content.language,
        status: content.status,
        variables: content.variables || {},
        types: content.types || {}
      };
    } catch (error: any) {
      console.error(`Failed to fetch template ${contentSid}:`, error);
      return null;
    }
  }

  /**
   * Validate and format WhatsApp number
   */
  validateWhatsAppNumber(phoneNumber: string): TwilioValidatedNumber {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // Basic validation
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        original: phoneNumber,
        formatted: phoneNumber,
        isValid: false
      };
    }
    
    // Format for WhatsApp (add whatsapp: prefix if not present)
    let formatted = cleaned.startsWith('+') ? `whatsapp:${cleaned}` : `whatsapp:+${cleaned}`;
    
    return {
      original: phoneNumber,
      formatted,
      isValid: true
    };
  }

  /**
   * Send a message using a content template
   */
  async sendTemplateMessage(request: {
    to: string;
    contentSid: string;
    contentVariables?: string;
  }): Promise<TwilioApiResponse<TwilioSendMessageResponse>> {
    try {
      const validatedNumber = this.validateWhatsAppNumber(request.to);
      
      if (!validatedNumber.isValid) {
        return {
          result: false,
          error: `Invalid phone number: ${request.to}`,
          info: 'Phone number validation failed'
        };
      }

      const message = await this.twilioClient.messages.create({
        from: this.fromNumber,
        to: validatedNumber.formatted,
        contentSid: request.contentSid,
        contentVariables: request.contentVariables || '{}'
      });

      return {
        result: true,
        data: {
          sid: message.sid,
          status: message.status,
          to: message.to,
          from: message.from,
          body: message.body,
          price: message.price,
          price_unit: message.priceUnit
        },
        info: 'Message sent successfully'
      };
    } catch (error: any) {
      console.error('Failed to send template message:', error);
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to send message'
      };
    }
  }

  /**
   * Send a simple text message
   */
  async sendTextMessage(
    to: string,
    body: string
  ): Promise<TwilioApiResponse<TwilioSendMessageResponse>> {
    try {
      const validatedNumber = this.validateWhatsAppNumber(to);
      
      if (!validatedNumber.isValid) {
        return {
          result: false,
          error: `Invalid phone number: ${to}`,
          info: 'Phone number validation failed'
        };
      }

      const message = await this.twilioClient.messages.create({
        from: this.fromNumber,
        to: validatedNumber.formatted,
        body: body
      });

      return {
        result: true,
        data: {
          sid: message.sid,
          status: message.status,
          to: message.to,
          from: message.from,
          body: message.body,
          price: message.price,
          price_unit: message.priceUnit
        },
        info: 'Text message sent successfully'
      };
    } catch (error: any) {
      console.error('Failed to send text message:', error);
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to send message'
      };
    }
  }

  /**
   * Send messages to multiple recipients using template
   */
  async sendBulkTemplateMessage(
    recipients: Array<{ phone: string; name: string; variables?: Record<string, string> }>,
    contentSid: string,
    defaultVariables: Record<string, string> = {}
  ): Promise<TwilioApiResponse<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  }>> {
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const variables = { ...defaultVariables, ...recipient.variables, name: recipient.name };
        const contentVariables = formatTemplateVariables(
          { variables: variables } as unknown as TwilioTemplate,
          variables
        );

        const response = await this.sendTemplateMessage({
          to: recipient.phone,
          contentSid,
          contentVariables
        });

        if (response.result && response.data) {
          results.push({
            phone: recipient.phone,
            success: true,
            messageId: response.data.sid
          });
          successful++;
        } else {
          results.push({
            phone: recipient.phone,
            success: false,
            error: response.error
          });
          failed++;
        }
      } catch (error: any) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message
        });
        failed++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      result: successful > 0,
      data: {
        successful,
        failed,
        results
      },
      info: `Sent to ${successful} recipients, ${failed} failed`
    };
  }
}

// Default client instance
let defaultClient: TwilioApiClient | null = null;

export function getDefaultTwilioClient(): TwilioApiClient {
  if (!defaultClient) {
    try {
      defaultClient = new TwilioApiClient();
    } catch (error) {
      // Log the error and re-throw with context
      console.error('❌ Failed to create default Twilio client:', error);
      
      if (error instanceof Error) {
        // Check if it's a credentials issue
        if (error.message.includes('Missing:') || error.message.includes('required')) {
          console.error('💡 Solution: Configure the following environment variables in your production deployment:');
          console.error('   - TWILIO_ACCOUNT_SID: Your Twilio Account SID');
          console.error('   - TWILIO_AUTH_TOKEN: Your Twilio Auth Token');
          console.error('   - TWILIO_WHATSAPP_FROM: Your WhatsApp Business number');
        }
        
        throw new Error(`WhatsApp messaging unavailable: ${error.message}`);
      }
      
      throw new Error('WhatsApp messaging unavailable: Failed to initialize Twilio client');
    }
  }
  return defaultClient;
}

// Helper function to reset the default client (useful when credentials change)
export function resetDefaultTwilioClient(): void {
  console.log('🔄 Resetting default Twilio client...');
  defaultClient = null;
}

// Helper function to check if default client is initialized
export function isDefaultTwilioClientInitialized(): boolean {
  return defaultClient !== null;
}

// Helper function to get client with custom credentials
export function getTwilioClient(
  accountSid: string,
  authToken: string,
  fromNumber?: string
): TwilioApiClient {
  return new TwilioApiClient(accountSid, authToken, fromNumber);
}

// WhatsApp Business API Helper Functions

/**
 * WhatsApp Business API 24-Hour Window Rules:
 * 
 * 1. When a CUSTOMER sends a message to your business → Opens 24-hour window
 * 2. During this 24-hour window → Business can send UNLIMITED freeform messages
 * 3. Each new CUSTOMER message → Resets the window to a fresh 24 hours
 * 4. When window expires → Business can ONLY send pre-approved template messages
 * 5. Template messages → Do NOT open new windows (only customer messages do)
 * 6. Business-initiated conversations → Must start with template messages
 * 
 * Common Flow:
 * Customer: "Hello" → 24hr window opens
 * Business: "Hi! How can I help?" ✅ (freeform)
 * Business: "We have new offers!" ✅ (freeform) 
 * Business: "Any questions?" ✅ (freeform)
 * [24 hours pass without customer response]
 * Business: Must use template message ❌ (no freeform)
 * Business: Sends template "We have updates for you"
 * Customer: "Tell me more" → New 24hr window opens
 * Business: "Here are the details..." ✅ (freeform again)
 */

/**
 * Checks if a conversation is within the 24-hour messaging window
 * WhatsApp Business API allows freeform messages only within 24 hours of the last incoming message
 */
export interface WhatsAppMessageWindow {
  canSendFreeform: boolean;
  reason: string;
  lastIncomingMessageAt?: Date;
  hoursRemaining?: number;
  debugInfo?: {
    lastMessageAt: Date | null;
    lastMessageFrom: string | null;
    currentTime: Date;
    twentyFourHoursAgo: Date;
    isWithinWindow: boolean;
    timeDifference: number;
  };
}

export function checkWhatsAppMessageWindow(
  lastIncomingMessageAt?: Date | null,
  lastMessageFrom?: 'INCOMING' | 'OUTGOING' | null
): WhatsAppMessageWindow {
  const currentTime = new Date();
  const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
  
  // Create debug info with proper types
  const debugInfo = {
    lastMessageAt: lastIncomingMessageAt || null,
    lastMessageFrom: lastMessageFrom || null,
    currentTime,
    twentyFourHoursAgo,
    isWithinWindow: false,
    timeDifference: 0
  };

  // If no incoming messages exist, freeform messages are not allowed (business-initiated conversation)
  if (!lastIncomingMessageAt) {
    return {
      canSendFreeform: false,
      reason: "No previous conversation. Use a template message to initiate contact.",
      debugInfo
    };
  }

  // Convert to Date if it's a string (from database)
  const messageDate = lastIncomingMessageAt instanceof Date ? lastIncomingMessageAt : new Date(lastIncomingMessageAt);
  
  // Validate the date
  if (isNaN(messageDate.getTime())) {
    return {
      canSendFreeform: false,
      reason: "Invalid last message timestamp. Use a template message.",
      debugInfo: {
        ...debugInfo,
        lastMessageAt: messageDate
      }
    };
  }

  debugInfo.lastMessageAt = messageDate;
  debugInfo.timeDifference = currentTime.getTime() - messageDate.getTime();
  
  // Check if the last incoming message is within 24-hour window
  const timeDifferenceMs = currentTime.getTime() - messageDate.getTime();
  const timeDifferenceHours = timeDifferenceMs / (60 * 60 * 1000);
  const isWithinWindow = timeDifferenceHours < 24;
  
  debugInfo.isWithinWindow = isWithinWindow;

  if (isWithinWindow) {
    const hoursRemaining = Math.max(0, 24 - timeDifferenceHours);
    
    // Log successful window check for debugging
    console.log('✅ 24-hour window check:', {
      canSend: true,
      lastIncomingMessageAt: messageDate.toISOString(),
      currentTime: currentTime.toISOString(),
      hoursElapsed: timeDifferenceHours.toFixed(2),
      hoursRemaining: hoursRemaining.toFixed(2)
    });
    
    return {
      canSendFreeform: true,
      reason: "Within 24-hour window from last incoming message",
      lastIncomingMessageAt: messageDate,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10, // Round to 1 decimal
      debugInfo
    };
  }

  // Log failed window check for debugging
  console.log('❌ 24-hour window expired:', {
    canSend: false,
    lastIncomingMessageAt: messageDate.toISOString(),
    currentTime: currentTime.toISOString(),
    hoursElapsed: timeDifferenceHours.toFixed(2),
    windowExpiredBy: (timeDifferenceHours - 24).toFixed(2) + ' hours'
  });

  return {
    canSendFreeform: false,
    reason: "24-hour window expired. Use a template message to re-engage.",
    lastIncomingMessageAt: messageDate,
    debugInfo
  };
}

/**
 * Get user-friendly explanation of WhatsApp messaging window status
 */
export function getWindowStatusExplanation(windowInfo: WhatsAppMessageWindow): string {
  if (windowInfo.canSendFreeform) {
    const hours = windowInfo.hoursRemaining || 0;
    const hoursText = hours > 1 ? `${hours.toFixed(1)} hours` : `${Math.round(hours * 60)} minutes`;
    
    return `✅ You can send freeform messages for the next ${hoursText}. This window stays open as long as the customer responds within 24 hours of their last message.`;
  }

  if (windowInfo.reason.includes('No previous conversation')) {
    return `❌ This is a new conversation. You must send a pre-approved template message first. Once the customer responds, you'll have 24 hours to send freeform messages.`;
  }

  if (windowInfo.reason.includes('Last message was outgoing')) {
    return `❌ Your last message was outgoing. Wait for the customer to respond, or send a pre-approved template message. Customer responses open a new 24-hour window.`;
  }

  if (windowInfo.reason.includes('24-hour window expired')) {
    const lastMessage = windowInfo.lastIncomingMessageAt;
    const timeAgo = lastMessage ? formatDistanceToNow(lastMessage) : 'unknown time';
    
    return `❌ The 24-hour window expired ${timeAgo} ago. You can only send pre-approved template messages. When the customer responds, you'll get a new 24-hour window for freeform messages.`;
  }

  return `❌ ${windowInfo.reason}`;
} 