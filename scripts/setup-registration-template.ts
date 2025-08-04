/**
 * Script to create or sync the request_registration_link WhatsApp template
 * This script should be run once to ensure the template exists in both Meta WhatsApp and local database
 */

import { db } from "../src/server/db";
import { getDefaultWhatsAppClient } from "../src/utils/whatsapp-api";

async function setupRegistrationTemplate() {
  console.log("🚀 Setting up request_registration_link template...");

  try {
    // Template content as specified by the user
    const templateBody = `Dear {{1}},

Here you go — as requested, please find the link to the Registration Form for admission at The Scholars' Home:

🔗 {{2}}
(If the link doesn't open, please copy and paste it into your browser.)

Once you submit the form, our Admissions Team will get in touch with you shortly.

If you need any help during the process, feel free to reach out.

📞 Admissions Helpdesk: +91-8628800056
📧 admissions@tsh.edu.in
🌐 www.tsh.edu.in

Warm regards`;

    // Check if template already exists locally
    const existingTemplate = await db.whatsAppTemplate.findFirst({
      where: {
        metaTemplateName: 'request_registration_link'
      }
    });

    if (existingTemplate) {
      console.log("✅ Template already exists locally:", existingTemplate.name);
      console.log("📋 Status:", existingTemplate.metaTemplateStatus);
      return existingTemplate;
    }

    // Check if template exists in Meta WhatsApp
    console.log("🔍 Checking Meta WhatsApp for existing template...");
    const whatsappClient = getDefaultWhatsAppClient();
    const templatesResponse = await whatsappClient.getTemplates();

    if (templatesResponse.result && templatesResponse.data) {
      const metaTemplate = templatesResponse.data.find(
        (t: any) => t.name === 'request_registration_link' && t.language === 'en'
      );

      if (metaTemplate) {
        console.log("✅ Template found in Meta WhatsApp, creating local record...");
        
        // Create local database record
        const localTemplate = await db.whatsAppTemplate.create({
          data: {
            name: 'Registration Link Request',
            description: 'Template for sending registration links to prospective parents',
            metaTemplateName: 'request_registration_link',
            metaTemplateLanguage: 'en',
            metaTemplateStatus: metaTemplate.status || 'APPROVED',
            metaTemplateId: metaTemplate.id,
            templateBody: templateBody,
            templateVariables: ['variable_1', 'variable_2'], // Use consistent variable names
            category: 'UTILITY',
            language: 'en',
            status: 'APPROVED',
            isActive: true,
            createdBy: 'system',
          }
        });

        console.log("✅ Local template created successfully:", localTemplate.id);
        return localTemplate;
      }
    }

    console.log("❌ Template not found in Meta WhatsApp");
    console.log("📝 Please follow these steps to create it:");
    console.log("");
    console.log("1. Go to Meta Business Manager (business.facebook.com)");
    console.log("2. Navigate to WhatsApp Manager");
    console.log("3. Go to Account Tools > Message Templates");
    console.log("4. Click 'Create Template'");
    console.log("5. Use these details:");
    console.log("   - Template Name: request_registration_link");
    console.log("   - Language: English");
    console.log("   - Category: Utility");
    console.log("   - Template Content:");
    console.log("");
    console.log(templateBody);
    console.log("");
    console.log("6. Submit for approval");
    console.log("7. Once approved, run: npm run sync-templates");
    console.log("");

    return null;

  } catch (error) {
    console.error("❌ Error setting up template:", error);
    throw error;
  }
}

// Export for use in other scripts
export { setupRegistrationTemplate };

// Run if called directly
if (require.main === module) {
  setupRegistrationTemplate()
    .then((result) => {
      if (result) {
        console.log("🎉 Template setup completed successfully!");
      } else {
        console.log("⚠️ Manual template creation required - see instructions above");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Setup failed:", error);
      process.exit(1);
    });
}