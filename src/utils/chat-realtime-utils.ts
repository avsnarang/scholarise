/**
 * ⚡ Real-time Chat Utilities
 * 
 * This utility provides helper functions for managing realtime chat updates,
 * optimistic UI updates, and ensuring read/unread states are properly handled.
 */

import { formatDistanceToNow } from "date-fns";

export interface ConversationOptimisticUpdate {
  id: string;
  unreadCount?: number;
  lastMessageAt?: Date;
  lastMessageContent?: string;
  lastMessageFrom?: 'INCOMING' | 'OUTGOING';
}

export interface MessageOptimisticUpdate {
  id: string;
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  readAt?: Date;
}

/**
 * Creates an optimistic conversation update for when a message is sent
 */
export function createOutgoingMessageOptimisticUpdate(
  conversationId: string,
  messageContent: string
): ConversationOptimisticUpdate {
  return {
    id: conversationId,
    lastMessageAt: new Date(),
    lastMessageContent: messageContent.substring(0, 100),
    lastMessageFrom: 'OUTGOING'
  };
}

/**
 * Creates an optimistic conversation update for when messages are marked as read
 */
export function createMarkAsReadOptimisticUpdate(
  conversationId: string
): ConversationOptimisticUpdate {
  return {
    id: conversationId,
    unreadCount: 0
  };
}

/**
 * Creates an optimistic message update for when a message is sent
 */
export function createMessageSentOptimisticUpdate(
  messageId: string
): MessageOptimisticUpdate {
  return {
    id: messageId,
    status: 'SENT'
  };
}

/**
 * Creates an optimistic message update for when messages are marked as read
 */
export function createMessageReadOptimisticUpdate(
  messageId: string
): MessageOptimisticUpdate {
  return {
    id: messageId,
    status: 'READ',
    readAt: new Date()
  };
}

/**
 * Determines if a conversation should be prioritized in the list
 * Conversations with unread messages should appear at the top
 */
export function shouldPrioritizeConversation(conversation: any): boolean {
  return conversation.unreadCount > 0;
}

/**
 * Sorts conversations for optimal realtime UX
 * Priority: Unread messages first, then most recent activity
 */
export function sortConversationsForRealtime(conversations: any[]): any[] {
  return [...conversations].sort((a, b) => {
    // First, prioritize conversations with unread messages
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    
    // Then sort by most recent activity
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Gets the appropriate CSS classes for unread conversation styling
 */
export function getUnreadConversationClasses(unreadCount: number): string {
  if (unreadCount === 0) return "";
  
  return "bg-primary/5 border-primary/10 shadow-sm ring-1 ring-primary/20";
}

/**
 * Gets the appropriate CSS classes for unread count badges
 */
export function getUnreadBadgeClasses(unreadCount: number): string {
  if (unreadCount === 0) return "hidden";
  
  return "animate-pulse shadow-lg ring-2 ring-primary/30";
}

/**
 * Formats the unread count display text
 */
export function formatUnreadCount(count: number): string {
  if (count === 0) return "";
  if (count > 99) return "99+";
  return count.toString();
}

/**
 * Determines if a conversation was recently active (within last 5 minutes)
 */
export function isRecentlyActive(lastMessageAt: Date | null): boolean {
  if (!lastMessageAt) return false;
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastMessageAt) > fiveMinutesAgo;
}

/**
 * Gets appropriate notification text for new messages
 */
export function getNewMessageNotificationText(
  participantName: string,
  messageContent: string,
  unreadCount: number
): { title: string; description: string } {
  const shortContent = messageContent.length > 50 
    ? messageContent.substring(0, 50) + "..." 
    : messageContent;
    
  if (unreadCount === 1) {
    return {
      title: `New message from ${participantName}`,
      description: shortContent
    };
  } else {
    return {
      title: `${unreadCount} new messages from ${participantName}`,
      description: `Latest: ${shortContent}`
    };
  }
}

/**
 * Enhanced timer formatting for WhatsApp 24-hour window
 */
export function formatWindowTimer(timeRemaining: string): {
  display: string;
  urgency: 'low' | 'medium' | 'high';
  color: string;
} {
  if (!timeRemaining || timeRemaining === "EXPIRED") {
    return {
      display: "EXPIRED",
      urgency: 'high',
      color: 'text-red-500'
    };
  }
  
  const parts = timeRemaining.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const totalMinutes = hours * 60 + minutes;
  
  let urgency: 'low' | 'medium' | 'high';
  let color: string;
  
  if (totalMinutes <= 10) {
    urgency = 'high';
    color = 'text-red-500';
  } else if (totalMinutes <= 60) {
    urgency = 'medium';
    color = 'text-orange-500';
  } else {
    urgency = 'low';
    color = 'text-green-500';
  }
  
  return {
    display: timeRemaining,
    urgency,
    color
  };
}

/**
 * Gets user-friendly timer status text
 */
export function getTimerStatusText(timeRemaining: string): string {
  const { urgency } = formatWindowTimer(timeRemaining);
  
  switch (urgency) {
    case 'high':
      return "Expiring soon";
    case 'medium':
      return "Ending soon";
    default:
      return "Window active";
  }
}

/**
 * Debounced refresh function for preventing excessive API calls
 */
export function createDebouncedRefresh(
  refreshFn: () => void,
  delay = 500
): () => void {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(refreshFn, delay);
  };
}

/**
 * Real-time polling intervals configuration
 */
export const REALTIME_INTERVALS = {
  CONVERSATIONS: 3000, // 3 seconds
  MESSAGES: 2000,      // 2 seconds  
  STATS: 5000,         // 5 seconds
  WINDOW_STATUS: 5000, // 5 seconds
  NOTIFICATIONS: 3000, // 3 seconds
} as const;

/**
 * Enhanced console logging for chat realtime events
 */
export function logRealtimeEvent(
  event: string,
  data?: any,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[CHAT-REALTIME ${timestamp}]`;
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ❌ ${event}`, data);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️ ${event}`, data);
      break;
    default:
      console.log(`${prefix} ⚡ ${event}`, data);
  }
} 