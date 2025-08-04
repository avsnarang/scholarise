"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/utils/api';
import { useToast } from '@/components/ui/use-toast';

interface RealtimeChatHookProps {
  conversationId: string;
  branchId: string;
}

interface NewMessage {
  id: string;
  conversationId: string;
  direction: 'INCOMING' | 'OUTGOING';
  content: string;
  messageType: string;
  createdAt: string;
  sentBy?: string;
}

interface ConversationUpdate {
  id: string;
  lastMessageAt: string;
  lastMessageContent: string;
  lastMessageFrom: 'INCOMING' | 'OUTGOING';
  unreadCount: number;
}

export function useRealtimeChat({ conversationId, branchId }: RealtimeChatHookProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();
  const utils = api.useUtils();
  const { session, loading, user } = useAuth();
  const { isSuperAdmin } = usePermissions();



  // Test database access before setting up subscriptions
  const testDatabaseAccess = useCallback(async () => {
    if (!session?.user) {
      return false;
    }

    try {
      // Use existing session instead of fetching new one
      if (!session) {
        console.error('❌ No current session for database access');
        setConnectionError('No authenticated session');
        return false;
      }

      // Test access to conversations (simplified approach)
      const { data: conversations, error: conversationError } = await supabase
        .from('Conversation')
        .select('id, branchId')
        .limit(5);

      if (conversationError) {
        console.error('❌ Conversation access failed:', conversationError);
        setConnectionError(`Database access denied: ${conversationError.message || 'Unknown error'}`);
        return false;
      }

      console.log('✅ Database access successful, found conversations:', conversations?.length || 0);
      setConnectionError(null);
      return true;
    } catch (error) {
      console.error('❌ Chat database access test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(`Database connection failed: ${errorMessage}`);
      return false;
    }
  }, [session, branchId, isSuperAdmin]);

  // Real-time message subscription
  const subscribeToMessages = useCallback(async () => {
    if (!session?.user) {
      setConnectionError('No authenticated session');
      return null;
    }

    // Test database access first
    const hasAccess = await testDatabaseAccess();
    if (!hasAccess) {
      return null;
    }

    // Session is already available from auth provider
    
    const messageSubscription = supabase
      .channel(`messages:${conversationId}:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ChatMessage',
          filter: `conversationId=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as NewMessage;
          
          // Update message count for incoming messages
          if (newMessage.direction === 'INCOMING') {
            setNewMessageCount(prev => prev + 1);
            
            // Show toast notification for incoming messages
            toast({
              title: "New message received",
              description: newMessage.content.length > 50 
                ? `${newMessage.content.substring(0, 50)}...` 
                : newMessage.content,
              duration: 3000,
            });
          }
          
          // Invalidate and refetch messages
          utils.chat.getMessages.invalidate({ conversationId });
          
          // Invalidate conversation list to update last message
          utils.chat.getConversations.invalidate({ branchId });
          
          // Scroll to bottom for new messages
          setTimeout(() => {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ChatMessage',
          filter: `conversationId=eq.${conversationId}`
        },
        (payload) => {
          // Invalidate messages on status changes (delivered, read, etc.)
          utils.chat.getMessages.invalidate({ conversationId });
        }
      )
      .subscribe((status, err) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorMsg = `Message subscription error: ${err?.message || 'Unknown error'}`;
          console.error('❌', errorMsg);
          setConnectionError(errorMsg);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return messageSubscription;
  }, [conversationId, branchId, toast, utils, session]);

  // Real-time conversation updates subscription
  const subscribeToConversations = useCallback(async () => {
    if (!session?.user) {
      console.warn('⚠️ No authenticated session - skipping conversation subscription');
      return null;
    }

    console.log('🔗 Setting up realtime subscription for conversations...', {
      branchId,
      userId: session.user.id
    });

    // Session is already available from auth provider
    
    const conversationSubscription = supabase
      .channel(`conversations:${branchId}:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Conversation',
          filter: `branchId=eq.${branchId}`
        },
        (payload) => {
          console.log('💬 Conversation updated:', payload);
          const updatedConversation = payload.new as ConversationUpdate;
          
          // Invalidate conversation list
          utils.chat.getConversations.invalidate({ branchId });
          
          // If this is the current conversation, update it
          if (updatedConversation.id === conversationId) {
            utils.chat.getConversation.invalidate({ conversationId });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Conversation',
          filter: `branchId=eq.${branchId}`
        },
        (payload) => {
          console.log('✨ New conversation created:', payload);
          // Invalidate conversation list to show new conversation
          utils.chat.getConversations.invalidate({ branchId });
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Conversation subscription status:', status, err);
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorMsg = `Conversation subscription error: ${err?.message || 'Unknown error'}`;
          console.error('❌', errorMsg);
          setConnectionError(errorMsg);
        }
      });

    return conversationSubscription;
  }, [branchId, conversationId, utils, session]);

  // Set up subscriptions
  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session?.user) {
      setIsConnected(false);
      setConnectionError('Not authenticated');
      return;
    }

    if (!conversationId || !branchId) {
      return;
    }

    let messageSubscription: any = null;
    let conversationSubscription: any = null;

    const setupSubscriptions = async () => {
      try {
        messageSubscription = await subscribeToMessages();
        conversationSubscription = await subscribeToConversations();
      } catch (error) {
        console.error('❌ Failed to setup subscriptions:', error);
        setConnectionError(`Setup failed: ${error}`);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      messageSubscription?.unsubscribe();
      conversationSubscription?.unsubscribe();
    };
  }, [conversationId, branchId, session?.user?.id, loading]); // Only depend on stable values

  // Reset new message count when conversation is viewed
  const markAsViewed = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  // Manual refresh function (fallback)
  const refreshMessages = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    utils.chat.getMessages.invalidate({ conversationId });
    utils.chat.getConversation.invalidate({ conversationId });
    utils.chat.getConversations.invalidate({ branchId });
  }, [conversationId, branchId, utils]);

  return {
    isConnected,
    newMessageCount,
    connectionError,
    markAsViewed,
    refreshMessages,
  };
} 