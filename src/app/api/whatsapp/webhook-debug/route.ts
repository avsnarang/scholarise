import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env.js";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';
    
    switch (action) {
      case 'status':
        return await checkWebhookStatus();
      case 'config':
        return await checkWebhookConfig();
      case 'recent':
        return await getRecentWebhooks();
      case 'messages':
        return await checkMessageStatuses();
      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['status', 'config', 'recent', 'messages']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Webhook debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

async function checkWebhookStatus() {
  console.log('🔍 Checking webhook configuration status...');
  
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`;
  
  const checks = {
    environment: {
      webhookUrl,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      webhookVerifyToken: !!env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      appSecret: !!env.META_WHATSAPP_APP_SECRET,
      accessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
    },
    requiredSettings: {
      webhookVerifyTokenLength: env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.length || 0,
      appSecretLength: env.META_WHATSAPP_APP_SECRET?.length || 0,
      accessTokenLength: env.META_WHATSAPP_ACCESS_TOKEN?.length || 0,
      phoneNumberIdFormat: /^\d+$/.exec(env.META_WHATSAPP_PHONE_NUMBER_ID) ? 'valid' : 'invalid'
    },
    recommendations: [] as string[]
  };
  
  // Generate recommendations
  if (!checks.environment.webhookVerifyToken) {
    checks.recommendations.push('Set META_WHATSAPP_WEBHOOK_VERIFY_TOKEN environment variable');
  }
  
  if (!checks.environment.appSecret) {
    checks.recommendations.push('Set META_WHATSAPP_APP_SECRET environment variable for webhook signature validation');
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    checks.recommendations.push('Set NEXT_PUBLIC_APP_URL to your public domain for webhook URL');
  }
  
  if (checks.requiredSettings.webhookVerifyTokenLength < 20) {
    checks.recommendations.push('Webhook verify token should be at least 20 characters long');
  }
  
  if (checks.requiredSettings.phoneNumberIdFormat === 'invalid') {
    checks.recommendations.push('Phone Number ID should contain only digits');
  }
  
  return NextResponse.json({
    success: true,
    webhookConfiguration: checks,
    timestamp: new Date().toISOString()
  });
}

async function checkWebhookConfig() {
  console.log('🔍 Checking Meta WhatsApp webhook configuration...');
  
  if (!env.META_WHATSAPP_ACCESS_TOKEN || !env.META_WHATSAPP_PHONE_NUMBER_ID) {
    return NextResponse.json({
      success: false,
      error: 'Missing Meta WhatsApp credentials'
    });
  }
  
  try {
    // Check webhook subscription status via Meta API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${env.META_WHATSAPP_PHONE_NUMBER_ID}?fields=webhook_configuration`,
      {
        headers: {
          'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check webhook configuration',
        details: data
      });
    }
    
    return NextResponse.json({
      success: true,
      webhookConfig: data,
      expectedWebhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function getRecentWebhooks() {
  console.log('🔍 Checking recent webhook activity...');
  
  try {
    // Check recent chat messages with delivery status
    const recentChatMessages = await db.chatMessage.findMany({
      where: {
        metaMessageId: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        metaMessageId: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        createdAt: true,
        direction: true,
        content: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Check recent message recipients with delivery status
    const recentRecipients = await db.messageRecipient.findMany({
      where: {
        metaMessageId: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        metaMessageId: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        recipientName: true,
        recipientPhone: true,
        createdAt: true,
        message: {
          select: {
            title: true,
            templateId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    const statistics = {
      chatMessages: {
        total: recentChatMessages.length,
        withDeliveryStatus: recentChatMessages.filter(m => m.deliveredAt).length,
        withReadStatus: recentChatMessages.filter(m => m.readAt).length,
        statusBreakdown: recentChatMessages.reduce((acc, msg) => {
          acc[msg.status] = (acc[msg.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      recipients: {
        total: recentRecipients.length,
        withDeliveryStatus: recentRecipients.filter(r => r.deliveredAt).length,
        withReadStatus: recentRecipients.filter(r => r.readAt).length,
        statusBreakdown: recentRecipients.reduce((acc, recipient) => {
          acc[recipient.status] = (acc[recipient.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    return NextResponse.json({
      success: true,
      recentActivity: {
        chatMessages: recentChatMessages,
        recipients: recentRecipients,
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function checkMessageStatuses() {
  console.log('🔍 Analyzing message delivery statuses...');
  
  try {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Check chat message delivery rates
    const chatStats = await db.chatMessage.aggregate({
      where: {
        metaMessageId: { not: null },
        createdAt: { gte: last7Days }
      },
      _count: {
        id: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true
      }
    });
    
    // Check bulk message delivery rates
    const recipientStats = await db.messageRecipient.aggregate({
      where: {
        metaMessageId: { not: null },
        createdAt: { gte: last7Days }
      },
      _count: {
        id: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true
      }
    });
    
    // Get status distribution
    const chatStatusDistribution = await db.chatMessage.groupBy({
      by: ['status'],
      where: {
        metaMessageId: { not: null },
        createdAt: { gte: last7Days }
      },
      _count: true
    });
    
    const recipientStatusDistribution = await db.messageRecipient.groupBy({
      by: ['status'],
      where: {
        metaMessageId: { not: null },
        createdAt: { gte: last7Days }
      },
      _count: true
    });
    
    const analysis = {
      chatMessages: {
        totalMessages: chatStats._count.id,
        sentConfirmations: chatStats._count.sentAt,
        deliveryConfirmations: chatStats._count.deliveredAt,
        readConfirmations: chatStats._count.readAt,
        deliveryRate: chatStats._count.id > 0 ? (chatStats._count.deliveredAt / chatStats._count.id * 100) : 0,
        readRate: chatStats._count.id > 0 ? (chatStats._count.readAt / chatStats._count.id * 100) : 0,
        statusDistribution: chatStatusDistribution.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>)
      },
      bulkMessages: {
        totalRecipients: recipientStats._count.id,
        sentConfirmations: recipientStats._count.sentAt,
        deliveryConfirmations: recipientStats._count.deliveredAt,
        readConfirmations: recipientStats._count.readAt,
        deliveryRate: recipientStats._count.id > 0 ? (recipientStats._count.deliveredAt / recipientStats._count.id * 100) : 0,
        readRate: recipientStats._count.id > 0 ? (recipientStats._count.readAt / recipientStats._count.id * 100) : 0,
        statusDistribution: recipientStatusDistribution.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    const issues = [];
    if (analysis.chatMessages.deliveryRate < 50) {
      issues.push('Low delivery rate for chat messages suggests webhook issues');
    }
    if (analysis.bulkMessages.deliveryRate < 50) {
      issues.push('Low delivery rate for bulk messages suggests webhook issues');
    }
    if (analysis.chatMessages.sentConfirmations === 0 && analysis.bulkMessages.sentConfirmations === 0) {
      issues.push('No sent confirmations received - webhooks may not be configured');
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      issues,
      recommendations: issues.length > 0 ? [
        'Check webhook URL configuration in Meta Business Manager',
        'Verify webhook verify token matches environment variable',
        'Ensure webhook is subscribed to message status events',
        'Check server logs for webhook processing errors'
      ] : ['Delivery tracking appears to be working correctly'],
      period: 'Last 7 days',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    if (action === 'simulate_webhook') {
      return await simulateWebhookCall(req);
    }
    
    return NextResponse.json({
      error: 'Invalid action',
      availableActions: ['simulate_webhook']
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function simulateWebhookCall(req: NextRequest) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`;
  
  // Simulate a delivery status webhook
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        value: {
          statuses: [{
            id: 'test_message_' + Date.now(),
            status: 'delivered',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: '1234567890'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature_for_simulation'
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseText = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      webhookUrl,
      testPayload,
      response: {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      webhookUrl,
      testPayload,
      timestamp: new Date().toISOString()
    });
  }
} 