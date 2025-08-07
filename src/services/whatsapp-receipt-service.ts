import { env } from "@/env.js";
import { db } from "@/server/db";
import { createAutomationLogger, type AutomationLogEntry } from "@/utils/automation-logger";

export interface ReceiptWhatsAppData {
  receiptNumber: string;
  studentName: string;
  amount: number;
  paymentDate: Date;
  parentPhoneNumber: string;
  branchName?: string;
  parentName?: string;
  branchId: string;
  studentId?: string;
  parentId?: string;
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
    const automationLogger = createAutomationLogger(db);
    let logId: string | undefined;
    
    try {
      // Create automation log entry
      logId = await automationLogger.createLog({
        automationType: 'FEE_RECEIPT',
        automationTrigger: 'fee_payment_receipt',
        messageTitle: `Fee Receipt - ${data.receiptNumber}`,
        messageContent: `Fee receipt for ${data.studentName} - Amount: ₹${data.amount.toLocaleString('en-IN')}`,
        templateName: 'fee_receipt_automatic',
        recipientId: data.parentId || data.studentId || 'unknown',
        recipientName: data.parentName || 'Parent',
        recipientPhone: data.parentPhoneNumber,
        recipientType: 'PARENT',
        automationContext: {
          receiptNumber: data.receiptNumber,
          studentName: data.studentName,
          amount: data.amount,
          paymentDate: data.paymentDate.toISOString(),
          branchName: data.branchName,
        },
        branchId: data.branchId,
        platformUsed: 'WHATSAPP',
      });
    } catch (logError) {
      console.error('Failed to create automation log:', logError);
      // Continue with WhatsApp sending even if logging fails
    }

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
          name: "fee_receipt_automatic", // This template has been approved in Meta Business Manager
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
                { type: "text", text: data.parentName || "Parent" }, // {{1}} - Parent greeting
                { type: "text", text: data.studentName }, // {{2}} - Student name
                { type: "text", text: data.receiptNumber }, // {{3}} - Receipt number
                { type: "text", text: `₹${formattedAmount}` }, // {{4}} - Amount with currency symbol
                { type: "text", text: formattedDate } // {{5}} - Date
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
        // Update automation log with success
        if (logId) {
          try {
            await automationLogger.updateDeliveryStatus({
              logId,
              status: 'SENT',
              deliveryDetails: {
                sentAt: new Date(),
                externalMessageId: result.messages[0].id,
              }
            });
          } catch (updateError) {
            console.error('Failed to update automation log:', updateError);
          }
        }

        return {
          success: true,
          messageId: result.messages[0].id
        };
      } else {
        console.error('WhatsApp API Error:', result);
        
        // Update automation log with failure
        if (logId) {
          try {
            await automationLogger.updateDeliveryStatus({
              logId,
              status: 'FAILED',
              deliveryDetails: {
                errorMessage: result.error?.message || 'Failed to send WhatsApp message',
              }
            });
          } catch (updateError) {
            console.error('Failed to update automation log:', updateError);
          }
        }

        return {
          success: false,
          error: result.error?.message || 'Failed to send WhatsApp message'
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp receipt:', error);
      
      // Update automation log with error
      if (logId) {
        try {
          await automationLogger.updateDeliveryStatus({
            logId,
            status: 'FAILED',
            deliveryDetails: {
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            }
          });
        } catch (updateError) {
          console.error('Failed to update automation log:', updateError);
        }
      }

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