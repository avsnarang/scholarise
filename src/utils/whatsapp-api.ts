import { env } from "@/env.js";

console.log('🔧 Meta WhatsApp API utility loaded');

// Meta API Request/Response interfaces
export interface MetaSendTemplateMessageRequest {
  to: string;
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
}

export interface MetaSendTextMessageRequest {
  to: string;
  text: {
    body: string;
  };
}

export interface MetaSendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
  }>;
}

export interface WhatsAppApiResponse<T> {
  result: boolean;
  data?: T;
  error?: string;
  info?: string;
}

export interface ValidatedNumber {
  original: string;
  formatted: string;
  isValid: boolean;
}

export interface SendMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body?: string;
}

export interface BulkMessageResponse {
  successful: number;
  failed: number;
  results: Array<{ 
    phone: string; 
    originalPhone?: string;
    success: boolean; 
    messageId?: string; 
    error?: string;
    normalized?: boolean;
  }>;
  phoneNormalizationApplied?: boolean;
}

// Utility functions
export function formatTemplateVariables(
  template: MetaTemplate,
  parameters: Record<string, string>
): Array<{ type: string; parameters: Array<{ type: string; text: string }> }> {
  const components: Array<{ type: string; parameters: Array<{ type: string; text: string }> }> = [];
  
  // Find body component and add parameters
  const bodyComponent = template.components?.find(c => c.type === 'BODY');
  if (bodyComponent && Object.keys(parameters).length > 0) {
    const bodyParameters = Object.values(parameters).map(value => ({
      type: 'text',
      text: value
    }));
    
    components.push({
      type: 'body',
      parameters: bodyParameters
    });
  }
  
  return components;
}

export class WhatsAppApiClient {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiVersion: string;
  private baseUrl: string;
  
  constructor(
    accessToken?: string,
    phoneNumberId?: string,
    businessAccountId?: string,
    apiVersion?: string
  ) {
    // Use provided credentials or fall back to environment variables
    this.accessToken = accessToken || env.META_WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = phoneNumberId || env.META_WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = businessAccountId || env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.apiVersion = apiVersion || env.META_WHATSAPP_API_VERSION || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    console.log('Meta WhatsApp Client Initialization:');
    console.log('- Access Token provided:', !!this.accessToken, this.accessToken ? 'yes' : 'missing');
    console.log('- Phone Number ID provided:', !!this.phoneNumberId, this.phoneNumberId || 'missing');
    console.log('- Business Account ID provided:', !!this.businessAccountId, this.businessAccountId || 'missing');
    console.log('- API Version:', this.apiVersion);
    
    // Enhanced validation for production environments
    if (!this.accessToken || !this.phoneNumberId) {
      const missingVars = [];
      if (!this.accessToken) missingVars.push('META_WHATSAPP_ACCESS_TOKEN');
      if (!this.phoneNumberId) missingVars.push('META_WHATSAPP_PHONE_NUMBER_ID');
      
      const errorMessage = `Meta WhatsApp credentials are required for messaging. Missing: ${missingVars.join(', ')}. Please configure these environment variables.`;
      
      // In production, this is a critical error
      if (env.NODE_ENV === 'production') {
        console.error('🚨 CRITICAL: Missing Meta WhatsApp credentials in production environment');
        console.error('Required environment variables:', {
          META_WHATSAPP_ACCESS_TOKEN: 'Your Meta WhatsApp Access Token',
          META_WHATSAPP_PHONE_NUMBER_ID: 'Your WhatsApp Phone Number ID',
          META_WHATSAPP_BUSINESS_ACCOUNT_ID: 'Your WhatsApp Business Account ID',
          META_WHATSAPP_API_VERSION: 'API version (optional, defaults to v21.0)'
        });
      }
      
      throw new Error(errorMessage);
    }
    
    // Validate Phone Number ID format
    if (!this.phoneNumberId.match(/^\d+$/)) {
      throw new Error(`Invalid Meta WhatsApp Phone Number ID format. Expected numeric string, got: ${this.phoneNumberId}`);
    }
    
    console.log('✅ Meta WhatsApp client initialized successfully');
  }

  /**
   * Test connection to Meta WhatsApp API
   */
  async testConnection(): Promise<WhatsAppApiResponse<any>> {
    console.log('🧪 Testing Meta WhatsApp API connection...');
    
    try {
      // Test by fetching phone number info
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Meta API test failed:', data);
        let errorMessage = data.error?.message || 'API test failed';
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed: Invalid access token';
        } else if (response.status === 403) {
          errorMessage = 'Authentication failed: Access token permissions issue';
        } else if (response.status === 404) {
          errorMessage = 'Phone Number ID not found or invalid';
        }
        
        return {
          result: false,
          error: errorMessage,
          info: 'Meta API authentication failed'
        };
      }
      
