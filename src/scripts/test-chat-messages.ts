/**
 * Test Chat Messages Access
 * This will help debug why messages aren't showing in the chat interface
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function testChatMessages() {
  console.log('🔍 Testing Chat Messages Access...\n');

  try {
    // Get a sample conversation
    const sampleConversation = await prisma.conversation.findFirst({
      where: { isActive: true },
      include: {
        _count: { select: { messages: true } },
        branch: { select: { name: true } }
      }
    });

    if (!sampleConversation) {
      console.log('❌ No conversations found');
      return;
    }

    console.log('📝 Testing Conversation:');
    console.log(`  - ID: ${sampleConversation.id}`);
    console.log(`  - Participant: ${sampleConversation.participantName}`);
    console.log(`  - Branch: ${sampleConversation.branch?.name}`);
    console.log(`  - Message Count: ${sampleConversation._count.messages}`);
    console.log('');

    // Try to fetch messages directly from database
    const directMessages = await prisma.chatMessage.findMany({
      where: { conversationId: sampleConversation.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`💬 Direct Database Messages: ${directMessages.length}`);
    directMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.direction}: ${msg.content.substring(0, 50)}...`);
      console.log(`     Created: ${msg.createdAt.toISOString()}`);
    });

    if (directMessages.length === 0) {
      console.log('⚠️  No messages found in database for this conversation');
      
      // Check if messages exist at all
      const totalMessages = await prisma.chatMessage.count();
      console.log(`📊 Total messages in database: ${totalMessages}`);
      
      if (totalMessages > 0) {
        // Check if messages are linked to different conversation IDs
        const messagesWithoutConvo = await prisma.chatMessage.count({
          where: {
            conversationId: { not: sampleConversation.id }
          }
        });
        console.log(`🔗 Messages linked to other conversations: ${messagesWithoutConvo}`);
      }
    }

    // Test RLS by checking if we can access the conversation
    console.log('\n🔒 Testing RLS Access:');
    
    // Check if the conversation is properly linked to a branch
    const conversationWithBranch = await prisma.conversation.findUnique({
      where: { id: sampleConversation.id },
      include: {
        branch: { select: { id: true, name: true, isActive: true } }
      }
    });

    if (conversationWithBranch?.branch) {
      console.log(`✅ Conversation linked to branch: ${conversationWithBranch.branch.name}`);
    } else {
      console.log(`❌ Conversation NOT properly linked to branch`);
    }

    // Check if there are any users linked to this branch
    const branchUsers = await prisma.teacher.count({
      where: { branchId: sampleConversation.branchId }
    });
    const branchEmployees = await prisma.employee.count({
      where: { branchId: sampleConversation.branchId }
    });

    console.log(`👥 Users in branch: ${branchUsers} teachers, ${branchEmployees} employees`);

  } catch (error) {
    console.error('❌ Error testing chat messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChatMessages().catch(console.error); 