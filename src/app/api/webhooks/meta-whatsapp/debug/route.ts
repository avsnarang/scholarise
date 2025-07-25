import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'config':
        return NextResponse.json({
          webhookUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`,
          verifyToken: env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'NOT_SET',
          appSecret: env.META_WHATSAPP_APP_SECRET ? '✅ SET' : '❌ NOT_SET',
          environment: env.NODE_ENV,
          webhookConfigured: !!(env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN && env.META_WHATSAPP_APP_SECRET),
        });

      case 'recent-templates':
        const recentTemplates = await db.whatsAppTemplate.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            metaTemplateName: true,
            metaTemplateId: true,
            metaTemplateStatus: true,
            metaRejectionReason: true,
            metaApprovedAt: true,
            updatedAt: true,
          }
        });
        return NextResponse.json({ templates: recentTemplates });

      case 'recent-logs':
        const recentLogs = await db.communicationLog.findMany({
          where: {
            action: { in: ['template_status_update', 'template_submitted', 'template_deleted'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            action: true,
            description: true,
            metadata: true,
            createdAt: true,
          }
        });
        return NextResponse.json({ logs: recentLogs });

      case 'test-webhook':
        // Simulate a Meta webhook payload for testing
        const testPayload = {
          object: "whatsapp_business_account",
          entry: [{
            id: "test-business-account-id",
            changes: [{
              value: {
                event: "APPROVED",
                message_template_id: "test-template-id",
                message_template_name: "test_template",
                message_template_language: "en"
              },
              field: "message_template_status_update"
            }]
          }]
        };

        // Process the test webhook
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Request': 'true',
          },
          body: JSON.stringify(testPayload)
        });

        const result = await response.text();
        return NextResponse.json({
          testPayload,
          response: {
            status: response.status,
            statusText: response.statusText,
            body: result
          }
        });

      default:
        return NextResponse.json({
          available_actions: [
            'config - Show webhook configuration',
            'recent-templates - Show recently updated templates',
            'recent-logs - Show recent template-related logs',
            'test-webhook - Send a test webhook payload'
          ]
        });
    }
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
    const { templateName, templateLanguage, newStatus, reason } = body;

    if (!templateName || !newStatus) {
      return NextResponse.json({ error: 'templateName and newStatus are required' }, { status: 400 });
    }

    // Simulate Meta webhook payload
    const simulatedPayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "simulated-business-account-id",
        changes: [{
          value: {
            event: newStatus,
            message_template_id: `simulated-${Date.now()}`,
            message_template_name: templateName,
            message_template_language: templateLanguage || 'en',
            reason: reason || undefined
          },
          field: "message_template_status_update"
        }]
      }]
    };

    // Send to our own webhook endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/meta-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Request': 'true',
        'X-Simulated-Webhook': 'true',
      },
      body: JSON.stringify(simulatedPayload)
    });

    const result = await response.text();

    // Check if template was actually updated
    const updatedTemplate = await db.whatsAppTemplate.findFirst({
      where: {
        OR: [
          { metaTemplateName: templateName },
          { name: templateName }
        ],
        metaTemplateLanguage: templateLanguage || 'en'
      }
    });

    return NextResponse.json({
      simulatedPayload,
      webhookResponse: {
        status: response.status,
        body: result
      },
      templateAfterUpdate: updatedTemplate || 'Template not found in database',
      success: response.ok && updatedTemplate
    });

  } catch (error) {
    console.error('Simulated webhook error:', error);
    return NextResponse.json({ 
      error: 'Simulation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 