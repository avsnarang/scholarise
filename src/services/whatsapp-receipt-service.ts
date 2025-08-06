import { env } from "@/env.js";

export interface ReceiptWhatsAppData {
  receiptNumber: string;
  studentName: string;
  amount: number;
  paymentDate: Date;
  parentPhoneNumber: string;
  branchName?: string;
}

export interface WhatsAppTemplateResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppReceiptService {
  private static readonly META_API_BASE = 'https://graph.facebook.com';
  private static readonly API_VERSION = 'v23.0';

  /**
   * Send receipt via WhatsApp template with document header
   */
  static async sendReceiptTemplate(data: ReceiptWhatsAppData): Promise<WhatsAppTemplateResponse> {
    try {
      const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID;
      const baseUrl = env.NEXT_PUBLIC_APP_URL;

      if (!accessToken || !phoneNumberId || !baseUrl) {
        return {
          success: false,
          error: 'WhatsApp API credentials not configured'
        };
      }

      // Construct receipt PDF URL
      const receiptPdfUrl = `${baseUrl}/api/receipts/${data.receiptNumber}/pdf`;

      // Format amount in Indian currency
      const formattedAmount = data.amount.toLocaleString('en-IN');

      // Format date
      const formattedDate = data.paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Clean phone number for WhatsApp format
      const cleanPhoneNumber = this.formatPhoneNumber(data.parentPhoneNumber);

      // Prepare template message
      const templateMessage = {
        messaging_product: "whatsapp",
        to: cleanPhoneNumber,
        type: "template",
        template: {
          name: "fee_receipt_with_pdf", // This template needs to be created in Meta Business Manager
          language: { code: "en" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: receiptPdfUrl,
                    filename: `Fee_Receipt_${data.receiptNumber}.pdf`
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: data.studentName },
                { type: "text", text: data.receiptNumber },
                { type: "text", text: formattedAmount },
                { type: "text", text: formattedDate }
              ]
            }
          ]
        }
      };

      // Send message via Meta WhatsApp API
      const response = await fetch(
        `${this.META_API_BASE}/${this.API_VERSION}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(templateMessage)
        }
      );

      const result = await response.json();

      if (response.ok && result.messages?.[0]?.id) {
        return {
          success: true,
          messageId: result.messages[0].id
        };
      } else {
        console.error('WhatsApp API Error:', result);
        return {
          success: false,
          error: result.error?.message || 'Failed to send WhatsApp message'
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send receipt via alternative template (text-only fallback)
   */
  static async sendReceiptTextTemplate(data: ReceiptWhatsAppData): Promise<WhatsAppTemplateResponse> {
    try {
      const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID;
      const baseUrl = env.NEXT_PUBLIC_APP_URL;

      if (!accessToken || !phoneNumberId || !baseUrl) {
        return {
          success: false,
          error: 'WhatsApp API credentials not configured'
        };
      }

      // Construct receipt PDF URL
      const receiptPdfUrl = `${baseUrl}/api/receipts/${data.receiptNumber}/pdf`;

      // Format amount and date
      const formattedAmount = data.amount.toLocaleString('en-IN');
      const formattedDate = data.paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const cleanPhoneNumber = this.formatPhoneNumber(data.parentPhoneNumber);

      // Text-only template with receipt URL
      const templateMessage = {
        messaging_product: "whatsapp",
        to: cleanPhoneNumber,
        type: "template",
        template: {
          name: "fee_receipt_text", // Alternative text template
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: data.studentName },
                { type: "text", text: data.receiptNumber },
                { type: "text", text: formattedAmount },
                { type: "text", text: formattedDate },
                { type: "text", text: receiptPdfUrl }
              ]
            }
          ]
        }
      };

      const response = await fetch(
        `${this.META_API_BASE}/${this.API_VERSION}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(templateMessage)
        }
      );

      const result = await response.json();

      if (response.ok && result.messages?.[0]?.id) {
        return {
          success: true,
          messageId: result.messages[0].id
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Failed to send WhatsApp message'
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp text receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format phone number for WhatsApp API
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If number starts with 0, remove it and add +91 (Indian format)
    if (cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.slice(1);
    }
    
    // If number doesn't start with +, add +91 for Indian numbers
    if (!cleaned.startsWith('+')) {
      // Assume 10-digit numbers are Indian
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Check if WhatsApp service is configured
   */
  static isConfigured(): boolean {
    return !!(env.META_WHATSAPP_ACCESS_TOKEN && env.META_WHATSAPP_PHONE_NUMBER_ID && env.NEXT_PUBLIC_APP_URL);
  }

  /**
   * Get receipt PDF URL for sharing
   */
  static getReceiptPdfUrl(receiptNumber: string): string | null {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) return null;
    
    return `${baseUrl}/api/receipts/${receiptNumber}/pdf`;
  }
}