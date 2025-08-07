#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplateStatus() {
  try {
    console.log('📋 WhatsApp Template Status Report\n');

    // Get all WhatsApp templates
    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (templates.length === 0) {
      console.log('📭 No WhatsApp templates found.');
      console.log('💡 Run: npm run create:whatsapp-template');
      return;
    }

    console.log(`📊 Found ${templates.length} template(s):\n`);
    console.log('═'.repeat(80));

    for (const template of templates) {
      console.log(`📱 Template: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Meta Name: ${template.metaTemplateName || 'Not set'}`);
      console.log(`   Meta ID: ${template.metaTemplateId || 'Not submitted'}`);
      
      // Status with color coding
      const status = template.metaTemplateStatus || 'DRAFT';
      const statusIcon = getStatusIcon(status);
      console.log(`   Status: ${statusIcon} ${status}`);
      
      console.log(`   Category: ${template.category || 'Not set'}`);
      console.log(`   Language: ${template.language || 'en'}`);
      
      // Header info
      if (template.headerType) {
        console.log(`   Header: ${template.headerType}`);
        if (template.headerType === 'DOCUMENT' && template.headerMediaUrl) {
          console.log(`   Document: ${template.headerFilename || 'Fee_Receipt.pdf'}`);
          console.log(`   URL: ${template.headerMediaUrl}`);
        }
      } else {
        console.log(`   Header: None`);
      }
      
      // Footer
      if (template.footerText) {
        console.log(`   Footer: "${template.footerText}"`);
      }
      
      // Variables
      if (template.templateVariables && template.templateVariables.length > 0) {
        console.log(`   Variables: ${template.templateVariables.join(', ')}`);
      }
      
      console.log(`   Created: ${template.createdAt.toLocaleDateString()}`);
      console.log(`   Active: ${template.isActive ? '✅ Yes' : '❌ No'}`);
      
      console.log('─'.repeat(80));
    }

    // Summary and recommendations
    const approvedTemplates = templates.filter(t => t.metaTemplateStatus === 'APPROVED');
    const pendingTemplates = templates.filter(t => t.metaTemplateStatus === 'PENDING');
    const draftTemplates = templates.filter(t => !t.metaTemplateStatus || t.metaTemplateStatus === 'DRAFT');

    console.log('\n📈 Summary:');
    console.log(`   ✅ Approved: ${approvedTemplates.length}`);
    console.log(`   ⏳ Pending: ${pendingTemplates.length}`);
    console.log(`   📝 Draft: ${draftTemplates.length}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (draftTemplates.length > 0) {
      console.log('   • Submit draft templates to Meta for approval');
    }
    
    if (pendingTemplates.length > 0) {
      console.log('   • Wait for Meta approval (usually 24-48 hours)');
    }
    
    const approvedWithoutDocument = approvedTemplates.filter(t => 
      t.name === 'fee_receipt_automatic' && t.headerType !== 'DOCUMENT'
    );
    
    if (approvedWithoutDocument.length > 0) {
      console.log('   • Add DOCUMENT header to approved fee receipt template:');
      console.log('     npm run add:document-header');
    }
    
    if (approvedTemplates.length > 0) {
      console.log('   • Start using approved templates for automated messaging');
    }

    // Usage instructions for ready templates
    const readyTemplates = templates.filter(t => 
      t.metaTemplateStatus === 'APPROVED' && t.isActive
    );
    
    if (readyTemplates.length > 0) {
      console.log('\n🚀 Ready to Use:');
      readyTemplates.forEach(template => {
        console.log(`   📱 ${template.name} (${template.metaTemplateName})`);
        if (template.name === 'fee_receipt_automatic') {
          console.log('     Use for: Automated fee receipt delivery');
          console.log('     Endpoint: /api/receipts/{receiptNumber}/pdf');
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking template status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'APPROVED': return '✅';
    case 'PENDING': return '⏳';
    case 'REJECTED': return '❌';
    case 'DRAFT': return '📝';
    default: return '❓';
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  checkTemplateStatus()
    .then(() => {
      console.log('\n✅ Status check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Status check failed:', error);
      process.exit(1);
    });
}

export { checkTemplateStatus };