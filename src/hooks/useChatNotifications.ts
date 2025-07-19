import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";

interface ChatNotification {
  id: string;
  type: 'new_message' | 'new_conversation';
  title: string;
  message: string;
  conversationId: string;
  participantName: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participantType: string;
  participantId: string;
  participantName: string;
  participantPhone: string;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  lastMessageFrom: 'INCOMING' | 'OUTGOING';
  unreadCount: number;
  isActive: boolean;
  metadata: any;
}

interface ConversationsData {
  conversations: Conversation[];
}

export function useChatNotifications() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Get unread conversations count
  const { data: stats, refetch: refetchStats } = api.chat.getStats.useQuery({
    branchId: currentBranchId || "",
  }, {
    enabled: !!currentBranchId,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get recent conversations to check for new messages
  const { data: conversationsData, refetch: refetchConversations } = api.chat.getConversations.useQuery({
    branchId: currentBranchId || "",
    limit: 10,
  }, {
    enabled: !!currentBranchId,
    refetchInterval: 15000, // Check every 15 seconds
  });

  // Check for new messages and create notifications
  useEffect(() => {
    if (!conversationsData?.conversations) return;

    const newNotifications: ChatNotification[] = [];
    const currentTime = new Date();

    conversationsData.conversations.forEach((conversation: Conversation) => {
      // Check if there are unread messages from this conversation
      if (conversation.unreadCount > 0 && conversation.lastMessageFrom === 'INCOMING') {
        const lastMessageTime = conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : new Date(0);
        
        // Only notify if the last message is newer than our last check
        if (lastMessageTime > lastChecked) {
          newNotifications.push({
            id: `${conversation.id}-${lastMessageTime.getTime()}`,
            type: 'new_message',
            title: `New message from ${conversation.participantName}`,
            message: conversation.lastMessageContent?.substring(0, 50) + (conversation.lastMessageContent && conversation.lastMessageContent.length > 50 ? '...' : '') || 'New message received',
            conversationId: conversation.id,
            participantName: conversation.participantName,
            timestamp: lastMessageTime,
            read: false,
          });
        }
      }
    });

    // Add new notifications and show toast for the most recent one
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev.slice(0, 19)]); // Keep last 20 notifications
      
      // Show toast for the most recent notification
      const mostRecent = newNotifications[0];
      if (mostRecent) {
        toast({
          title: mostRecent.title,
          description: mostRecent.message,
        });
      }
    }

    setLastChecked(currentTime);
  }, [conversationsData, lastChecked, toast, setNotifications, setLastChecked]);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev: ChatNotification[]) => 
      prev.map((notif: ChatNotification) => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, [setNotifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, [setNotifications]);

  // Get unread notifications count
  const unreadCount = notifications.filter((n: ChatNotification) => !n.read).length;

  // Total unread messages count from API
  const totalUnreadMessages = stats?.totalUnreadMessages || 0;

  return {
    notifications,
    unreadCount,
    totalUnreadMessages,
    markNotificationAsRead,
    clearAllNotifications,
    refetchStats,
    refetchConversations,
  };
}

// Hook for managing browser notifications permission
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const showNotification = (title: string, options?: NotificationOptions): Notification | null => {
    if (permission === 'granted' && 'Notification' in window) {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
    return null;
  };

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
  };
} 