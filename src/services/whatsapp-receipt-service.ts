import { env } from "@/env.js";
import { db } from "@/server/db";

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
    let messageId: string | undefined;
    let messageRecipientId: string | undefined;
    
    try {
      // Create communication message in Message History (instead of Automation Logs)
      const communicationMessage = await db.communicationMessage.create({
        data: {
          title: `[Automation] Fee Receipt - ${data.receiptNumber}`,
          templateId: 'cme0icwzq00017ir5s9lunxya', // fee_receipt_automatic template ID
          messageType: 'WHATSAPP',
          recipientType: 'PARENTS', 
          status: 'PENDING',
          totalRecipients: 1,
          successfulSent: 0,
          failed: 0,
          branchId: data.branchId,
          createdBy: 'system' // Mark as automation message
        }
      });
      
      messageId = communicationMessage.id;

      // Create message recipient record
      const messageRecipient = await db.messageRecipient.create({
        data: {
          messageId: communicationMessage.id,
          recipientType: 'PARENT',
          recipientId: data.parentId || data.studentId || 'unknown',
          recipientName: data.parentName || 'Parent',
          recipientPhone: this.formatPhoneNumber(data.parentPhoneNumber),
          status: 'PENDING'
        }
      });
      
      messageRecipientId = messageRecipient.id;
      
    } catch (logError) {
      console.error('Failed to create message history log:', logError);
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

      // Construct receipt PDF URL with proper URL encoding
      const encodedReceiptNumber = encodeURIComponent(data.receiptNumber);
      const receiptPdfUrl = `${baseUrl}/api/receipts/${encodedReceiptNumber}/pdf`;

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

      // Prepare template message with document header (matching exact approved template structure)
      const templateMessage = {
        messaging_product: "whatsapp",
        to: cleanPhoneNumber,
        type: "template",
        template: {
          name: "fee_receipt_automatic", // This template has been approved with DOCUMENT header
          language: { code: "en" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: receiptPdfUrl
                    // Note: filename might not be needed for the template
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: data.parentName || "Parent" }, // {{1}} - Parent Name
                { type: "text", text: data.studentName }, // {{2}} - Student Name
                { type: "text", text: data.receiptNumber }, // {{3}} - Receipt Number
                { type: "text", text: formattedAmount }, // {{4}} - Amount Paid (no ₹ symbol, template has it)
                { type: "text", text: formattedDate } // {{5}} - Transaction Date/Payment Date
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
        const metaMessageId = result.messages[0].id;
        
        // Update message records with success
        try {
          if (messageId) {
            await db.communicationMessage.update({
              where: { id: messageId },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                successfulSent: 1,
                metaMessageId: metaMessageId
              }
            });
          }
          
          if (messageRecipientId) {
            await db.messageRecipient.update({
              where: { id: messageRecipientId },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                metaMessageId: metaMessageId
              }
            });
          }
        } catch (updateError) {
          console.error('Failed to update message history:', updateError);
        }

        return {
          success: true,
          messageId: metaMessageId
        };
      } else {
        console.error('WhatsApp API Error:', result);
        
        // Update message records with failure
        const errorMessage = result.error?.message || 'Failed to send WhatsApp message';
        try {
          if (messageId) {
            await db.communicationMessage.update({
              where: { id: messageId },
              data: {
                status: 'FAILED',
                failed: 1
              }
            });
          }
          
          if (messageRecipientId) {
            await db.messageRecipient.update({
              where: { id: messageRecipientId },
              data: {
                status: 'FAILED',
                errorMessage: errorMessage
              }
            });
          }
        } catch (updateError) {
          console.error('Failed to update message history:', updateError);
        }

        return {
          success: false,
          error: errorMessage
        };
      }

    } catch (error) {
      console.error('Error sending WhatsApp receipt:', error);
      
      // Update message records with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      try {
        if (messageId) {
          await db.communicationMessage.update({
            where: { id: messageId },
            data: {
              status: 'FAILED',
              failed: 1
            }
          });
        }
        
        if (messageRecipientId) {
          await db.messageRecipient.update({
            where: { id: messageRecipientId },
            data: {
              status: 'FAILED',
              errorMessage: errorMessage
            }
          });
        }
      } catch (updateError) {
        console.error('Failed to update message history:', updateError);
      }

      return {
        success: false,
        error: errorMessage
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
    
    const encodedReceiptNumber = encodeURIComponent(receiptNumber);
    return `${baseUrl}/api/receipts/${encodedReceiptNumber}/pdf`;
  }
}