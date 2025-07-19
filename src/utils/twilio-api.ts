import { env } from "@/env.js";

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
    
    if (!sid || !token) {
      const missingVars = [];
      if (!sid) missingVars.push('TWILIO_ACCOUNT_SID');
      if (!token) missingVars.push('TWILIO_AUTH_TOKEN');
      throw new Error(`Twilio credentials are required. Missing: ${missingVars.join(', ')}. Please set these environment variables in your .env file.`);
    }
    
    // Initialize Twilio client
    try {
      const twilio = require('twilio');
      this.twilioClient = twilio(sid, token);
      console.log('Twilio client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
      throw new Error('Failed to initialize Twilio client. Make sure twilio package is installed.');
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
      
      return {
        result: true,
        data: {
          accountSid: accountSid.substring(0, 8) + '...',  // Show partial for security
          status: 'Connected',
          fromNumber: this.fromNumber
        },
        info: 'Twilio API connection successful'
      };
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
    defaultClient = new TwilioApiClient();
  }
  return defaultClient;
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
 * Checks if a conversation is within the 24-hour messaging window
 * WhatsApp Business API allows freeform messages only within 24 hours of the last incoming message
 */
export interface WhatsAppMessageWindow {
  canSendFreeform: boolean;
  reason: string;
  lastIncomingMessageAt?: Date;
  hoursRemaining?: number;
}

export function checkWhatsAppMessageWindow(
  lastMessageAt?: Date | null,
  lastMessageFrom?: 'INCOMING' | 'OUTGOING' | null
): WhatsAppMessageWindow {
  // If no previous messages, freeform messages are not allowed (business-initiated conversation)
  if (!lastMessageAt || !lastMessageFrom) {
    return {
      canSendFreeform: false,
      reason: "No previous conversation. Use a template message to initiate contact."
    };
  }

  // Only incoming messages open the 24-hour window
  if (lastMessageFrom !== 'INCOMING') {
    return {
      canSendFreeform: false,
      reason: "Last message was outgoing. Wait for user to respond or use a template message."
    };
  }

  // Check if within 24-hour window
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isWithinWindow = lastMessageAt > twentyFourHoursAgo;

  if (isWithinWindow) {
    const hoursRemaining = Math.max(0, 24 - (Date.now() - lastMessageAt.getTime()) / (60 * 60 * 1000));
    return {
      canSendFreeform: true,
      reason: "Within 24-hour window from last incoming message",
      lastIncomingMessageAt: lastMessageAt,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10 // Round to 1 decimal
    };
  }

  return {
    canSendFreeform: false,
    reason: "24-hour window expired. Use a template message to re-engage.",
    lastIncomingMessageAt: lastMessageAt
  };
} 