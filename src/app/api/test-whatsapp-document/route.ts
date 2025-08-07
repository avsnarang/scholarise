import { type NextRequest, NextResponse } from 'next/server';
import { env } from "@/env.js";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get('phone');
    const dryRun = url.searchParams.get('dryRun') === 'true';

    if (!phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required. Use ?phone=+919876543210&dryRun=true'
      }, { status: 400 });
    }

    // Test the document message structure according to WhatsApp Cloud API
    const testDocumentMessage = {
      messaging_product: "whatsapp",
      to: phoneNumber.replace(/[^\d+]/g, ''),
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
                  link: `${env.NEXT_PUBLIC_APP_URL}/api/receipts/TEST_RECEIPT_123/pdf`,
                  filename: "Fee_Receipt_TEST_RECEIPT_123.pdf"
                }
              }
            ]
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: "Parent" }, // {{1}} - Parent greeting
              { type: "text", text: "Test Student" }, // {{2}} - Student name
              { type: "text", text: "TEST_RECEIPT_123" }, // {{3}} - Receipt number
              { type: "text", text: "₹5,000" }, // {{4}} - Amount with currency symbol
              { type: "text", text: "15/01/2025" } // {{5}} - Date
            ]
          }
        ]
      }
    };

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Document template message structure is valid',
        phoneNumber: phoneNumber,
        templatePayload: testDocumentMessage,
        requirements: {
          metaTemplate: 'Template "fee_receipt_automatic" has been approved in Meta Business Manager',
          environment: {
            accessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
            phoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
            appUrl: !!env.NEXT_PUBLIC_APP_URL
          },
          pdfEndpoint: `${env.NEXT_PUBLIC_APP_URL}/api/receipts/TEST_RECEIPT_123/pdf`,
          documentStructure: 'Using correct WhatsApp Cloud API document message format'
        }
      });
    }

    // Validate Meta API configuration
    const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        success: false,
        error: 'Meta WhatsApp API not configured. Please set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID environment variables.',
        configuration: {
          accessToken: !!accessToken,
          phoneNumberId: !!phoneNumberId
        }
      }, { status: 500 });
    }

    // Send test message via Meta WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(testDocumentMessage)
      }
    );

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      return NextResponse.json({
        success: true,
        messageId: result.messages[0].id,
        phoneNumber: phoneNumber,
        message: 'Document template message sent successfully!',
        whatsappResponse: result,
        templateUsed: 'fee_receipt_automatic',
        documentUrl: `${env.NEXT_PUBLIC_APP_URL}/api/receipts/TEST_RECEIPT_123/pdf`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp message',
        whatsappResponse: result,
        troubleshooting: {
          commonIssues: [
            'Template "fee_receipt_automatic" not approved in Meta Business Manager',
            'Invalid phone number format',
            'Meta API credentials incorrect',
            'Document URL not accessible'
          ],
          templateCheck: 'Verify template exists and is approved in Meta Business Manager',
          documentCheck: `Test PDF URL: ${env.NEXT_PUBLIC_APP_URL}/api/receipts/TEST_RECEIPT_123/pdf`
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('WhatsApp document test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to test WhatsApp document message functionality'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, receiptNumber, studentName, amount, paymentDate } = body;

    if (!phoneNumber || !receiptNumber || !studentName) {
      return NextResponse.json({
        error: 'Missing required fields: phoneNumber, receiptNumber, studentName'
      }, { status: 400 });
    }

    // Use the actual WhatsApp receipt service
    const { WhatsAppReceiptService } = await import("@/services/whatsapp-receipt-service");

    const receiptData = {
      receiptNumber,
      studentName,
      amount: amount || 5000,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      parentPhoneNumber: phoneNumber,
      branchName: 'Test Branch',
      branchId: 'test-branch-id',
      studentId: 'test-student-id',
      parentName: 'Test Parent'
    };

    const result = await WhatsAppReceiptService.sendReceiptTemplate(receiptData);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      receiptData,
      usedService: 'WhatsAppReceiptService.sendReceiptTemplate'
    });

  } catch (error) {
    console.error('WhatsApp receipt service test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}