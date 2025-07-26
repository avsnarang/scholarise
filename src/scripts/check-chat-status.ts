/**
 * Chat Data Status Checker
 * Run this to see the current state of your chat data before and after migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function checkChatStatus() {
  console.log('🔍 Checking Chat Data Status...\n');

  try {
    // Check conversations
    const totalConversations = await prisma.conversation.count();
    console.log(`📊 Total Conversations: ${totalConversations}`);

    // Check conversations by branch
    const conversationsByBranch = await prisma.conversation.groupBy({
      by: ['branchId'],
      _count: { id: true },
      where: { isActive: true }
    });

    console.log('\n📍 Conversations by Branch:');
    for (const branch of conversationsByBranch) {
      const branchInfo = await prisma.branch.findUnique({
        where: { id: branch.branchId },
        select: { name: true, code: true }
      });
      console.log(`  - ${branchInfo?.name || 'Unknown'} (${branch.branchId}): ${branch._count.id} conversations`);
    }

    // Check conversations without valid branchId
    const orphanedConversations = await prisma.conversation.count({
      where: {
        OR: [
          { branchId: null },
          { branchId: '' },
          { 
            branchId: { 
              notIn: await prisma.branch.findMany({ select: { id: true } }).then(branches => branches.map(b => b.id))
            }
          }
        ]
      }
    });

    if (orphanedConversations > 0) {
      console.log(`\n⚠️  Orphaned Conversations (need branch assignment): ${orphanedConversations}`);
    }

    // Check messages
    const totalMessages = await prisma.chatMessage.count();
    console.log(`\n💬 Total Messages: ${totalMessages}`);

    // Check messages by direction
    const messagesByDirection = await prisma.chatMessage.groupBy({
      by: ['direction'],
      _count: { id: true }
    });

    console.log('\n📨 Messages by Direction:');
    messagesByDirection.forEach(item => {
      console.log(`  - ${item.direction}: ${item._count.id}`);
    });

    // Check conversations with messages
    const conversationsWithMessages = await prisma.conversation.count({
      where: {
        messages: {
          some: {}
        }
      }
    });

    console.log(`\n🔗 Conversations with Messages: ${conversationsWithMessages}/${totalConversations}`);

    // Check recent activity
    const recentConversations = await prisma.conversation.count({
      where: {
        lastMessageAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    console.log(`📅 Active Conversations (last 7 days): ${recentConversations}`);

    // Check unread counts
    const totalUnreadMessages = await prisma.conversation.aggregate({
      _sum: { unreadCount: true }
    });

    console.log(`🔔 Total Unread Messages: ${totalUnreadMessages._sum.unreadCount || 0}`);

    // Check for conversations missing metadata
    const conversationsMissingMetadata = await prisma.conversation.count({
      where: {
        OR: [
          { lastMessageAt: null },
          { lastMessageFrom: null },
          { unreadCount: null }
        ]
      }
    });

    if (conversationsMissingMetadata > 0) {
      console.log(`\n⚠️  Conversations Missing Metadata: ${conversationsMissingMetadata}`);
    }

    // Sample conversation data
    const sampleConversations = await prisma.conversation.findMany({
      take: 3,
      include: {
        _count: { select: { messages: true } },
        branch: { select: { name: true } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log('\n📝 Sample Conversations:');
    sampleConversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.participantName || 'Unknown'}`);
      console.log(`     Branch: ${conv.branch?.name || 'No branch'}`);
      console.log(`     Messages: ${conv._count.messages}`);
      console.log(`     Last Activity: ${conv.lastMessageAt?.toISOString() || 'Never'}`);
      console.log(`     Unread: ${conv.unreadCount || 0}`);
    });

    // Check if RLS is enabled
    const rlsStatus = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE tablename IN ('Conversation', 'ChatMessage')
    `;

    console.log('\n🔒 Row Level Security Status:');
    console.log(rlsStatus);

    console.log('\n✅ Chat status check completed!');

  } catch (error) {
    console.error('❌ Error checking chat status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkChatStatus().catch(console.error);

export { checkChatStatus }; 