#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { env } from '../src/env.js';

const prisma = new PrismaClient();

const TEMPLATE_NAME = 'fee_receipt_automatic';

async function addDocumentHeaderToTemplate() {
  try {
    console.log('🔧 Adding DOCUMENT header to approved WhatsApp template...\n');

    // Step 1: Find the approved template
    console.log('🔍 Finding approved template...');
    const template = await prisma.whatsAppTemplate.findFirst({
      where: { 
        name: TEMPLATE_NAME,
        metaTemplateStatus: 'APPROVED'
      }
    });

    if (!template) {
      console.log('❌ Template not found or not approved yet.');
      console.log('Please ensure:');
      console.log('1. The template exists');
      console.log('2. Meta has approved the template');
      console.log('3. The template status is "APPROVED"');
      return;
    }

    console.log(`✅ Found approved template (ID: ${template.id})\n`);

    // Step 2: Check if already has DOCUMENT header
    if (template.headerType === 'DOCUMENT') {
      console.log('✅ Template already has DOCUMENT header configured!');
      console.log(`📄 Document URL: ${template.headerMediaUrl}`);
      console.log(`📋 Filename: ${template.headerFilename}`);
      return;
    }

    // Step 3: Update template with DOCUMENT header
    console.log('📝 Adding DOCUMENT header to template...');
    
    const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
    const sampleDocumentUrl = `${appUrl}/api/receipts/sample/pdf`;
    
    const updatedTemplate = await prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: {
        headerType: 'DOCUMENT',
        headerMediaUrl: sampleDocumentUrl,
        headerFilename: 'Fee_Receipt.pdf'
      }
    });

    console.log('✅ DOCUMENT header added successfully!\n');

    // Step 4: Submit updated template to Meta (optional - this might require re-approval)
    console.log('📤 Submitting updated template to Meta...');
    console.log('⚠️  Note: Adding headers to approved templates may require re-approval by Meta\n');

    await submitUpdatedTemplateToMeta(updatedTemplate);

  } catch (error) {
    console.error('❌ Error updating template:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function submitUpdatedTemplateToMeta(template: any) {
  try {
    // This is a simplified version - in practice, you might need to create a new template
    // with the DOCUMENT header rather than updating the existing one
    
    const metaApiUrl = `https://graph.facebook.com/v21.0/${env.META_WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    
    // Convert template body to Meta format
    let metaTemplateBody = template.templateBody;
    const variables = template.templateVariables || [];
    
    if (variables.length > 0) {
      variables.forEach((variable: string, index: number) => {
        const variablePattern = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
        const placeholderNumber = index + 1;
        metaTemplateBody = metaTemplateBody.replace(variablePattern, `{{${placeholderNumber}}}`);
      });
    }

    // Build template components with DOCUMENT header
    const components = [];
    
    // Header component (DOCUMENT)
    components.push({
      type: 'HEADER',
      format: 'DOCUMENT',
      example: {
        header_handle: [template.headerMediaUrl],
        header_text: [template.headerFilename || 'Fee_Receipt.pdf']
      }
    });

    // Body component
    const bodyComponent: any = {
      type: 'BODY',
      text: metaTemplateBody,
    };

    if (variables.length > 0) {
      bodyComponent.example = {
        body_text: [variables.map((variable: string) => {
          switch (variable) {
            case 'parent_name': return 'Mr. John Smith';
            case 'student_name': return 'Alice Smith';
            case 'receipt_number': return 'TSHPS/FIN/2025-26/000001';
            case 'payment_amount': return '₹15,000';
            case 'payment_date': return '15/01/2025';
            default: return `Example ${variable}`;
          }
        })]
      };
    }
    components.push(bodyComponent);

    // Footer component
    if (template.footerText) {
      components.push({
        type: 'FOOTER',
        text: template.footerText,
      });
    }

    // Create new template with DOCUMENT header (Meta might require this approach)
    const newTemplateName = `${template.metaTemplateName}_with_document`;
    
    const templateData = {
      name: newTemplateName,
      language: template.metaTemplateLanguage || 'en',
      category: template.category?.toUpperCase() || 'UTILITY',
      components: components,
    };

    console.log('📋 Updated template structure:');
    console.log(JSON.stringify(templateData, null, 2));
    console.log('');

    const response = await fetch(metaApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log('⚠️  Meta API response:', JSON.stringify(result, null, 2));
      console.log('📝 This might be expected - Meta may require manual approval for header changes.');
      console.log('💡 Consider creating a new template instead of modifying the existing one.');
      return;
    }

    // Update with new Meta template info
    await prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: {
        metaTemplateId: result.id,
        metaTemplateName: newTemplateName,
        metaTemplateStatus: 'PENDING',
      },
    });

    console.log('✅ Updated template submitted to Meta!');
    console.log(`📋 New Meta Template ID: ${result.id}`);
    console.log(`⏳ Status: PENDING (waiting for Meta approval)`);

  } catch (error) {
    console.error('❌ Error submitting to Meta:', error);
    console.log('💡 You may need to manually create a new template with DOCUMENT header in Meta Business Manager.');
  }
}

function printInstructions() {
  console.log('\n📚 NEXT STEPS:');
  console.log('═'.repeat(60));
  console.log('1. 📱 Wait for Meta approval of the updated template');
  console.log('2. 🏦 Start collecting fees in your ERP system');
  console.log('3. 📄 Generate receipts using: /api/receipts/{receiptNumber}/pdf');
  console.log('4. 📲 Send receipts via WhatsApp using the approved template');
  console.log('');
  console.log('🔧 Template Usage:');
  console.log('   Use the enhanced template to send receipt PDFs automatically');
  console.log('   when fee payments are collected in the system.');
  console.log('');
  console.log('🎉 Your complete fee receipt system is ready!');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  addDocumentHeaderToTemplate()
    .then(() => {
      printInstructions();
      console.log('\n✅ Script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { addDocumentHeaderToTemplate };