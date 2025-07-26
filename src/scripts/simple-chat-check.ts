/**
 * Simple Chat Data Checker
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function simpleChatCheck() {
  console.log('🔍 Simple Chat Status Check...\n');

  try {
    // Basic counts
    const totalConversations = await prisma.conversation.count();
    const totalMessages = await prisma.chatMessage.count();
    const activeConversations = await prisma.conversation.count({
      where: { isActive: true }
    });

    console.log(`📊 Total Conversations: ${totalConversations}`);
    console.log(`📊 Active Conversations: ${activeConversations}`);
    console.log(`💬 Total Messages: ${totalMessages}`);

    // Check recent conversations
    const recentConversations = await prisma.conversation.findMany({
      take: 5,
      include: {
        _count: { select: { messages: true } },
        branch: { select: { name: true } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log('\n📝 Recent Conversations:');
    recentConversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.participantName || 'Unknown'}`);
      console.log(`     Branch: ${conv.branch?.name || 'Unknown'}`);
      console.log(`     Messages: ${conv._count.messages}`);
      console.log(`     Active: ${conv.isActive}`);
      console.log(`     Last Activity: ${conv.lastMessageAt?.toISOString() || 'Never'}`);
      console.log('');
    });

    // Check if conversations have proper branch assignments
    const conversationsWithBranch = await prisma.conversation.count({
      where: {
        branchId: { not: '' }
      }
    });

    console.log(`🏢 Conversations with valid branch: ${conversationsWithBranch}/${totalConversations}`);

    // Quick realtime readiness check
    const realtimeReady = await prisma.conversation.count({
      where: {
        isActive: true,
        branchId: { not: '' },
        lastMessageAt: { not: null }
      }
    });

    console.log(`⚡ Realtime-ready conversations: ${realtimeReady}/${totalConversations}`);

    if (realtimeReady === totalConversations) {
      console.log('\n✅ All conversations appear ready for realtime!');
    } else {
      console.log('\n⚠️  Some conversations may need migration for realtime.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleChatCheck().catch(console.error); 