      console.log('✅ Meta API test successful - phone number status:', data.verified_name);
      
      return {
        result: true,
        data: {
          phoneNumberId: this.phoneNumberId,
          verifiedName: data.verified_name,
          displayPhoneNumber: data.display_phone_number,
          status: data.account_mode,
          realApiCall: true
        },
        info: 'Meta WhatsApp API connection and authentication verified'
      };
    } catch (error: any) {
      console.error('❌ Meta API test failed with exception:', error);
      return {
        result: false,
        error: error.message || 'Connection test failed',
        info: 'Failed to connect to Meta API'
      };
    }
  }

  /**
   * Validate and format WhatsApp number for Meta API
   */
  validateWhatsAppNumber(phoneNumber: string): ValidatedNumber {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic validation
    if (cleaned.length < 10 || cleaned.length > 16) {
      return {
        original: phoneNumber,
        formatted: phoneNumber,
        isValid: false
      };
    }
    
    // Format for Meta API (remove + and whatsapp: prefix)
    let formatted = cleaned.replace(/^\+/, '').replace(/^whatsapp:/, '');
    
    return {
      original: phoneNumber,
      formatted,
      isValid: true
    };
  }

  /**
   * Send a message using a template
   */
  async sendTemplateMessage(request: {
    to: string;
    templateName: string;
    templateLanguage?: string;
    templateVariables?: Record<string, string>;
    templateData?: {
      headerType?: string;
      headerContent?: string;
      headerMediaUrl?: string;
      footerText?: string;
      buttons?: any[];
    };
  }): Promise<WhatsAppApiResponse<MetaSendMessageResponse>> {
    try {
      const validatedNumber = this.validateWhatsAppNumber(request.to);
      
      if (!validatedNumber.isValid) {
        return {
          result: false,
          error: `Invalid phone number: ${request.to}`,
          info: 'Phone number validation failed'
        };
      }

      // Build components with proper parameter mapping
      const components = [];
      
      // 🔍 DEBUG: Log what variables we received
      console.log('🔍 WhatsApp API Debug - Template variables received:', {
        templateName: request.templateName,
        hasTemplateVariables: !!request.templateVariables,
        variableKeys: request.templateVariables ? Object.keys(request.templateVariables) : [],
        variableCount: request.templateVariables ? Object.keys(request.templateVariables).length : 0,
        variables: request.templateVariables
      });
      
      // Only add components if we have actual variables to send
      const hasActualVariables = request.templateVariables && 
        Object.keys(request.templateVariables).length > 0 &&
        Object.values(request.templateVariables).some(value => value && value.trim() !== '');
      
      console.log('🔍 Variable check:', {
        templateVariables: request.templateVariables,
        hasTemplateVariables: !!request.templateVariables,
        keyCount: request.templateVariables ? Object.keys(request.templateVariables).length : 0,
        hasActualVariables,
        willAddComponents: hasActualVariables
      });
      // Add header component parameters if template has header with variables
      if (request.templateData?.headerType === "TEXT" && request.templateData.headerContent) {
        // For now, headers with variables are not commonly used, but we can add support later
        // This is mainly for media headers which don't need parameters
      }
      
      // Add body component parameters if we have variables
      if (hasActualVariables) {
        // Sort variables by key to ensure consistent order (var1, var2, var3, etc.)
        const sortedEntries = Object.entries(request.templateVariables!)
          .sort(([a], [b]) => {
            // Extract numbers from variable names for proper sorting
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
          });

        if (sortedEntries.length > 0) {
          components.push({
            type: 'body',
            parameters: sortedEntries.map(([_, value]) => ({
              type: 'text',
              text: String(value || '') // Ensure it's a string and handle empty values
            }))
          });
        }
      }
      
      // Add header component for media headers
      if (request.templateData?.headerType && 
          request.templateData.headerType !== "TEXT" && 
          request.templateData.headerMediaUrl) {
        components.push({
          type: 'header',
          parameters: [{
            type: request.templateData.headerType.toLowerCase(),
            [request.templateData.headerType.toLowerCase()]: {
              link: request.templateData.headerMediaUrl
            }
          }]
        });
      }
      
      // Note: Footer and buttons don't need parameters as they're static in the template

      // Build the template object without components first
      const templateObj: any = {
        name: request.templateName,
        language: {
          code: request.templateLanguage || 'en'
        }
      };
      
      // Only add components if we actually have any
      if (components.length > 0) {
        templateObj.components = components;
      }

      const payload: MetaSendTemplateMessageRequest = {
        to: validatedNumber.formatted,
        template: templateObj
      };

      // Build the final payload exactly like the working minimal test
      const finalPayload = {
        messaging_product: 'whatsapp',
        to: payload.to,
        type: 'template',
        template: payload.template
      };

      // 🔍 DEBUG: Log the final payload being sent to Meta
      console.log('🔍 Meta API Payload:', {
        templateName: request.templateName,
        hasComponents: !!payload.template.components,
        componentsCount: payload.template.components?.length || 0,
        components: payload.template.components,
        templateObject: payload.template,
        finalPayload: JSON.stringify(finalPayload, null, 2)
      });

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to send template message:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          errorCode: data.error?.code,
          templateName: request.templateName,
          templateLanguage: request.templateLanguage,
          variables: request.templateVariables,
          components: payload.template.components
        });
        
        // Provide specific guidance for common errors
        let errorMessage = data.error?.message || 'Unknown error occurred';
        if (data.error?.code === 100) {
          errorMessage = `Invalid parameter error: ${data.error?.message}. Check that template variables match the template structure in Meta Business Manager.`;
        }
        
        return {
          result: false,
          error: errorMessage,
          info: 'Failed to send template message'
        };
      }

      return {
        result: true,
        data: data,
        info: 'Template message sent successfully'
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
  ): Promise<WhatsAppApiResponse<MetaSendMessageResponse>> {
    try {
      const validatedNumber = this.validateWhatsAppNumber(to);
      
      if (!validatedNumber.isValid) {
        return {
          result: false,
          error: `Invalid phone number: ${to}`,
          info: 'Phone number validation failed'
        };
      }

      const payload: MetaSendTextMessageRequest = {
        to: validatedNumber.formatted,
        text: {
          body: body
        }
      };

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ...payload
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to send text message:', data);
        return {
          result: false,
          error: data.error?.message || 'Unknown error occurred',
          info: 'Failed to send text message'
        };
      }

      return {
        result: true,
        data: data,
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
   * Send messages to multiple recipients using template with proper rate limiting and phone normalization
   */
  async sendBulkTemplateMessage(
    recipients: Array<{ phone: string; name: string; variables?: Record<string, string> }>,
    templateName: string,
    defaultVariables: Record<string, string> = {},
    templateLanguage: string = 'en',
    normalizePhoneNumbers: boolean = true,
    phoneConfig?: { defaultCountryCode?: string; organizationCountry?: string }
  ): Promise<WhatsAppApiResponse<BulkMessageResponse>> {
    // Import utilities dynamically to avoid circular dependencies
    const { withRateLimit } = await import('./rate-limiter');
    
    console.log(`📊 Starting bulk message send to ${recipients.length} recipients`);
    console.log(`📋 Template: ${templateName}, Language: ${templateLanguage}`);
    
    // Normalize phone numbers if enabled
    let processedRecipients = recipients;
    if (normalizePhoneNumbers) {
      const { normalizePhoneNumbers: normalizeNumbers, getPhoneConfigForContext } = await import('./phone-number-utils');
      
      // Use provided config or defaults
      const config = getPhoneConfigForContext({
        organizationCountry: phoneConfig?.organizationCountry,
      });
      
      if (phoneConfig?.defaultCountryCode) {
        config.defaultCountryCode = phoneConfig.defaultCountryCode;
      }
      
      console.log(`📞 Normalizing phone numbers with default country code ${config.defaultCountryCode}...`);
      
      const phoneNumbers = recipients.map(r => r.phone);
      const normalizationResult = normalizeNumbers(phoneNumbers, config);
      
      console.log(`📞 Phone normalization results:`, {
        total: normalizationResult.stats.total,
        valid: normalizationResult.stats.valid,
        invalid: normalizationResult.stats.invalid,
        warnings: normalizationResult.stats.warnings
      });
      
      // Log invalid numbers
      if (normalizationResult.invalid.length > 0) {
        console.warn(`⚠️ Invalid phone numbers found:`, normalizationResult.invalid);
      }
      
      // Log warnings for normalized numbers
      if (normalizationResult.valid.some(v => v.warnings.length > 0)) {
        const numbersWithWarnings = normalizationResult.valid.filter(v => v.warnings.length > 0);
        console.log(`📝 Phone numbers normalized:`, numbersWithWarnings.map(n => ({
          original: n.original,
          normalized: n.normalized,
          warnings: n.warnings
        })));
      }
      
      // Create processed recipients with normalized numbers
      processedRecipients = recipients.map((recipient, index) => {
        const validNumber = normalizationResult.valid.find(v => v.original === recipient.phone);
        if (validNumber) {
          return {
            ...recipient,
            phone: validNumber.normalized,
            originalPhone: recipient.phone
          };
        } else {
          // Keep original phone for invalid numbers (will likely fail but at least we try)
          console.warn(`⚠️ Keeping invalid phone number as-is: ${recipient.phone}`);
          return {
            ...recipient,
            originalPhone: recipient.phone
          };
        }
      });
    }
    
    const results: Array<{ 
      phone: string; 
      originalPhone?: string;
      success: boolean; 
      messageId?: string; 
      error?: string;
      normalized?: boolean;
    }> = [];
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < processedRecipients.length; i++) {
      const recipient = processedRecipients[i];
      if (!recipient) continue; // Safety check
      
      const progress = `${i + 1}/${processedRecipients.length}`;
      const displayPhone = (recipient as any).originalPhone || recipient.phone;
      const actualPhone = recipient.phone;
      const wasNormalized = normalizePhoneNumbers && (recipient as any).originalPhone !== undefined;
      
      try {
        console.log(`📤 [${progress}] Sending to ${displayPhone}${wasNormalized ? ` (normalized to ${actualPhone})` : ''} (${recipient.name})`);
        
        // Only use the exact variables expected by the template - no extra name variables
        const variables = { ...defaultVariables, ...recipient.variables };

        // Use rate limiter for each message
        const response = await withRateLimit(
          this.phoneNumberId,
          () => this.sendTemplateMessage({
            to: actualPhone,
            templateName,
            templateLanguage,
            templateVariables: Object.keys(variables).length > 0 ? variables : undefined
          }),
          3 // max retries
        );

        if (response.result && response.data?.messages?.[0]) {
          results.push({
            phone: actualPhone,
            originalPhone: (recipient as any).originalPhone,
            success: true,
            messageId: response.data.messages[0].id,
            normalized: wasNormalized
          });
          successful++;
          console.log(`✅ [${progress}] Sent successfully to ${displayPhone}`);
        } else {
          results.push({
            phone: actualPhone,
            originalPhone: (recipient as any).originalPhone,
            success: false,
            error: response.error,
            normalized: wasNormalized
          });
          failed++;
          console.error(`❌ [${progress}] Failed to send to ${displayPhone}: ${response.error}`);
        }
      } catch (error: any) {
        results.push({
          phone: actualPhone,
          originalPhone: (recipient as any).originalPhone,
          success: false,
          error: error.message,
          normalized: wasNormalized
        });
        failed++;
        console.error(`❌ [${progress}] Exception sending to ${displayPhone}:`, error.message);
      }
      
      // Progress update every 10 messages
      if ((i + 1) % 10 === 0) {
        console.log(`📊 Progress: ${i + 1}/${processedRecipients.length} processed (${successful} sent, ${failed} failed)`);
      }
    }

    console.log(`🏁 Bulk send complete: ${successful} successful, ${failed} failed`);
    
    if (normalizePhoneNumbers) {
      const normalizedCount = results.filter(r => r.normalized).length;
      console.log(`📞 Phone normalization summary: ${normalizedCount} numbers were normalized`);
    }

    return {
      result: successful > 0,
      data: {
        successful,
        failed,
        results,
        phoneNormalizationApplied: normalizePhoneNumbers
      },
      info: `Sent to ${successful} recipients, ${failed} failed${normalizePhoneNumbers ? ' (with phone normalization)' : ''}`
    };
  }

  /**
   * Submit template to Meta for approval
   */
  async submitTemplateForApproval(template: {
    name: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    language: string;
    components: any[];
    allowCategoryChange?: boolean;
  }): Promise<WhatsAppApiResponse<{id: string; status: string; category: string}>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.businessAccountId}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: template.name,
            category: template.category,
            language: template.language,
            components: template.components,
            allow_category_change: template.allowCategoryChange || true
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to submit template to Meta:', data);
        let errorMessage = data.error?.message || 'Failed to submit template';
        
        // Handle specific Meta API errors
        if (data.error?.code === 100) {
          errorMessage = `Invalid template format or content: ${data.error?.error_subcode ? `(${data.error.error_subcode}) ` : ''}${data.error?.error_user_msg || data.error?.message || 'Check template name, category, and component structure'}`;
        } else if (data.error?.code === 190) {
          errorMessage = 'Access token expired or invalid';
        } else if (data.error?.code === 368) {
          errorMessage = 'Template name already exists or violates naming rules';
        } else if (data.error?.code === 132) {
          errorMessage = 'Template content violates WhatsApp policies';
        }
        
        return {
          result: false,
          error: errorMessage,
          info: 'Template submission failed'
        };
      }

      console.log('✅ Template submitted to Meta successfully:', data);
      
      return {
        result: true,
        data: {
          id: data.id,
          status: data.status, // PENDING, APPROVED, REJECTED
          category: data.category
        },
        info: 'Template submitted for approval'
      };
    } catch (error: any) {
      console.error('Failed to submit template to Meta:', error);
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to submit template'
      };
    }
  }

  /**
   * Get templates from Meta API
   */
  async getTemplates(): Promise<WhatsAppApiResponse<MetaTemplate[]>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.businessAccountId}/message_templates?fields=id,name,language,status,category,components`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch templates:', data);
        return {
          result: false,
          error: data.error?.message || 'Failed to fetch templates',
          info: 'Template fetch failed'
        };
      }

      return {
        result: true,
        data: data.data || [],
        info: 'Templates fetched successfully'
      };
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to fetch templates'
      };
    }
  }

  /**
   * Delete template from Meta API
   */
  async deleteTemplate(templateId: string): Promise<WhatsAppApiResponse<{success: boolean}>> {
    try {
      console.log(`🗑️ Deleting template ${templateId} from Meta...`);
      
      const response = await fetch(
        `${this.baseUrl}/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to delete template from Meta:', data);
        
        // Handle specific errors
        if (response.status === 404) {
          // Template doesn't exist in Meta - this is okay
          console.log('⚠️ Template not found in Meta (may have been deleted already)');
          return {
            result: true,
            data: { success: true },
            info: 'Template not found in Meta (already deleted)'
          };
        }
        
        return {
          result: false,
          error: data.error?.message || 'Failed to delete template from Meta',
          info: 'Template deletion failed'
        };
      }

      console.log('✅ Template deleted from Meta successfully');
      
      return {
        result: true,
        data: { success: true },
        info: 'Template deleted from Meta successfully'
      };
    } catch (error: any) {
      console.error('Failed to delete template from Meta:', error);
      return {
        result: false,
        error: error.message || 'Unknown error occurred',
        info: 'Failed to delete template from Meta'
      };
    }
  }

  /**
   * Convert response to backward-compatible format
   */
  private convertToCompatibleResponse(response: WhatsAppApiResponse<MetaSendMessageResponse>): WhatsAppApiResponse<SendMessageResponse> {
    if (response.result && response.data?.messages?.[0]) {
      return {
        result: true,
        data: {
          sid: response.data.messages[0].id,
          status: 'sent',
          to: response.data.contacts[0]?.input || '',
          from: this.phoneNumberId,
          body: 'Message sent via Meta API'
        },
        info: response.info
      };
    }

    return {
      result: false,
      error: response.error,
      info: response.info
    };
  }
}

