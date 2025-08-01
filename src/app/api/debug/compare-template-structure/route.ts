import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { templateId } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Get template from database
    const dbTemplate = await db.whatsAppTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        metaTemplateName: true,
        metaTemplateId: true,
        templateVariables: true,
        templateBody: true,
        metaTemplateLanguage: true,
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
        t.name === dbTemplate.metaTemplateName && 
        t.language === (dbTemplate.metaTemplateLanguage || 'en')
      );
    }

    if (!metaTemplate) {
      return NextResponse.json({ 
        error: 'Template not found in Meta API',
        dbTemplate: {
          name: dbTemplate.name,
          metaTemplateName: dbTemplate.metaTemplateName,
          language: dbTemplate.metaTemplateLanguage
        }
      }, { status: 404 });
    }

    // Analyze Meta template structure
    const bodyComponent = metaTemplate.components?.find(c => c.type === 'BODY');
    const metaTemplateText = bodyComponent?.text || '';
    
    // Extract expected variables from Meta template ({{1}}, {{2}}, etc.)
    const metaVariableMatches = metaTemplateText.match(/\{\{\d+\}\}/g) || [];
    const metaExpectedVariableCount = metaVariableMatches.length;
    const metaVariableNumbers = metaVariableMatches
      .map(match => parseInt(match.replace(/\{\{|\}\}/g, '')))
      .sort((a, b) => a - b);

    // Analyze database template variables
    const dbVariables = Array.isArray(dbTemplate.templateVariables) ? dbTemplate.templateVariables : [];
    const dbVariableCount = dbVariables.length;

    // Create comparison
    const comparison = {
      database: {
        templateId: dbTemplate.id,
        name: dbTemplate.name,
        metaTemplateName: dbTemplate.metaTemplateName,
        templateBody: dbTemplate.templateBody,
        variableCount: dbVariableCount,
        variables: dbVariables,
        hasVariables: dbVariableCount > 0
      },
      meta: {
        id: metaTemplate.id,
        name: metaTemplate.name,
        language: metaTemplate.language,
        status: metaTemplate.status,
        category: metaTemplate.category,
        bodyText: metaTemplateText,
        expectedVariableCount: metaExpectedVariableCount,
        expectedVariableNumbers: metaVariableNumbers,
        components: metaTemplate.components
      },
      analysis: {
        variableCountMatch: dbVariableCount === metaExpectedVariableCount,
        variableCountDifference: metaExpectedVariableCount - dbVariableCount,
        templateExists: true,
        nameMatches: metaTemplate.name === dbTemplate.metaTemplateName,
        
        issues: [
          dbVariableCount !== metaExpectedVariableCount && `Variable count mismatch: DB has ${dbVariableCount}, Meta expects ${metaExpectedVariableCount}`,
          metaExpectedVariableCount > 0 && dbVariableCount === 0 && 'Meta template has variables but database shows none',
          dbVariableCount > 0 && metaExpectedVariableCount === 0 && 'Database has variables but Meta template has none',
          !metaVariableNumbers.every((num, index) => num === index + 1) && 'Meta template variable numbering is not sequential (should be {{1}}, {{2}}, {{3}}, etc.)'
        ].filter(Boolean),
        
        recommendations: [
          dbVariableCount !== metaExpectedVariableCount && 'Sync database template variables to match Meta template structure',
          metaExpectedVariableCount > dbVariableCount && `Add ${metaExpectedVariableCount - dbVariableCount} more variables to database`,
          dbVariableCount > metaExpectedVariableCount && `Remove ${dbVariableCount - metaExpectedVariableCount} variables from database or update Meta template`
        ].filter(Boolean)
      },
      
      // Show what parameters would be sent vs expected
      parameterMapping: {
        whatWeWouldSend: dbVariables.reduce((acc, variable, index) => {
          acc[`var${index + 1}`] = `value_for_${variable}`;
          return acc;
        }, {} as Record<string, string>),
        
        whatMetaExpects: metaVariableNumbers.reduce((acc, variableNumber) => {
          acc[`var${variableNumber}`] = `value_for_variable_${variableNumber}`;
          return acc;
        }, {} as Record<string, string>),
        
        expectedParameterStructure: metaExpectedVariableCount > 0 ? {
          type: 'body',
          parameters: metaVariableNumbers.map(num => ({
            type: 'text',
            text: `[value_for_variable_${num}]`
          }))
        } : null
      }
    };

    return NextResponse.json({
      success: true,
      comparison,
      quickFix: comparison.analysis.variableCountMatch ? 
        'Variable counts match - issue might be in parameter naming or order' :
        `Update database to have ${metaExpectedVariableCount} variables to match Meta template`
    });

  } catch (error) {
    console.error('Template comparison error:', error);
    return NextResponse.json({ 
      error: 'Comparison failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 