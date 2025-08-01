import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    const fix = url.searchParams.get('fix') === 'true';

    if (!conversationId) {
      return NextResponse.json({
        error: 'Missing conversationId parameter'
      }, { status: 400 });
    }

    console.log(`🔍 DEBUG: Checking conversation ${conversationId}`);

    // Get conversation details
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Analyze messages
    const allMessages = conversation.messages;
    const incomingMessages = allMessages.filter(m => m.direction === 'INCOMING');
    const outgoingMessages = allMessages.filter(m => m.direction === 'OUTGOING');
    const unreadIncomingMessages = incomingMessages.filter(m => !m.readAt);

    console.log(`📊 Message Analysis:`);
    console.log(`  Total messages: ${allMessages.length}`);
    console.log(`  Incoming messages: ${incomingMessages.length}`);
    console.log(`  Outgoing messages: ${outgoingMessages.length}`);
    console.log(`  Unread incoming: ${unreadIncomingMessages.length}`);
    console.log(`  Current unread count: ${conversation.unreadCount}`);

    const analysis = {
      conversationId,
      currentUnreadCount: conversation.unreadCount,
      totalMessages: allMessages.length,
      incomingMessages: incomingMessages.length,
      outgoingMessages: outgoingMessages.length,
      unreadIncomingMessages: unreadIncomingMessages.length,
      shouldBeUnreadCount: unreadIncomingMessages.length,
      needsFix: conversation.unreadCount !== unreadIncomingMessages.length,
      messages: allMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
        createdAt: m.createdAt,
        readAt: m.readAt,
        status: m.status
      })),
      fixApplied: false as boolean,
      newUnreadCount: undefined as number | undefined
    };

    if (fix && analysis.needsFix) {
      console.log(`🔧 FIXING: Updating unread count from ${conversation.unreadCount} to ${unreadIncomingMessages.length}`);
      
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: unreadIncomingMessages.length
        }
      });

      analysis.fixApplied = true;
      analysis.newUnreadCount = unreadIncomingMessages.length;
    }

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug conversation status error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, action } = await req.json();

    if (!conversationId) {
      return NextResponse.json({
        error: 'Missing conversationId'
      }, { status: 400 });
    }

    if (action === 'recalculate') {
      // Recalculate unread count for conversation
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            where: {
              direction: 'INCOMING',
              readAt: null
            }
          }
        }
      });

      if (!conversation) {
        return NextResponse.json({
          error: 'Conversation not found'
        }, { status: 404 });
      }

      const correctUnreadCount = conversation.messages.length;

      await db.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: correctUnreadCount
        }
      });

      return NextResponse.json({
        success: true,
        message: `Updated unread count to ${correctUnreadCount}`,
        conversationId,
        newUnreadCount: correctUnreadCount
      });
    }

    if (action === 'markAllRead') {
      // Mark all messages as read
      await db.chatMessage.updateMany({
        where: {
          conversationId,
          direction: 'INCOMING',
          readAt: null
        },
        data: {
          readAt: new Date(),
          status: 'READ'
        }
      });

      await db.conversation.update({
        where: { id: conversationId },
        data: {
          unreadCount: 0
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Marked all messages as read',
        conversationId
      });
    }

    return NextResponse.json({
      error: 'Invalid action. Use "recalculate" or "markAllRead"'
    }, { status: 400 });

  } catch (error) {
    console.error('Debug conversation action error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 