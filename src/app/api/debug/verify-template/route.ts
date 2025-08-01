import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { templateId } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Get template from our database
    const dbTemplate = await db.whatsAppTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        metaTemplateName: true,
        metaTemplateId: true,
        templateVariables: true,
        templateBody: true,
      }
    });

    if (!dbTemplate) {
      return NextResponse.json({ error: 'Template not found in database' }, { status: 404 });
    }

    // Get template from Meta API
    const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
    const whatsappClient = getDefaultWhatsAppClient();
    
    const metaResponse = await whatsappClient.getTemplates();
    
    let metaTemplate = null;
    if (metaResponse.result && metaResponse.data) {
      metaTemplate = metaResponse.data.find(t => 
        t.name === dbTemplate.metaTemplateName && t.language === 'en'
      );
    }

    // Analyze template structure
    const analysis = {
      database: {
        id: dbTemplate.id,
        name: dbTemplate.name,
        metaTemplateName: dbTemplate.metaTemplateName,
        metaTemplateId: dbTemplate.metaTemplateId,
        hasVariables: !!(dbTemplate.templateVariables && Array.isArray(dbTemplate.templateVariables) && dbTemplate.templateVariables.length > 0),
        variableCount: Array.isArray(dbTemplate.templateVariables) ? dbTemplate.templateVariables.length : 0,
        variables: dbTemplate.templateVariables,
        body: dbTemplate.templateBody
      },
      meta: metaTemplate ? {
        id: metaTemplate.id,
        name: metaTemplate.name,
        language: metaTemplate.language,
        status: metaTemplate.status,
        category: metaTemplate.category,
        components: metaTemplate.components,
        hasBodyComponent: metaTemplate.components?.some(c => c.type === 'BODY'),
        bodyComponent: metaTemplate.components?.find(c => c.type === 'BODY'),
        expectedVariables: metaTemplate.components?.find(c => c.type === 'BODY')?.text?.match(/\{\{\d+\}\}/g)?.length || 0
      } : null,
      mismatch: {
        templateExists: !!metaTemplate,
        nameMatches: metaTemplate?.name === dbTemplate.metaTemplateName,
        variableCountMatches: metaTemplate ? 
          (metaTemplate.components?.find(c => c.type === 'BODY')?.text?.match(/\{\{\d+\}\}/g)?.length || 0) === (Array.isArray(dbTemplate.templateVariables) ? dbTemplate.templateVariables.length : 0)
          : false
      }
    };

    return NextResponse.json({
      success: true,
      analysis,
      recommendations: [
        !analysis.mismatch.templateExists && 'Template not found in Meta - may need to sync',
        !analysis.mismatch.nameMatches && 'Template name mismatch between database and Meta',
        !analysis.mismatch.variableCountMatches && 'Variable count mismatch - database and Meta have different variable expectations'
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Template verification error:', error);
    return NextResponse.json({ 
      error: 'Verification failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 