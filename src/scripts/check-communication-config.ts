/**
 * Check Communication Configuration
 * This checks what communication settings exist and guides setup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function checkCommunicationConfig() {
  console.log('🔍 Checking Communication Configuration...\n');

  try {
    // Check all communication settings
    const allSettings = await prisma.communicationSettings.findMany({
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    console.log(`📊 Total Communication Settings: ${allSettings.length}`);

    if (allSettings.length === 0) {
      console.log('\n❌ No communication settings found!');
      console.log('💡 You need to create CommunicationSettings for your branches.');
      
      // Show available branches
      const branches = await prisma.branch.findMany({
        select: { id: true, name: true }
      });
      
      console.log('\n📋 Available branches to configure:');
      branches.forEach(branch => {
        console.log(`   - ${branch.name} (${branch.id})`);
      });
      
      console.log('\n🛠️  To create communication settings, you need to:');
      console.log('   1. Go to your app\'s settings/communication page');
      console.log('   2. Configure Meta WhatsApp API settings');
      console.log('   3. Set: metaPhoneNumberId, metaAccessToken, metaIsActive: true');
      
      return;
    }

    // Check each setting
    console.log('\n📋 Communication Settings by Branch:');
    allSettings.forEach(setting => {
      console.log(`\n🏢 ${setting.branch.name}:`);
      console.log(`   - Meta Active: ${setting.metaIsActive ? '✅' : '❌'}`);
      console.log(`   - Meta Phone Number ID: ${setting.metaPhoneNumberId ? '✅ Set' : '❌ Not set'}`);
      console.log(`   - Meta Access Token: ${setting.metaAccessToken ? '✅ Set' : '❌ Not set'}`);
      console.log(`   - Meta Business Account ID: ${setting.metaBusinessAccountId ? '✅ Set' : '❌ Not set'}`);
      console.log(`   - Webhook Verify Token: ${setting.metaWebhookVerifyToken ? '✅ Set' : '❌ Not set'}`);
      
      // Check if this branch can receive incoming messages
      const canReceiveMessages = setting.metaIsActive && 
                                setting.metaPhoneNumberId && 
                                setting.metaAccessToken;
      console.log(`   - Can Receive Messages: ${canReceiveMessages ? '✅' : '❌'}`);
    });

    // Check if any branch is properly configured
    const properlyConfigured = allSettings.filter(s => 
      s.metaIsActive && s.metaPhoneNumberId && s.metaAccessToken
    );

    if (properlyConfigured.length === 0) {
      console.log('\n❌ No branches are properly configured for incoming messages!');
      console.log('\n🛠️  To fix this, you need to:');
      console.log('   1. Set metaIsActive: true');
      console.log('   2. Set metaPhoneNumberId (from Meta WhatsApp API)');
      console.log('   3. Set metaAccessToken (from Meta WhatsApp API)');
      console.log('   4. Optionally set metaBusinessAccountId');
    } else {
      console.log(`\n✅ ${properlyConfigured.length} branch(es) properly configured:`);
      properlyConfigured.forEach(s => {
        console.log(`   - ${s.branch.name}`);
      });
    }

    // Show sample SQL to create/update settings
    console.log('\n📝 Sample SQL to configure settings:');
    const sampleBranch = allSettings[0] || { branchId: 'your-branch-id' };
    console.log(`
-- Update existing settings (replace values with your Meta WhatsApp API credentials)
UPDATE "CommunicationSettings" 
SET 
  "metaIsActive" = true,
  "metaPhoneNumberId" = 'your-phone-number-id-from-meta',
  "metaAccessToken" = 'your-access-token-from-meta',
  "metaBusinessAccountId" = 'your-business-account-id-from-meta',
  "metaWebhookVerifyToken" = 'your-webhook-verify-token',
  "updatedAt" = NOW()
WHERE "branchId" = '${sampleBranch.branchId}';

-- Or create new settings if none exist
INSERT INTO "CommunicationSettings" (
  "id", "branchId", "metaIsActive", "metaPhoneNumberId", 
  "metaAccessToken", "metaBusinessAccountId", "metaWebhookVerifyToken"
) VALUES (
  'cuid-generated-id',
  '${sampleBranch.branchId}',
  true,
  'your-phone-number-id-from-meta',
  'your-access-token-from-meta', 
  'your-business-account-id-from-meta',
  'your-webhook-verify-token'
);`);

    console.log('\n🌐 Don\'t forget to configure your webhook URL in Meta:');
    console.log(`   Webhook URL: ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/meta-whatsapp`);
    console.log('   Verify Token: (use the same token you set in metaWebhookVerifyToken)');

  } catch (error) {
    console.error('❌ Error checking configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCommunicationConfig().catch(console.error); 