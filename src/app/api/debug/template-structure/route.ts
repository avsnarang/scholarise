import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');
    const templateName = searchParams.get('templateName');

    if (!templateId && !templateName) {
      // List all templates with their structure
      const templates = await db.whatsAppTemplate.findMany({
        select: {
          id: true,
          name: true,
          metaTemplateName: true,
          metaTemplateStatus: true,
          metaTemplateLanguage: true,
          templateVariables: true,
          templateBody: true,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });

      const templateAnalysis = templates.map(template => {
        const issues = [];
        
        if (!template.metaTemplateName) issues.push('Missing metaTemplateName');
        if (template.metaTemplateStatus !== 'APPROVED') issues.push(`Status: ${template.metaTemplateStatus}`);
        if (!template.isActive) issues.push('Template inactive');
        
        // Analyze template variables
        const templateVars = Array.isArray(template.templateVariables) ? template.templateVariables : [];
        const bodyVariables = template.templateBody ? 
          (template.templateBody.match(/\{\{[^}]+\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '').trim()) : [];

        return {
          id: template.id,
          name: template.name,
          metaTemplateName: template.metaTemplateName,
          status: template.metaTemplateStatus,
          language: template.metaTemplateLanguage || 'en',
          issues: issues.length > 0 ? issues : null,
          variableStructure: {
            definedVariables: templateVars,
            bodyVariables: bodyVariables,
            expectedParameters: templateVars.map((_, i) => `var${i + 1}`),
            variableCount: templateVars.length
          }
        };
      });

      return NextResponse.json({ templates: templateAnalysis });
    }

    // Get specific template analysis
    const template = await db.whatsAppTemplate.findFirst({
      where: templateId ? { id: templateId } : { name: templateName },
      select: {
        id: true,
        name: true,
        metaTemplateName: true,
        metaTemplateStatus: true,
        metaTemplateLanguage: true,
        templateVariables: true,
        templateBody: true,
        isActive: true,
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Detailed analysis of this template
    const templateVars = Array.isArray(template.templateVariables) ? template.templateVariables : [];
    const bodyVariables = template.templateBody ? 
      (template.templateBody.match(/\{\{[^}]+\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '').trim()) : [];

    const analysis = {
      template: {
        id: template.id,
        name: template.name,
        metaTemplateName: template.metaTemplateName,
        status: template.metaTemplateStatus,
        language: template.metaTemplateLanguage || 'en',
        isActive: template.isActive,
        body: template.templateBody
      },
      variableAnalysis: {
        definedVariables: templateVars,
        bodyVariables: bodyVariables,
        variableMismatch: templateVars.length !== bodyVariables.length,
        expectedParameterFormat: templateVars.reduce((acc, varName, index) => {
          acc[`var${index + 1}`] = `Value for ${varName}`;
          return acc;
        }, {} as Record<string, string>)
      },
      metaCompatibility: {
        hasMetaTemplateName: !!template.metaTemplateName,
        isApproved: template.metaTemplateStatus === 'APPROVED',
        isActive: template.isActive,
        canSendMessages: !!(template.metaTemplateName && template.metaTemplateStatus === 'APPROVED' && template.isActive)
      },
      suggestedTestPayload: {
        templateId: template.id,
        templateParameters: templateVars.reduce((acc, varName, index) => {
          acc[`var${index + 1}`] = `Test ${varName}`;
          return acc;
        }, {} as Record<string, string>)
      }
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Template structure analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { templateId, testParameters } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Get template
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

    // Validate parameters against template
    const { prepareTemplateParameters } = await import("@/utils/template-validator");
    const { parameters, validation } = prepareTemplateParameters(
      {
        id: template.id,
        name: template.name,
        metaTemplateName: template.metaTemplateName!,
        metaTemplateLanguage: template.metaTemplateLanguage,
        templateVariables: template.templateVariables,
        templateBody: template.templateBody
      },
      testParameters || {}
    );

    // Test what would be sent to Meta API
    const metaPayload = {
      messaging_product: 'whatsapp',
      to: '+1234567890', // dummy number
      template: {
        name: template.metaTemplateName,
        language: {
          code: template.metaTemplateLanguage || 'en'
        },
        components: Object.keys(parameters).length > 0 ? [{
          type: 'body',
          parameters: Object.entries(parameters)
            .sort(([a], [b]) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/\D/g, '')) || 0;
              return numA - numB;
            })
            .map(([_, value]) => ({
              type: 'text',
              text: String(value || '')
            }))
        }] : undefined
      }
    };

    return NextResponse.json({
      template: {
        name: template.name,
        metaTemplateName: template.metaTemplateName,
        status: template.metaTemplateStatus
      },
      inputParameters: testParameters,
      processedParameters: parameters,
      validation: validation,
      metaApiPayload: metaPayload,
      recommendations: [
        !template.metaTemplateName && 'Template missing metaTemplateName - sync with Meta first',
        template.metaTemplateStatus !== 'APPROVED' && `Template status is ${template.metaTemplateStatus} - needs to be APPROVED`,
        validation.errors.length > 0 && `Parameter errors: ${validation.errors.join(', ')}`,
        validation.warnings.length > 0 && `Warnings: ${validation.warnings.join(', ')}`
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Template test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 