// Default client instance
let defaultClient: WhatsAppApiClient | null = null;

export function getDefaultWhatsAppClient(): WhatsAppApiClient {
  if (!defaultClient) {
    try {
      defaultClient = new WhatsAppApiClient();
    } catch (error) {
      // Log the error and re-throw with context
      console.error('❌ Failed to create default Meta WhatsApp client:', error);
      
      if (error instanceof Error) {
        // Check if it's a credentials issue
        if (error.message.includes('Missing:') || error.message.includes('required')) {
          console.error('💡 Solution: Configure the following environment variables:');
          console.error('   - META_WHATSAPP_ACCESS_TOKEN: Your Meta WhatsApp Access Token');
          console.error('   - META_WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Phone Number ID');
          console.error('   - META_WHATSAPP_BUSINESS_ACCOUNT_ID: Your WhatsApp Business Account ID');
        }
        
        throw new Error(`WhatsApp messaging unavailable: ${error.message}`);
      }
      
      throw new Error('WhatsApp messaging unavailable: Failed to initialize Meta WhatsApp client');
    }
  }
  return defaultClient;
}

// Helper function to reset the default client (useful when credentials change)
export function resetDefaultWhatsAppClient(): void {
  console.log('🔄 Resetting default Meta WhatsApp client...');
  defaultClient = null;
}

// Export backward-compatible functions
export { WhatsAppApiClient as TwilioApiClient };
export { getDefaultWhatsAppClient as getDefaultTwilioClient };
export type { WhatsAppApiResponse as TwilioApiResponse };
export type { SendMessageResponse as TwilioSendMessageResponse };

// Export the main client
export { WhatsAppApiClient as MetaWhatsAppApiClient };
export { getDefaultWhatsAppClient as getDefaultMetaWhatsAppClient }; 