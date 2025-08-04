/**
 * Debug script to check the registration template configuration
 * Run this to see exactly what variables are stored and expected
 */

import { db } from "../src/server/db";

async function debugRegistrationTemplate() {
  console.log("🔍 Debugging request_registration_link template...\n");

  try {
    // Find the template in the database
    const template = await db.whatsAppTemplate.findFirst({
      where: {
        metaTemplateName: 'request_registration_link'
      }
    });

    if (!template) {
      console.log("❌ Template not found in database");
      console.log("Available templates:");
      
      const allTemplates = await db.whatsAppTemplate.findMany({
        select: {
          id: true,
          name: true,
          metaTemplateName: true,
          metaTemplateStatus: true,
          templateVariables: true,
          isActive: true
        }
      });

      allTemplates.forEach(t => {
        console.log(`  - ${t.name} (${t.metaTemplateName}) - Status: ${t.metaTemplateStatus} - Variables: ${JSON.stringify(t.templateVariables)}`);
      });
      
      return;
    }

    console.log("✅ Template found:");
    console.log("─".repeat(50));
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.name}`);
    console.log(`Meta Template Name: ${template.metaTemplateName}`);
    console.log(`Meta Template Status: ${template.metaTemplateStatus}`);
    console.log(`Language: ${template.metaTemplateLanguage}`);
    console.log(`Category: ${template.category}`);
    console.log(`Status: ${template.status}`);
    console.log(`Is Active: ${template.isActive}`);
    console.log(`Created: ${template.createdAt}`);
    console.log(`Updated: ${template.updatedAt}`);
    console.log("─".repeat(50));
    
    console.log("\n📋 Template Variables:");
    console.log(JSON.stringify(template.templateVariables, null, 2));
    
    console.log("\n📝 Template Body:");
    console.log(template.templateBody);
    
    console.log("\n🔧 Expected Parameters:");
    if (template.templateVariables && template.templateVariables.length > 0) {
      template.templateVariables.forEach((variable, index) => {
        const placeholder = index === 0 ? "Parent Name" : index === 1 ? "Registration Link" : `Value ${index + 1}`;
        console.log(`  ${variable}: "${placeholder}"`);
      });
    } else {
      console.log("  No template variables defined");
    }
    
    console.log("\n✅ Template appears to be properly configured!");
    
  } catch (error) {
    console.error("❌ Error debugging template:", error);
    throw error;
  }
}

// Export for use in other scripts
export { debugRegistrationTemplate };

// Run if called directly
if (require.main === module) {
  debugRegistrationTemplate()
    .then(() => {
      console.log("\n🎉 Debug completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Debug failed:", error);
      process.exit(1);
    });
}