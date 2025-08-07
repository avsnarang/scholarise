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
  
  // Environment-specific configuration
  private static readonly isVercel = !!process.env.VERCEL;
  private static readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Check if PDF is available and ready (optimized for Vercel)
   */
  private static async isPdfReady(pdfUrl: string, useLightweight: boolean = false): Promise<boolean> {
    // Environment-specific configuration
    const maxRetries = this.isVercel ? 8 : 5; // Reduced retries for faster fallback
    const baseDelay = this.isVercel ? 1500 : 1000; // Shorter delays
    
    console.log(`🔧 PDF availability check (Environment: ${this.isVercel ? 'Vercel' : 'Local'}, Mode: ${useLightweight ? 'Lightweight' : 'Standard'}, Max retries: ${maxRetries})`);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Checking PDF availability (attempt ${attempt}/${maxRetries}): ${pdfUrl}`);
        
        const response = await fetch(pdfUrl, { 
          method: 'HEAD',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'User-Agent': 'WhatsApp/2.0'
          }
        });
        
        if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
          console.log(`✅ PDF is ready (attempt ${attempt}): ${pdfUrl}`);
          return true;
        }
        
        console.log(`⏳ PDF not ready yet (attempt ${attempt}/${maxRetries}), status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
      } catch (error) {
        console.log(`⚠️ PDF check failed (attempt ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : 'Unknown error');
      }
      
      if (attempt < maxRetries) {
        // Environment-optimized delays
        let delayMs;
        if (this.isVercel) {
          // Vercel: 2.5s, 3s, 4s, 5s, 6s, 7s, 8s, 9s, 10s, 12s, 14s, 16s
          delayMs = attempt <= 3 ? baseDelay + (attempt - 1) * 500 : baseDelay + 1000 * attempt;
        } else {
          // Local: 1.5s, 2s, 2.5s, 3s, 3.5s, 4s, 4.5s, 5s
          delayMs = baseDelay + (attempt - 1) * 500;
        }
        console.log(`⏱️ Waiting ${delayMs}ms before next attempt (${this.isVercel ? 'Vercel' : 'Local'} mode)...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log(`❌ PDF not ready after ${maxRetries} attempts: ${pdfUrl}`);
    return false;
  }

  /**
   * Test external accessibility of PDF URL (simulates WhatsApp's access)
   */
  private static async testExternalAccess(pdfUrl: string): Promise<{ accessible: boolean; error?: string; details?: any }> {
    try {
      console.log(`🌐 Testing external accessibility: ${pdfUrl}`);
      
      // Test with headers that WhatsApp might use
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WhatsApp/2.0',
          'Accept': 'application/pdf,*/*',
          'Cache-Control': 'no-cache'
        },
        // Environment-specific timeout
        signal: AbortSignal.timeout(this.isVercel ? 20000 : 10000) // Reduced timeout
      });

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      if (!response.ok) {
        return {
          accessible: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        };
      }

      if (!contentType?.includes('application/pdf')) {
        return {
          accessible: false,
          error: `Invalid content type: ${contentType}`,
          details: { contentType, contentLength }
        };
      }

      // Check if content exists (reduced minimum size for lightweight PDFs)
      const contentLengthNum = contentLength ? parseInt(contentLength) : 0;
      if (contentLengthNum < 100) { // Minimum PDF size reduced
        return {
          accessible: false,
          error: `Content too small: ${contentLengthNum} bytes`,
          details: { contentLength: contentLengthNum }
        };
      }

      console.log(`✅ External access successful: ${contentType}, ${contentLength} bytes`);
      return { 
        accessible: true, 
        details: { 
          contentType, 
          contentLength: contentLengthNum,
          status: response.status 
        } 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ External access test failed: ${errorMessage}`);
      return {
        accessible: false,
        error: errorMessage,
        details: { 
          errorType: error?.constructor.name,
          isTimeout: errorMessage.includes('timeout') || errorMessage.includes('aborted')
        }
      };
    }
  }

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

      // Construct receipt PDF URLs with proper URL encoding
      const encodedReceiptNumber = encodeURIComponent(data.receiptNumber);
      const standardPdfUrl = `${baseUrl}/api/receipts/${encodedReceiptNumber}/pdf`;
      const lightweightPdfUrl = `${baseUrl}/api/receipts/${encodedReceiptNumber}/pdf-light`;

      console.log(`🔄 Starting PDF availability check for receipt: ${data.receiptNumber} (Environment: ${this.isVercel ? 'Vercel' : 'Local'})`);;
      
      // Try standard PDF first, then fallback to lightweight
      let receiptPdfUrl = standardPdfUrl;
      let isPdfAvailable = await this.isPdfReady(standardPdfUrl, false);
      
      if (!isPdfAvailable) {
        console.log(`⚠️ Standard PDF not ready, trying lightweight version for receipt: ${data.receiptNumber}`);
        
        // Try lightweight PDF as fallback
        receiptPdfUrl = lightweightPdfUrl;
        isPdfAvailable = await this.isPdfReady(lightweightPdfUrl, true);
        
        if (!isPdfAvailable) {
          const errorMessage = `Both standard and lightweight PDF generation failed for receipt: ${data.receiptNumber}`;
          console.error(`❌ ${errorMessage}`);
          
          // Log debugging info
          console.error(`🔍 PDF generation debugging:`, {
            receiptNumber: data.receiptNumber,
            standardUrl: standardPdfUrl,
            lightweightUrl: lightweightPdfUrl,
            environment: this.isVercel ? 'Vercel' : 'Local',
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`✅ Using lightweight PDF for receipt: ${data.receiptNumber}`);
        }
      } else {
        console.log(`✅ Using standard PDF for receipt: ${data.receiptNumber}`);
      }
      
      if (!isPdfAvailable) {
        const errorMessage = `Both standard and lightweight PDF generation failed for receipt: ${data.receiptNumber}`;
        
        // Update message records with failure
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

      console.log(`✅ PDF is ready, testing external accessibility for receipt: ${data.receiptNumber}`);
      
      // Test external accessibility (simulates WhatsApp's access)
      const externalAccess = await this.testExternalAccess(receiptPdfUrl);
      
      if (!externalAccess.accessible) {
        const errorMessage = `PDF not externally accessible for WhatsApp: ${externalAccess.error}`;
        console.error(`❌ ${errorMessage}`, externalAccess.details);
        
        // Update message records with failure
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
                errorMessage: `${errorMessage} - Details: ${JSON.stringify(externalAccess.details)}`
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

      console.log(`✅ PDF is externally accessible, proceeding with WhatsApp message for receipt: ${data.receiptNumber}`);

      // Format amount in Indian currency
      const formattedAmount = data.amount.toLocaleString('en-IN');

      // Format date
      const formattedDate = data.paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Clean phone number for WhatsApp format
      const cleanPhoneNumber = WhatsAppReceiptService.formatPhoneNumber(data.parentPhoneNumber);

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
                    link: receiptPdfUrl,
                    filename: `${data.receiptNumber}.pdf`
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
        `${WhatsAppReceiptService.META_API_BASE}/${WhatsAppReceiptService.API_VERSION}/${phoneNumberId}/messages`,
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
        
        // Check for specific media upload errors
        let errorMessage = result.error?.message || 'Failed to send WhatsApp message';
        let isMediaError = false;
        
        if (result.error?.code === 131047 || result.error?.message?.includes('media')) {
          isMediaError = true;
          errorMessage = `Media upload failed: ${result.error?.message || 'PDF document could not be uploaded'}`;
          console.error(`📎 Media upload error detected for receipt ${data.receiptNumber}:`, {
            errorCode: result.error?.code,
            errorMessage: result.error?.message,
            pdfUrl: receiptPdfUrl,
            errorDetails: result.error
          });
        }
        
        // Update message records with failure
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
                errorMessage: `${errorMessage}${isMediaError ? ` (PDF URL: ${receiptPdfUrl})` : ''}`
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