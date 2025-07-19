"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  Search,
  MoreVertical,
  Phone,
  Clock,
  CheckCircle,
  CheckCircle2,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
  Archive,
  MessageSquare,
  Filter,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

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

export function ChatInterface() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  // State
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: conversationsLoading, 
    refetch: refetchConversations 
  } = api.chat.getConversations.useQuery({
    branchId: currentBranchId || "",
    search: searchTerm || undefined,
    participantType: participantFilter !== "all" ? participantFilter as any : undefined,
    limit: 50,
  }, {
    enabled: !!currentBranchId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch messages for selected conversation
  const { 
    data: messagesData, 
    isLoading: messagesLoading,
    refetch: refetchMessages 
  } = api.chat.getMessages.useQuery({
    conversationId: selectedConversationId!,
    limit: 100,
  }, {
    enabled: !!selectedConversationId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
  });

  // Get selected conversation details
  const selectedConversation = conversationsData?.conversations.find(
    c => c.id === selectedConversationId
  );

  // Send message mutation
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      refetchConversations();
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
  const markAsReadMutation = api.chat.markAsRead.useMutation({
    onSuccess: () => {
      refetchConversations();
    },
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && (selectedConversation?.unreadCount ?? 0) > 0) {
      markAsReadMutation.mutate({ conversationId: selectedConversationId });
    }
  }, [selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedConversationId || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
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

  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  if (!hasPermission("view_communication_logs")) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view chat conversations.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-background">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Conversations</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refetchConversations();
                if (selectedConversationId) refetchMessages();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter */}
          <Select value={participantFilter} onValueChange={setParticipantFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Participants</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
              <SelectItem value="parent">Parents</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List */}
        <ScrollArea className="h-[calc(600px-140px)]">
          {conversationsLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-center p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedConversationId === conversation.id && "bg-muted"
                  )}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(conversation.participantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      {getParticipantIcon(conversation.participantType)}
                    </div>
                  </div>
                  
                  <div className="flex-1 ml-3 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {conversation.participantName}
                      </p>
                      {conversation.lastMessageAt && (
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.lastMessageFrom === 'INCOMING' ? '' : 'You: '}
                        {conversation.lastMessageContent || 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarFallback>
                      {getInitials(selectedConversation.participantName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{selectedConversation.participantName}</h4>
                    <p className="text-xs text-gray-500 flex items-center">
                      {getParticipantIcon(selectedConversation.participantType)}
                      <span className="ml-1 capitalize">{selectedConversation.participantType}</span>
                      <span className="mx-1">•</span>
                      <Phone className="w-3 h-3 mr-1" />
                      {selectedConversation.participantPhone.replace('whatsapp:', '')}
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  {selectedConversation._count.messages} messages
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className={cn(
                        "flex",
                        i % 2 === 0 ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "h-8 rounded-lg",
                          i % 2 === 0 ? "bg-blue-200 w-32" : "bg-gray-200 w-24"
                        )}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No messages in this conversation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.direction === 'OUTGOING' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2",
                          message.direction === 'OUTGOING'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className={cn(
                          "flex items-center justify-end mt-1 space-x-1",
                          message.direction === 'OUTGOING' ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span className="text-xs">
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                          {getMessageStatusIcon(message)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex space-x-2">
                <Textarea
                  ref={messageInputRef}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || isLoading}
                  size="sm"
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 