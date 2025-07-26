/**
 * Test Utility for Realtime Chat Functionality
 * This helps verify that all existing conversations work with realtime
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ConversationTestResult {
  conversationId: string;
  participantName: string;
  branchId: string;
  messageCount: number;
  canAccessRealtime: boolean;
  lastMessageAt: string | null;
  error?: string;
}

export interface RealtimeTestSummary {
  totalConversations: number;
  realtimeEnabledConversations: number;
  conversationsWithIssues: number;
  results: ConversationTestResult[];
}

/**
 * Test realtime access for all conversations in a branch
 */
export async function testRealtimeChatForBranch(branchId: string): Promise<RealtimeTestSummary> {
  const results: ConversationTestResult[] = [];
  let realtimeEnabledConversations = 0;
  let conversationsWithIssues = 0;

  try {
    // First, get all conversations for the branch
    const { data: conversations, error: conversationsError } = await supabase
      .from('Conversation')
      .select(`
        id,
        participantName,
        branchId,
        lastMessageAt,
        isActive
      `)
      .eq('branchId', branchId)
      .eq('isActive', true);

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return {
        totalConversations: 0,
        realtimeEnabledConversations: 0,
        conversationsWithIssues: 1,
        results: [{
          conversationId: 'error',
          participantName: 'Error',
          branchId,
          messageCount: 0,
          canAccessRealtime: false,
          lastMessageAt: null,
          error: conversationsError.message
        }]
      };
    }

    // Test each conversation
    for (const conversation of conversations || []) {
      try {
        // Test if we can access messages via realtime-enabled query
        const { data: messages, error: messagesError } = await supabase
          .from('ChatMessage')
          .select('id, createdAt, direction')
          .eq('conversationId', conversation.id)
          .order('createdAt', { ascending: false })
          .limit(5);

        const result: ConversationTestResult = {
          conversationId: conversation.id,
          participantName: conversation.participantName || 'Unknown',
          branchId: conversation.branchId,
          messageCount: messages?.length || 0,
          canAccessRealtime: !messagesError,
          lastMessageAt: conversation.lastMessageAt,
          error: messagesError?.message
        };

        if (!messagesError) {
          realtimeEnabledConversations++;
        } else {
          conversationsWithIssues++;
        }

        results.push(result);
      } catch (error) {
        conversationsWithIssues++;
        results.push({
          conversationId: conversation.id,
          participantName: conversation.participantName || 'Unknown',
          branchId: conversation.branchId,
          messageCount: 0,
          canAccessRealtime: false,
          lastMessageAt: conversation.lastMessageAt,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      totalConversations: conversations?.length || 0,
      realtimeEnabledConversations,
      conversationsWithIssues,
      results
    };

  } catch (error) {
    console.error('Error testing realtime chat:', error);
    return {
      totalConversations: 0,
      realtimeEnabledConversations: 0,
      conversationsWithIssues: 1,
      results: [{
        conversationId: 'global-error',
        participantName: 'Global Error',
        branchId,
        messageCount: 0,
        canAccessRealtime: false,
        lastMessageAt: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
}

/**
 * Test realtime subscription for a specific conversation
 */
export async function testRealtimeSubscription(conversationId: string): Promise<boolean> {
  return new Promise((resolve) => {
    let isConnected = false;
    
    const subscription = supabase
      .channel(`test-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ChatMessage',
          filter: `conversationId=eq.${conversationId}`
        },
        (payload) => {
          console.log('✅ Realtime subscription working for conversation:', conversationId, payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isConnected = true;
          console.log('✅ Successfully subscribed to realtime for conversation:', conversationId);
          // Clean up and resolve
          setTimeout(() => {
            subscription.unsubscribe();
            resolve(true);
          }, 1000);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('❌ Failed to subscribe to realtime for conversation:', conversationId);
          subscription.unsubscribe();
          resolve(false);
        }
      });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!isConnected) {
        subscription.unsubscribe();
        resolve(false);
      }
    }, 5000);
  });
}

/**
 * Helper function to format test results
 */
export function formatRealtimeTestResults(summary: RealtimeTestSummary): string {
  const successRate = summary.totalConversations > 0 
    ? (summary.realtimeEnabledConversations / summary.totalConversations * 100).toFixed(1)
    : '0';

  let report = `
🔍 Realtime Chat Test Results
==============================
📊 Total Conversations: ${summary.totalConversations}
✅ Realtime Enabled: ${summary.realtimeEnabledConversations}
❌ Issues Found: ${summary.conversationsWithIssues}
📈 Success Rate: ${successRate}%

`;

  if (summary.conversationsWithIssues > 0) {
    report += `\n🚨 Conversations with Issues:\n`;
    summary.results
      .filter(r => !r.canAccessRealtime)
      .forEach(result => {
        report += `- ${result.participantName} (${result.conversationId}): ${result.error}\n`;
      });
  }

  if (summary.realtimeEnabledConversations > 0) {
    report += `\n✅ Working Conversations:\n`;
    summary.results
      .filter(r => r.canAccessRealtime)
      .slice(0, 5) // Show first 5
      .forEach(result => {
        report += `- ${result.participantName}: ${result.messageCount} messages\n`;
      });
    
    if (summary.realtimeEnabledConversations > 5) {
      report += `... and ${summary.realtimeEnabledConversations - 5} more\n`;
    }
  }

  return report;
} 