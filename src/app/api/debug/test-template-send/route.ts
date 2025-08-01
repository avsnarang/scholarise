import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { templateId, testPhone } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Get template details
    const template = await db.whatsAppTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        metaTemplateName: true,
        metaTemplateStatus: true,
        metaTemplateLanguage: true,
        templateVariables: true,
        templateBody: true,
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if template has variables
    const templateHasVariables = template.templateVariables && 
      Array.isArray(template.templateVariables) && 
      template.templateVariables.length > 0;

    console.log('🧪 Debug Test - Template Analysis:', {
      templateId: template.id,
      templateName: template.name,
      metaTemplateName: template.metaTemplateName,
      hasVariables: templateHasVariables,
      variableCount: template.templateVariables?.length || 0,
      variables: template.templateVariables,
      status: template.metaTemplateStatus
    });

    if (!template.metaTemplateName) {
      return NextResponse.json({ 
        error: 'Template missing metaTemplateName',
        template: template
      }, { status: 400 });
    }

    if (template.metaTemplateStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: `Template status is ${template.metaTemplateStatus}, not APPROVED`,
        template: template
      }, { status: 400 });
    }

    // Test with WhatsApp API
    const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
    const whatsappClient = getDefaultWhatsAppClient();

    // Prepare variables based on whether template has variables
    const templateVariables: Record<string, string> = {};
    if (templateHasVariables) {
      // For templates with variables, create test variables
      template.templateVariables.forEach((variable: string, index: number) => {
        templateVariables[`var${index + 1}`] = `Test ${variable}`;
      });
    }

    console.log('🧪 Debug Test - Sending with variables:', templateVariables);
    console.log('🧪 Debug Test - Will send templateVariables:', Object.keys(templateVariables).length > 0 ? templateVariables : undefined);

    const response = await whatsappClient.sendTemplateMessage({
      to: testPhone || '+919816900056', // Use provided phone or default
      templateName: template.metaTemplateName,
      templateLanguage: template.metaTemplateLanguage || 'en',
      templateVariables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        metaTemplateName: template.metaTemplateName,
        hasVariables: templateHasVariables,
        variableCount: template.templateVariables?.length || 0
      },
      testVariables: templateVariables,
      result: response,
      success: response.result
    });

  } catch (error) {
    console.error('Template send test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 