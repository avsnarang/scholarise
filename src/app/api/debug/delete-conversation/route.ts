import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({
        error: 'Missing conversationId parameter'
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting conversation: ${conversationId}`);

    // Get conversation details before deletion
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: true
      }
    });

    if (!conversation) {
      return NextResponse.json({
        error: 'Conversation not found'
      }, { status: 404 });
    }

    console.log(`📋 Conversation details:`, {
      id: conversation.id,
      participantName: conversation.participantName,
      participantPhone: conversation.participantPhone,
      messageCount: conversation.messages.length,
      unreadCount: conversation.unreadCount
    });

    // Delete messages first (due to foreign key constraints)
    const deletedMessages = await db.chatMessage.deleteMany({
      where: { conversationId }
    });

    console.log(`🗑️ Deleted ${deletedMessages.count} messages`);

    // Delete the conversation
    const deletedConversation = await db.conversation.delete({
      where: { id: conversationId }
    });

    console.log(`✅ Successfully deleted conversation: ${deletedConversation.participantName}`);

    return NextResponse.json({
      success: true,
      message: `Deleted conversation with ${deletedConversation.participantName}`,
      deletedData: {
        conversationId: deletedConversation.id,
        participantName: deletedConversation.participantName,
        participantPhone: deletedConversation.participantPhone,
        messagesDeleted: deletedMessages.count
      },
      nextSteps: [
        "When this contact sends a new message, a fresh conversation will be created",
        "New conversation will include enhanced metadata (Father/Mother/Student identification)",
        "Proper contact type will be displayed in the sidebar"
      ]
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({
        error: 'Missing conversationId'
      }, { status: 400 });
    }

    // Same logic as DELETE but via POST for easier frontend usage
    const url = new URL(req.url);
    url.searchParams.set('conversationId', conversationId);
    const deleteReq = new NextRequest(url, { method: 'DELETE' });
    
    return await DELETE(deleteReq);

  } catch (error) {
    console.error('Delete conversation POST error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 