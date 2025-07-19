"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Phone,
  Clock,
  CheckCircle,
  CheckCircle2,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
  MessageCircle,
  MoreVertical,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface ChatMessage {
  id: string;
  conversationId: string;
  direction: 'INCOMING' | 'OUTGOING';
  content: string;
  messageType: string;
  status: string;
  readAt: Date | null;
  sentBy: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: Date;
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
  _count: { messages: number };
}

interface WhatsAppChatProps {
  conversationId: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

export function WhatsAppChat({ conversationId, onConversationSelect }: WhatsAppChatProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [messageContent, setMessageContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversation details
  const { data: conversation } = api.chat.getConversation.useQuery({
    conversationId: conversationId!,
  }, {
    enabled: !!conversationId,
  });

  // Fetch messages for selected conversation
  const { 
    data: messagesData, 
    isLoading: messagesLoading,
    refetch: refetchMessages 
  } = api.chat.getMessages.useQuery({
    conversationId: conversationId!,
    limit: 100,
  }, {
    enabled: !!conversationId,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time feel
  });

  // Send message mutation
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      setTimeout(() => scrollToBottom(), 100);
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = api.chat.markAsRead.useMutation();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark conversation as read when selected
  useEffect(() => {
    if (conversationId && (conversation?.unreadCount ?? 0) > 0) {
      markAsReadMutation.mutate({ conversationId });
    }
  }, [conversationId, conversation?.unreadCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !conversationId || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: messageContent.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key in message input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get participant icon
  const getParticipantIcon = (type: string) => {
    switch (type) {
      case "student":
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case "teacher":
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case "employee":
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case "parent":
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message: ChatMessage) => {
    if (message.direction === 'INCOMING') return null;
    
    switch (message.status) {
      case 'SENT':
        return <CheckCircle className="w-3 h-3 text-gray-400" />;
      case 'DELIVERED':
        return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
      case 'READ':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  // Get participant initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const messages = messagesData?.messages || [];

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center text-muted-foreground max-w-md">
          <MessageCircle className="mx-auto h-16 w-16 mb-6 opacity-50" />
          <h3 className="text-xl font-semibold mb-3">WhatsApp for Business</h3>
          <p className="text-sm leading-relaxed">
            Select a conversation from the sidebar to start viewing and responding to WhatsApp messages from students, teachers, parents, and employees.
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Info className="h-3 w-3" />
              <span>Tip</span>
            </div>
            <p className="text-xs text-left">
              Incoming messages automatically create conversations. Make sure your Twilio webhook is configured to receive messages.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission("view_communication_logs")) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view chat conversations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      {conversation && (
        <div className="p-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm font-semibold">
                  {getInitials(conversation.participantName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{conversation.participantName}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getParticipantIcon(conversation.participantType)}
                  <span className="capitalize">{conversation.participantType}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {conversation.participantPhone.replace('whatsapp:', '')}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {conversation._count.messages} messages
              </Badge>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={cn(
                    "flex",
                    i % 2 === 0 ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "h-12 rounded-lg max-w-[80%]",
                      i % 2 === 0 ? "bg-blue-200 w-48" : "bg-gray-200 w-32"
                    )}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-sm">
                This conversation will show messages as they are sent and received.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => {
                const isOwn = message.direction === 'OUTGOING';
                const showDate = index === 0 || 
                  new Date(message.createdAt).toDateString() !== 
                  new Date(messages[index - 1]?.createdAt || '').toDateString();

                return (
                  <div key={message.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <Badge variant="secondary" className="text-xs px-3 py-1">
                          {format(new Date(message.createdAt), "MMMM d, yyyy")}
                        </Badge>
                      </div>
                    )}

                    {/* Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start"
                      }}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 break-words",
                          isOwn
                            ? "bg-green-500 text-white rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        <div className={cn(
                          "flex items-center justify-end mt-2 gap-1",
                          isOwn ? "text-green-100" : "text-muted-foreground"
                        )}>
                          <span className="text-xs">
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                          {getMessageStatusIcon(message)}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      {hasPermission("create_communication_message") && conversation && (
        <div className="p-4 border-t bg-background/95 backdrop-blur">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                ref={messageInputRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[120px] resize-none bg-muted/50 border-0 focus-visible:ring-1"
                rows={1}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 