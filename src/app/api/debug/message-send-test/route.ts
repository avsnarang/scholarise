import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'test-connection') {
      // Test WhatsApp client initialization and connection
      const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
      
      try {
        const client = getDefaultWhatsAppClient();
        console.log('✅ WhatsApp client created successfully');
        
        // Test connection
        const connectionTest = await client.testConnection();
        
        return NextResponse.json({
          clientInitialized: true,
          connectionTest: {
            result: connectionTest.result,
            info: connectionTest.info,
            error: connectionTest.error
          },
          config: {
            hasAccessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
            hasPhoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
            hasBusinessAccountId: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
            phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
            apiVersion: env.META_WHATSAPP_API_VERSION || 'v21.0'
          }
        });
      } catch (clientError) {
        console.error('❌ Failed to create WhatsApp client:', clientError);
        return NextResponse.json({
          clientInitialized: false,
          error: clientError instanceof Error ? clientError.message : 'Unknown error',
          config: {
            hasAccessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
            hasPhoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
            hasBusinessAccountId: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
            phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
            apiVersion: env.META_WHATSAPP_API_VERSION || 'v21.0'
          }
        }, { status: 500 });
      }
    }

    // Default action - show available options
    return NextResponse.json({
      available_actions: [
        'test-connection - Test WhatsApp client initialization and connection'
      ],
      usage: 'GET /api/debug/message-send-test?action=test-connection'
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message, templateName } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Test sending a simple message
    const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
    
    try {
      const client = getDefaultWhatsAppClient();
      
      let response;
      if (templateName) {
        // Test template message
        response = await client.sendTemplateMessage({
          to: phone,
          templateName: templateName,
          templateLanguage: 'en',
          templateVariables: {}
        });
      } else {
        // Test text message
        const testMessage = message || 'Test message from Scholarise debug endpoint';
        response = await client.sendTextMessage(phone, testMessage);
      }

      return NextResponse.json({
        success: response.result,
        response: {
          result: response.result,
          info: response.info,
          error: response.error,
          data: response.data
        },
        testDetails: {
          phone,
          message: message || 'Test message',
          templateName: templateName || null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (sendError) {
      console.error('❌ Failed to send test message:', sendError);
      return NextResponse.json({
        success: false,
        error: sendError instanceof Error ? sendError.message : 'Unknown error',
        testDetails: {
          phone,
          message: message || 'Test message',
          templateName: templateName || null,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test send error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 