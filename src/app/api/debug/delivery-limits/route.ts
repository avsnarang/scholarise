import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    // Get detailed phone number info including messaging limits
    const phoneDetailResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}?fields=id,verified_name,display_phone_number,quality_rating,platform_type,account_mode,messaging_limit,throughput,status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const phoneDetailData = await phoneDetailResponse.json();

    // Get business account analytics and insights
    const analyticsResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_BUSINESS_ACCOUNT_ID}/conversation_analytics?start=1704067200&end=1735689599&granularity=DAILY&phone_numbers=[${env.META_WHATSAPP_PHONE_NUMBER_ID}]`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const analyticsData = await analyticsResponse.json();

    // Check if we can get messaging limits from insights
    const insightsResponse = await fetch(`https://graph.facebook.com/v21.0/${env.META_WHATSAPP_BUSINESS_ACCOUNT_ID}/insights?metric=messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const insightsData = await insightsResponse.json();

    // Try to get account status from app details
    const appResponse = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,category,restrictions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const appData = await appResponse.json();

    return NextResponse.json({
      phoneDetails: {
        status: phoneDetailResponse.ok,
        data: phoneDetailData,
        accountMode: phoneDetailData.account_mode || phoneDetailData.status || 'UNKNOWN',
        messagingLimit: phoneDetailData.messaging_limit || 'Not specified',
        throughput: phoneDetailData.throughput,
        qualityRating: phoneDetailData.quality_rating
      },
      analytics: {
        status: analyticsResponse.ok,
        data: analyticsData,
        error: analyticsData.error
      },
      insights: {
        status: insightsResponse.ok,
        data: insightsData,
        error: insightsData.error
      },
      app: {
        status: appResponse.ok,
        data: appData,
        restrictions: appData.restrictions
      },
      analysis: {
        accountMode: phoneDetailData.account_mode || phoneDetailData.status || 'UNKNOWN',
        isLiveMode: phoneDetailData.account_mode === 'LIVE',
        isSandboxMode: phoneDetailData.account_mode === 'SANDBOX',
        hasMessagingLimits: !!phoneDetailData.messaging_limit,
        qualityGood: phoneDetailData.quality_rating === 'GREEN',
        possibleIssues: [
          phoneDetailData.account_mode === 'SANDBOX' && 'Account in sandbox mode - can only message verified test numbers',
          phoneDetailData.quality_rating !== 'GREEN' && `Quality rating is ${phoneDetailData.quality_rating} - may affect delivery`,
          phoneDetailData.messaging_limit && `Messaging limits in place: ${JSON.stringify(phoneDetailData.messaging_limit)}`,
          !phoneDetailData.account_mode && 'Account mode unknown - possible API permission issue'
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Delivery limits check error:', error);
    return NextResponse.json({ 
      error: 'Limits check failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 