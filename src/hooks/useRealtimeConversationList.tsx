"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/utils/api';

interface RealtimeConversationListHookProps {
  branchId: string;
}

interface NewConversation {
  id: string;
  branchId: string;
  whatsappPhoneNumber: string;
  name: string;
  lastMessageAt: string;
  lastMessageContent: string;
  lastMessageFrom: 'INCOMING' | 'OUTGOING';
  unreadCount: number;
}

interface ConversationUpdate {
  id: string;
  lastMessageAt: string;
  lastMessageContent: string;
  lastMessageFrom: 'INCOMING' | 'OUTGOING';
  unreadCount: number;
}

interface NewMessage {
  id: string;
  conversationId: string;
  direction: 'INCOMING' | 'OUTGOING';
  content: string;
  messageType: string;
  createdAt: string;
}

export function useRealtimeConversationList({ branchId }: RealtimeConversationListHookProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [highlightedConversations, setHighlightedConversations] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
      console.error('❌ Conversation list database access test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(`Database connection failed: ${errorMessage}`);
      return false;
    }
  }, [session, branchId]);

  // Subscribe to conversation updates
  const subscribeToConversations = useCallback(async () => {
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
    
    // For Postgres Changes, use simple channel names (no branch filtering in channel name)
    // RLS policies on tables will handle access control
    const channelName = `conversation-list:${session.user.id}`;
    
    const conversationSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Conversation',
          // No filter needed - RLS policies handle access control
        },
        (payload) => {
          const newConversation = payload.new as NewConversation;
          
          // Highlight the new conversation
          setHighlightedConversations(prev => new Set(prev).add(newConversation.id));
          
          // Remove highlight after 5 seconds
          setTimeout(() => {
            setHighlightedConversations(prev => {
              const newSet = new Set(prev);
              newSet.delete(newConversation.id);
              return newSet;
            });
          }, 5000);
          
          // Invalidate conversation list - RLS handles filtering automatically
          utils.chat.getConversations.invalidate({ branchId });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Conversation',
          // No filter needed - RLS policies handle access control
        },
        (payload) => {
          // Invalidate conversation list to update last message data
          utils.chat.getConversations.invalidate({ branchId });
        }
      )
      .subscribe((status, err) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorMsg = `Conversation list subscription error: ${err?.message || 'Unknown error'}`;
          console.error('❌', errorMsg);
          setConnectionError(errorMsg);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return conversationSubscription;
  }, [branchId, utils, session, isSuperAdmin]);

  // Subscribe to new messages for unread count updates
  const subscribeToNewMessages = useCallback(async () => {
    if (!session?.user) {
      return null;
    }

    // Session is already available from auth provider
    
    // Simple channel name - RLS handles access control
    const messageChannelName = `new-messages:${session.user.id}`;
    
    const messageSubscription = supabase
      .channel(messageChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ChatMessage',
          // Filter by conversations in this branch (we'll handle the branch filtering via the conversation relationship)
        },
        (payload) => {
          console.log('📨 New message for conversation list:', payload);
          const newMessage = payload.new as NewMessage;
          
          // Update conversation stats for incoming messages
          if (newMessage.direction === 'INCOMING') {
            utils.chat.getStats.invalidate({ branchId });
          }
          
          // Update conversation list to reflect the new last message
          utils.chat.getConversations.invalidate({ branchId });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorMsg = `New message subscription error: ${err?.message || 'Unknown error'}`;
          console.error('❌', errorMsg);
          setConnectionError(errorMsg);
        }
      });

    return messageSubscription;
  }, [branchId, utils, session, isSuperAdmin]);

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

    if (!branchId) {
      return;
    }

    let conversationSubscription: any = null;
    let messageSubscription: any = null;

    const setupSubscriptions = async () => {
      try {
        conversationSubscription = await subscribeToConversations();
        messageSubscription = await subscribeToNewMessages();
      } catch (error) {
        console.error('❌ Failed to setup conversation list subscriptions:', error);
        setConnectionError(`Setup failed: ${error}`);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up conversation list subscriptions...');
      conversationSubscription?.unsubscribe();
      messageSubscription?.unsubscribe();
    };
  }, [branchId, session?.user?.id, loading]); // Only depend on stable values

  return {
    isConnected,
    connectionError,
    highlightedConversations,
  };
} 