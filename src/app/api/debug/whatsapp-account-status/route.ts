import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    // Check phone number status
    const phoneResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const phoneData = await phoneResponse.json();

    // Check business account status
    const businessResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_BUSINESS_ACCOUNT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const businessData = await businessResponse.json();

    // Get messaging limits
    const limitsResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_BUSINESS_ACCOUNT_ID}?fields=message_template_namespace,account_review_status,business_verification_status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const limitsData = await limitsResponse.json();

    return NextResponse.json({
      phoneNumber: {
        status: phoneResponse.ok,
        data: phoneData,
        verified: phoneData.verified_name || 'Not verified',
        displayNumber: phoneData.display_phone_number,
        accountMode: phoneData.account_mode || 'Unknown'
      },
      businessAccount: {
        status: businessResponse.ok,
        data: businessData,
        name: businessData.name || 'Unknown'
      },
      restrictions: {
        status: limitsResponse.ok,
        data: limitsData,
        reviewStatus: limitsData.account_review_status,
        businessVerified: limitsData.business_verification_status,
        namespace: limitsData.message_template_namespace
      },
      analysis: {
        canSendToAnyNumber: phoneData.account_mode === 'LIVE',
        isInSandboxMode: phoneData.account_mode === 'SANDBOX',
        businessVerified: limitsData.business_verification_status === 'verified',
        accountApproved: limitsData.account_review_status === 'APPROVED'
      }
    });

  } catch (error) {
    console.error('WhatsApp account status check error:', error);
    return NextResponse.json({ 
      error: 'Status check failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 