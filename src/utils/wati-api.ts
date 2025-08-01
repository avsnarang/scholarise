/**
 * Wati API Integration Utilities
 * Provides functions to interact with Wati WhatsApp Business API
 * Based on official Wati API documentation: https://docs.wati.io/reference/introduction
 */

export interface WatiConfig {
  apiToken: string;
  baseUrl: string; // e.g., https://live-server-XXXXXX.wati.io
}

export interface WatiTemplate {
  id: string;
  elementName: string;
  category: string;
  subCategory: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  language: {
    key: string;
    value: string;
    text: string;
  };
  body: string;
  bodyOriginal: string;
  header: {
    type: number;
    headerTypeString: string;
    typeString: string;
    text: string | null;
    link: string | null;
  } | null;
  footer: string | null;
  buttons: any[];
  customParams: Array<{
    paramName: string;
    paramValue: string;
  }>;
  lastModified: string;
  type: string;
}

export interface WatiTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  parameters?: WatiTemplateParameter[];
}

export interface WatiTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
}

// Wati API Request/Response interfaces based on official documentation
export interface WatiSendTemplateMessageRequest {
  template_name: string;
  broadcast_name: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
  contacts: Array<{
    whatsappNumber: string;
    customParams?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export interface WatiContact {
  id: string;
  name: string;
  whatsappNumber: string;
  countryCode: string;
  status: string;
  createdDateTime: string;
}

export interface WatiSendMessageResponse {
  result: boolean;
  info: string;
  data?: {
    broadcastId: string;
    totalContacts: number;
    validContacts: number;
    invalidContacts: number;
    estimatedCost: number;
  };
}

export interface WatiMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  whatsappNumber: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Wati API Client Class
 */
export class WatiApiClient {
  private config: WatiConfig;

  constructor(config: WatiConfig) {
    this.config = config;
  }

  /**
   * Get the full API URL for an endpoint
   */
  private getApiUrl(endpoint: string): string {
    return `${this.config.baseUrl}/api/v1/${endpoint}`;
  }

  /**
   * Make an authenticated request to Wati API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.getApiUrl(endpoint);
    
    // Handle tokens that already include "Bearer" prefix
    const authHeader = this.config.apiToken.startsWith('Bearer ') 
      ? this.config.apiToken 
      : `Bearer ${this.config.apiToken}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wati API Error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text() as T;
    }
  }

  /**
   * Get all approved WhatsApp templates
   */
  async getTemplates(): Promise<WatiTemplate[]> {
    const response = await this.makeRequest<any>('getMessageTemplates');
    
    // Handle different response formats from Wati API
    if (Array.isArray(response)) {
      return response;
    }
    
    // If response is wrapped in an object (common API pattern)
    if (response && typeof response === 'object') {
      // Check common wrapper properties
      if (Array.isArray(response.templates)) {
        return response.templates;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response.messageTemplates)) {
        return response.messageTemplates;
      }
      if (Array.isArray(response.result)) {
        return response.result;
      }
    }
    
    // Log the actual response for debugging
    console.error('Unexpected Wati API response format:', response);
    
    // Return empty array as fallback
    return [];
  }

  /**
   * Get a specific template by name
   */
  async getTemplate(templateName: string): Promise<WatiTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.elementName === templateName) || null;
  }

  /**
   * Send a message using a template
   */
  async sendTemplateMessage(request: WatiSendTemplateMessageRequest): Promise<WatiSendMessageResponse> {
    return this.makeRequest<WatiSendMessageResponse>('sendTemplateMessage', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Send a simple text message (for testing)
   */
  async sendTextMessage(
    whatsappNumber: string,
    message: string
  ): Promise<{ result: boolean; info: string }> {
    return this.makeRequest('sendSessionMessage', {
      method: 'POST',
      body: JSON.stringify({
        whatsappNumber: whatsappNumber.replace(/[^\d]/g, ''), // Remove non-digits
        message: { text: message }
      }),
    });
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<WatiMessageStatus> {
    return this.makeRequest<WatiMessageStatus>(`getMessageStatus/${messageId}`);
  }

  /**
   * Validate WhatsApp number format
   */
  validateWhatsAppNumber(number: string): { isValid: boolean; formatted: string; error?: string } {
    // Remove all non-digits
    const cleaned = number.replace(/[^\d]/g, '');
    
    // Check if it's a valid length (typically 10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Invalid phone number length'
      };
    }
    
    // For Indian numbers, ensure they start with country code
    let formatted = cleaned;
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      formatted = '91' + cleaned; // Add India country code
    }
    
    // Wati API specific formatting - remove any + or special characters
    // and ensure it's just digits with country code
    formatted = formatted.replace(/[^\d]/g, '');
    
    console.log(`Phone number validation: ${number} -> ${formatted}`);
    
    return {
      isValid: true,
      formatted: formatted
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getTemplates();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Create a Wati API client instance
 */
export function createWatiClient(config: WatiConfig): WatiApiClient {
  return new WatiApiClient(config);
}

/**
 * Get Wati configuration from environment variables
 */
export function getWatiConfigFromEnv(): WatiConfig {
    const apiToken = process.env.WATI_API_TOKEN;
  const baseUrl = process.env.WATI_BASE_URL || 'https://live-server.wati.io';
  
  if (!apiToken) {
    throw new Error('WATI_API_TOKEN environment variable is required. Please add it to your .env file.');
  }
  
  return {
    apiToken,
    baseUrl,
  };
}

/**
 * Default Wati client instance using environment configuration
 */
let defaultClient: WatiApiClient | null = null;

export function getDefaultWatiClient(): WatiApiClient {
  if (!defaultClient) {
    defaultClient = createWatiClient(getWatiConfigFromEnv());
  }
  return defaultClient;
}

/**
 * Helper function to format template parameters for Wati API
 */
export function formatTemplateParameters(
  template: WatiTemplate,
  values: Record<string, string>
): Array<{ name: string; value: string }> {
  const parameters: Array<{ name: string; value: string }> = [];
  
  // Extract parameter placeholders from template body
  const templateBody = template.bodyOriginal || template.body;
  if (templateBody) {
    const matches = templateBody.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      matches.forEach((match: string, index: number) => {
        const paramName = match.replace(/[{}]/g, '');
        const value = values[paramName] || values[`param${index + 1}`] || '';
        parameters.push({ name: paramName, value });
      });
    }
  }
  
  return parameters;
}

/**
 * Helper to create broadcast name with timestamp
 */
export function createBroadcastName(prefix = 'ScholariseMsg'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}`;
} 