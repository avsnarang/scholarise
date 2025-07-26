/**
 * Test Incoming Message Webhook
 * This simulates a Meta WhatsApp webhook call to test incoming message processing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

interface TestIncomingMessagePayload {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages: Array<{
          from: string;
          id: string;
          timestamp: string;
          text: {
            body: string;
          };
          type: "text";
        }>;
      };
      field: "messages";
    }>;
  }>;
}

async function testIncomingMessage() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  console.log('🔍 Checking branch configuration...');
  
  try {
    // Get the first active branch with WhatsApp configuration
    const communicationSettings = await prisma.communicationSettings.findFirst({
      where: {
        metaIsActive: true,
        metaPhoneNumberId: { not: null }
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    if (!communicationSettings) {
      console.log('❌ No active WhatsApp configuration found!');
      console.log('💡 Make sure you have:');
      console.log('   1. CommunicationSettings configured for a branch');
      console.log('   2. metaIsActive: true');
      console.log('   3. metaPhoneNumberId set');
      
      // Show available branches
      const branches = await prisma.branch.findMany({
        take: 5,
        select: { id: true, name: true }
      });
      console.log('\n📋 Available branches:');
      branches.forEach(branch => {
        console.log(`   - ${branch.name} (${branch.id})`);
      });
      
      return { success: false, error: 'No WhatsApp configuration found' };
    }

    console.log(`✅ Found configuration for: ${communicationSettings.branch.name}`);
    console.log(`📱 Phone Number ID: ${communicationSettings.metaPhoneNumberId}`);

    // Simulate an incoming message from a test phone number
    const testPayload: TestIncomingMessagePayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "test-business-account-id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15551234567",
              phone_number_id: communicationSettings.metaPhoneNumberId!
            },
            messages: [{
              from: "919876543210", // Test phone number (without + prefix)
              id: `test_message_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: "Hello! This is a test message from a parent. 📱"
              },
              type: "text"
            }]
          },
          field: "messages"
        }]
      }]
    };

    console.log('\n🧪 Testing incoming message webhook...');
    console.log('📱 Test message from:', testPayload.entry[0].changes[0].value.messages[0].from);
    console.log('💬 Message content:', testPayload.entry[0].changes[0].value.messages[0].text.body);
    console.log('🏢 Branch:', communicationSettings.branch.name);

    // Send the test webhook
    const response = await fetch(`${baseUrl}/api/webhooks/meta-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Request': 'true', // Skip signature verification
        'X-Simulated-Webhook': 'true'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();
    
    console.log('\n📊 Webhook Response:');
    console.log('Status:', response.status, response.statusText);
    console.log('Body:', result);
    
    if (response.ok) {
      console.log('\n✅ Webhook processed successfully!');
      console.log('🔍 Check your chat app - you should see a new conversation/message from +919876543210');
      
      // Check if conversation was created
      const conversation = await prisma.conversation.findFirst({
        where: {
          participantPhone: 'whatsapp:+919876543210',
          branchId: communicationSettings.branchId
        },
        include: {
          _count: { select: { messages: true } }
        }
      });
      
      if (conversation) {
        console.log(`📝 Conversation found: ${conversation.participantName} (${conversation._count.messages} messages)`);
      } else {
        console.log('⚠️  No conversation found - check the logs for errors');
      }
    } else {
      console.log('\n❌ Webhook failed!');
    }

    return {
      success: response.ok,
      status: response.status,
      body: result,
      testPayload,
      branchConfig: {
        branchName: communicationSettings.branch.name,
        phoneNumberId: communicationSettings.metaPhoneNumberId
      }
    };

  } catch (error) {
    console.error('❌ Error testing webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIncomingMessage()
  .then(result => {
    console.log('\n🎯 Test completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.success) {
      console.log('✨ Your incoming message webhook is working!');
    } else {
      console.log('🔧 Check the configuration and try again');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

export { testIncomingMessage }; 