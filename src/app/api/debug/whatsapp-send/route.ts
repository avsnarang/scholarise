import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/env.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const templateId = searchParams.get('templateId');

    switch (action) {
      case 'config':
        // Check WhatsApp API configuration
        return NextResponse.json({
          environment: env.NODE_ENV,
          hasAccessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
          hasPhoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
          hasBusinessAccountId: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
          apiEndpoint: `https://graph.facebook.com/v18.0`,
          phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
          businessAccountId: env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || 'NOT_SET',
        });

      case 'templates':
        // Check available templates and their status
        const templates = await db.whatsAppTemplate.findMany({
          select: {
            id: true,
            name: true,
            metaTemplateName: true,
            metaTemplateId: true,
            metaTemplateStatus: true,
            metaTemplateLanguage: true,
            templateVariables: true,
            status: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });

        const templateIssues = templates.map(template => {
          const issues = [];
          if (!template.metaTemplateName) issues.push('Missing metaTemplateName');
          if (!template.metaTemplateStatus || template.metaTemplateStatus !== 'APPROVED') {
            issues.push(`Status: ${template.metaTemplateStatus || 'UNKNOWN'} (needs APPROVED)`);
          }
          if (!template.isActive) issues.push('Template not active');
          if (template.status !== 'APPROVED') issues.push(`Local status: ${template.status}`);
          
          return {
            ...template,
            issues: issues,
            canSend: issues.length === 0
          };
        });

        return NextResponse.json({ 
          total: templates.length,
          templates: templateIssues,
          readyToSend: templateIssues.filter(t => t.canSend).length,
          hasIssues: templateIssues.filter(t => t.issues.length > 0).length
        });

      case 'test-template':
        if (!templateId) {
          return NextResponse.json({ error: 'templateId parameter required' }, { status: 400 });
        }

        // Test specific template
        const template = await db.whatsAppTemplate.findUnique({
          where: { id: templateId }
        });

        if (!template) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Test the template configuration
        const checks = {
          templateExists: !!template,
          hasMetaTemplateName: !!template.metaTemplateName,
          isApproved: template.metaTemplateStatus === 'APPROVED',
          isActive: template.isActive,
          hasValidLanguage: !!template.metaTemplateLanguage,
          variablesCount: template.templateVariables?.length || 0,
        };

        const issues = [];
        if (!checks.hasMetaTemplateName) issues.push('Template missing metaTemplateName - required for Meta API');
        if (!checks.isApproved) issues.push(`Template status is ${template.metaTemplateStatus}, needs to be APPROVED in Meta`);
        if (!checks.isActive) issues.push('Template is inactive');
        if (!checks.hasValidLanguage) issues.push('Template missing language code');

        return NextResponse.json({
          template: {
            id: template.id,
            name: template.name,
            metaTemplateName: template.metaTemplateName,
            metaTemplateStatus: template.metaTemplateStatus,
            metaTemplateLanguage: template.metaTemplateLanguage,
            variables: template.templateVariables,
            body: template.templateBody
          },
          checks,
          issues,
          canSend: issues.length === 0,
          recommendation: issues.length > 0 ? 
            'Fix the issues above before attempting to send' : 
            'Template looks ready for sending'
        });

      case 'test-api':
        // Test Meta WhatsApp API connection
        try {
          const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
          const whatsappClient = getDefaultWhatsAppClient();
          
          const connectionTest = await whatsappClient.testConnection();
          
          return NextResponse.json({
            apiTest: connectionTest,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          return NextResponse.json({
            apiTest: {
              result: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              info: 'Failed to initialize WhatsApp client'
            },
            timestamp: new Date().toISOString()
          });
        }

      case 'recent-failures':
        // Check recent failed messages
        const recentMessages = await db.communicationMessage.findMany({
          where: {
            status: 'FAILED',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          include: {
            recipients: {
              select: {
                recipientName: true,
                recipientPhone: true,
                status: true,
                errorMessage: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        return NextResponse.json({
          recentFailures: recentMessages.map(msg => ({
            id: msg.id,
            title: msg.title,
            templateId: msg.templateId,
            status: msg.status,
            createdAt: msg.createdAt,
            totalRecipients: msg.totalRecipients,
            successfulSent: msg.successfulSent,
            failed: msg.failed,
            failedRecipients: msg.recipients.filter(r => r.status === 'FAILED').map(r => ({
              name: r.recipientName,
              phone: r.recipientPhone,
              error: r.errorMessage
            }))
          }))
        });

      case 'phone-validation':
        const testPhone = searchParams.get('phone');
        if (!testPhone) {
          return NextResponse.json({ error: 'phone parameter required' }, { status: 400 });
        }

        try {
          const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
          const whatsappClient = getDefaultWhatsAppClient();
          
          const validation = whatsappClient.validateWhatsAppNumber(testPhone);
          
          return NextResponse.json({
            original: testPhone,
            validation: validation,
            recommendation: validation.isValid ? 
              'Phone number format is valid' : 
              'Phone number format is invalid - should be 10-16 digits'
          });
        } catch (error) {
          return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            original: testPhone
          });
        }

      default:
        return NextResponse.json({
          available_actions: [
            'config - Check WhatsApp API configuration',
            'templates - List templates and their sending readiness',
            'test-template?templateId=xxx - Test specific template configuration',
            'test-api - Test Meta WhatsApp API connection',
            'recent-failures - Show recent failed message attempts',
            'phone-validation?phone=xxx - Test phone number format'
          ]
        });
    }
  } catch (error) {
    console.error('WhatsApp debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }

}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, templateId, phone, templateVariables } = body;

    if (action === 'test-send') {
      if (!templateId || !phone) {
        return NextResponse.json({ 
          error: 'templateId and phone are required for test send' 
        }, { status: 400 });
      }

      // Perform a test send to a single recipient
      const template = await db.whatsAppTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      if (!template.metaTemplateName) {
        return NextResponse.json({ 
          error: 'Template missing metaTemplateName - cannot send via Meta API' 
        }, { status: 400 });
      }

      if (template.metaTemplateStatus !== 'APPROVED') {
        return NextResponse.json({ 
          error: `Template status is ${template.metaTemplateStatus}, must be APPROVED to send` 
        }, { status: 400 });
      }

      try {
        const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
        const whatsappClient = getDefaultWhatsAppClient();
        
        const response = await whatsappClient.sendTemplateMessage({
          to: phone,
          templateName: template.metaTemplateName,
          templateLanguage: template.metaTemplateLanguage || 'en',
          templateVariables: templateVariables || {}
        });

        return NextResponse.json({
          testSend: response,
          template: {
            id: template.id,
            name: template.name,
            metaTemplateName: template.metaTemplateName,
            variables: template.templateVariables
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        return NextResponse.json({
          testSend: {
            result: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            info: 'Test send failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('WhatsApp debug POST error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 