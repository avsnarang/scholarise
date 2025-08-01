import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env.js";

export async function POST(req: NextRequest) {
  try {
    const { templateName, phone } = await req.json();

    if (!templateName) {
      return NextResponse.json({ error: 'templateName is required' }, { status: 400 });
    }

    // Create the most minimal possible payload for Meta API
    const minimalPayload = {
      messaging_product: 'whatsapp',
      to: phone || '+919816900056',
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        }
        // NO components field at all
      }
    };

    console.log('🧪 Minimal Test Payload:', JSON.stringify(minimalPayload, null, 2));

    // Send directly to Meta API
    const response = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalPayload),
    });

    const data = await response.json();
    
    console.log('🧪 Meta API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });

    return NextResponse.json({
      request: {
        payload: minimalPayload,
        url: `https://graph.facebook.com/v21.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`,
        headers: {
          'Authorization': 'Bearer [HIDDEN]',
          'Content-Type': 'application/json'
        }
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        data: data,
        success: response.ok
      }
    });

  } catch (error) {
    console.error('Minimal template test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 