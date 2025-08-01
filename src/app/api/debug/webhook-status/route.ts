import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Check recent messages and their status updates
    const recentMessages = await db.messageRecipient.findMany({
      where: {
        createdAt: { gte: last7Days }
      },
      select: {
        id: true,
        recipientPhone: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        metaMessageId: true,
        createdAt: true,
        errorMessage: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Calculate delivery statistics
    const stats = {
      total: recentMessages.length,
      withMetaId: recentMessages.filter(m => m.metaMessageId).length,
      withoutMetaId: recentMessages.filter(m => !m.metaMessageId).length,
      sent: recentMessages.filter(m => m.status === 'SENT').length,
      delivered: recentMessages.filter(m => m.status === 'DELIVERED').length,
      read: recentMessages.filter(m => m.status === 'READ').length,
      failed: recentMessages.filter(m => m.status === 'FAILED').length,
      pending: recentMessages.filter(m => m.status === 'PENDING').length,
      
      // Webhook update analysis
      sentButNoDelivery: recentMessages.filter(m => 
        m.status === 'SENT' && !m.deliveredAt && m.metaMessageId
      ).length,
      
      deliveredButNoRead: recentMessages.filter(m => 
        m.status === 'DELIVERED' && !m.readAt && m.metaMessageId
      ).length,
      
      hasDeliveryUpdates: recentMessages.filter(m => m.deliveredAt).length,
      hasReadUpdates: recentMessages.filter(m => m.readAt).length,
    };

    // Check for potential webhook issues
    const potentialIssues = [];
    
    if (stats.withMetaId > 0 && stats.hasDeliveryUpdates === 0) {
      potentialIssues.push("No delivery updates received despite having Meta message IDs");
    }
    
    if (stats.sentButNoDelivery > 5) {
      potentialIssues.push(`${stats.sentButNoDelivery} messages sent but no delivery confirmations`);
    }
    
    if (stats.withoutMetaId > stats.withMetaId) {
      potentialIssues.push("More messages without Meta IDs than with - sending might be failing");
    }

    // Recent webhook logs (if any)
    const recentWebhookActivity = await db.communicationLog.findMany({
      where: {
        action: { contains: 'webhook' },
        createdAt: { gte: last24Hours }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeframe: "Last 7 days",
      statistics: stats,
      deliveryRate: stats.total > 0 ? (stats.delivered / stats.total * 100).toFixed(1) : "0",
      readRate: stats.total > 0 ? (stats.read / stats.total * 100).toFixed(1) : "0",
      potentialIssues,
      recentWebhookActivity: recentWebhookActivity.length,
      recommendations: [
        stats.hasDeliveryUpdates === 0 ? "Check Meta webhook configuration for 'message_deliveries' subscription" : null,
        stats.sentButNoDelivery > 0 ? "Verify webhook endpoint is accessible and processing correctly" : null,
        stats.withoutMetaId > 0 ? "Check edge function logs for message sending failures" : null,
      ].filter(Boolean),
      sampleMessages: recentMessages.slice(0, 5).map(m => ({
        id: m.id.slice(0, 8),
        phone: m.recipientPhone?.slice(-4) || 'N/A',
        status: m.status,
        hasMetaId: !!m.metaMessageId,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        age: Math.round((Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60)) + ' min ago'
      }))
    });

  } catch (error) {
    console.error('Error in webhook status check:', error);
    return NextResponse.json(
      { error: 'Failed to check webhook status' },
      { status: 500 }
    );
  }
} 