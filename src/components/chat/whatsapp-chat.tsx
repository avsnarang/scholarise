"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Info,
  AlertTriangle,
  Mail,
  FileText,
  X,
  Smile,
  Paperclip,
  Mic,
  Search,
  Video,
  PhoneCall,
  MessageSquare,
  ChevronDown,
  Plus,
  Image as ImageIcon,
  File,
  MapPin,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, formatRelative, isToday, isYesterday } from "date-fns";
import { getWindowStatusExplanation } from "@/utils/chat-window-utils";
import { 
  formatWindowTimer, 
  getTimerStatusText,
  REALTIME_INTERVALS,
  logRealtimeEvent 
} from "@/utils/chat-realtime-utils";
import { useToast } from "@/components/ui/use-toast";

interface WhatsAppChatProps {
  conversationId: string | null;
}

export function WhatsAppChat({ conversationId }: WhatsAppChatProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [messageContent, setMessageContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // API calls
  const { data: conversation, isLoading: conversationLoading, error: conversationError } = api.chat.getConversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = api.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      refetchInterval: REALTIME_INTERVALS.MESSAGES // ⚡ Realtime message polling
    }
  );

  const { data: messageWindow, refetch: refetchMessageWindow } = api.chat.checkMessageWindow.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      refetchInterval: REALTIME_INTERVALS.WINDOW_STATUS // ⚡ Realtime window status
    }
  );

  const { data: templates } = api.chat.getTemplates.useQuery(
    { branchId: conversation?.branchId || "" },
    { enabled: !!conversation?.branchId }
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageContent("");
      setIsLoading(false);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
      // ⚡ Immediate realtime updates
      refetchMessages();
      refetchMessageWindow();
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTemplateMessageMutation = api.chat.sendTemplateMessage.useMutation({
    onSuccess: () => {
      setShowTemplateSelector(false);
      setSelectedTemplate("");
      setTemplateVariables({});
      // ⚡ Immediate realtime updates
      refetchMessages();
      refetchMessageWindow();
      toast({
        title: "Template message sent",
        description: "Your template message has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send template message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const messages = messagesData?.messages || [];
  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);

  // Helper functions
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to safely parse time remaining
  const getTimeInfo = (timeStr: string) => {
    if (!timeStr || timeStr === "EXPIRED") {
      return { hours: 0, minutes: 0, totalMinutes: 0 };
    }
    
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const totalMinutes = hours * 60 + minutes;
    
    return { hours, minutes, totalMinutes };
  };

  // Get enhanced contact type display text
  const getContactTypeDisplay = (conversation: any) => {
    if (conversation?.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata) {
      const contactType = (conversation.metadata.contactDetails as any)?.contactType;
      // Clean up the display text (remove "Phone" suffix for cleaner display)
      return contactType?.replace(' Phone', '') || 'Contact';
    }
    
    // Fallback to capitalize participantType
    return conversation?.participantType?.charAt(0).toUpperCase() + conversation?.participantType?.slice(1) || 'Unknown';
  };

  // Get participant icon based on enhanced contact details
  const getParticipantIcon = (conversation: any) => {
    // Check if we have enhanced contact details
    if (conversation?.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata) {
      const contactType = (conversation.metadata.contactDetails as any)?.contactType;
      
      switch (contactType) {
        case "Student Phone":
          return <GraduationCap className="w-4 h-4 text-blue-500" />;
        case "Father Phone":
          return <Users className="w-4 h-4 text-blue-600" />;
        case "Mother Phone":
          return <Users className="w-4 h-4 text-pink-500" />;
        case "Guardian Phone":
          return <Users className="w-4 h-4 text-purple-500" />;
        case "Teacher Phone":
          return <UserCheck className="w-4 h-4 text-green-500" />;
        case "Employee Phone":
          return <Briefcase className="w-4 h-4 text-purple-500" />;
        default:
          return <MessageCircle className="w-4 h-4 text-gray-500" />;
      }
    }
    
    // Fallback to old participantType logic
    const type = conversation?.participantType || 'unknown';
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

  const getMessageStatusIcon = (message: any) => {
    if (message.direction === 'INCOMING') return null;
    
    switch (message.status) {
      case 'SENT':
        return <CheckCircle className="w-3 h-3 text-muted-foreground/60" />;
      case 'DELIVERED':
        return <CheckCircle2 className="w-3 h-3 text-muted-foreground/60" />;
      case 'READ':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground/60" />;
    }
  };

  // Format message timestamp
  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd/MM/yyyy");
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  // ⚡ Enhanced real-time timer for 24-hour window with immediate updates
  useEffect(() => {
    if (!messageWindow?.canSendFreeform || !messageWindow?.lastIncomingMessageAt) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const lastIncoming = new Date(messageWindow.lastIncomingMessageAt!);
      const windowExpiry = new Date(lastIncoming.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      const timeLeft = windowExpiry.getTime() - now.getTime();

      if (timeLeft <= 0) {
        setTimeRemaining("EXPIRED");
        // Refresh window status when expired
        refetchMessageWindow();
        // Show notification when timer expires
        toast({
          title: "24-Hour Window Expired",
          description: "You can now only send pre-approved template messages until the customer responds again.",
          variant: "destructive",
        });
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately when messageWindow changes (e.g., new incoming message)
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [messageWindow?.canSendFreeform, messageWindow?.lastIncomingMessageAt, messageWindow, toast, refetchMessageWindow]);

  const sendMessage = useCallback(async () => {
    if (!messageContent.trim() || !conversationId || isLoading) return;

    setIsLoading(true);
    sendMessageMutation.mutate({
      conversationId,
      content: messageContent.trim(),
    });
  }, [messageContent, conversationId, isLoading, sendMessageMutation]);

  const handleSendTemplateMessage = async () => {
    if (!selectedTemplate || !conversationId) return;

    sendTemplateMessageMutation.mutate({
      conversationId,
      templateId: selectedTemplate,
      templateVariables: templateVariables,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Permission check
  if (!hasPermission("view_communication_logs")) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-md px-6"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-primary to-blue-500 p-4 rounded-2xl shadow-lg">
              <MessageSquare className="mx-auto h-8 w-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-3">
            Access Restricted
          </h3>
          
          <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
            You need special permissions to view WhatsApp conversations. Please contact your administrator for access.
          </p>
          
          <Card className="p-4 bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Required Permission</p>
                <p className="text-xs text-muted-foreground font-mono">view_communication_logs</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Empty state when no conversation selected
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-lg px-6"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-primary to-blue-500 p-6 rounded-3xl shadow-lg">
              <MessageSquare className="mx-auto h-12 w-12 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-4">
            WhatsApp Business
          </h3>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Select a conversation from the sidebar to start viewing and responding to WhatsApp messages from your school community.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Card className="p-4 bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <h4 className="font-semibold text-sm">Parents</h4>
              </div>
              <p className="text-xs text-muted-foreground">Connect with student families</p>
            </Card>
            
            <Card className="p-4 bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <GraduationCap className="h-4 w-4 text-green-500" />
                </div>
                <h4 className="font-semibold text-sm">Students</h4>
              </div>
              <p className="text-xs text-muted-foreground">Direct student communication</p>
            </Card>
            
            <Card className="p-4 bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <UserCheck className="h-4 w-4 text-purple-500" />
                </div>
                <h4 className="font-semibold text-sm">Staff</h4>
              </div>
              <p className="text-xs text-muted-foreground">Internal team messaging</p>
            </Card>
          </div>

          <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-3 text-sm text-primary">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">Getting Started</p>
                <p className="text-xs text-muted-foreground">Incoming messages automatically create conversations. Ensure your Twilio webhook is configured.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/10">
      {/* Modern Chat Header */}
      {conversationId && conversation && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-md border-b border-border/50 shadow-sm"
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                      {getInitials(conversation?.participantName || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-sm border">
                    {getParticipantIcon(conversation)}
                  </div>
                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background shadow-sm animate-pulse"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg text-foreground truncate">
                    {conversation?.participantName || 'Unknown Contact'}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {/* Enhanced contact type display */}
                    {conversation?.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata ? (
                      <>
                        <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                          {getContactTypeDisplay(conversation)}
                        </Badge>
                        {(conversation.metadata.contactDetails as any)?.studentName && (
                          <Badge variant="secondary" className="text-xs">
                            {(conversation.metadata.contactDetails as any)?.studentName}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {conversation?.participantType || 'Unknown'}
                      </Badge>
                    )}
                    <span className="text-muted-foreground/60">•</span>
                    <span className="font-mono text-xs">
                      {conversation?.participantPhone?.replace('whatsapp:', '') || 'No phone'}
                    </span>
                  </div>
                  
                  {/* Additional metadata display */}
                  {conversation?.metadata && typeof conversation.metadata === 'object' && (
                    (('class' in conversation.metadata) || ('section' in conversation.metadata) || ('designation' in conversation.metadata)) && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {('class' in conversation.metadata) && (conversation.metadata.class as string) && (
                          <span className="bg-muted/50 px-2 py-1 rounded">
                            Class {conversation.metadata.class as string}
                          </span>
                        )}
                        {('section' in conversation.metadata) && (conversation.metadata.section as string) && (
                          <span className="bg-muted/50 px-2 py-1 rounded">
                            Section {conversation.metadata.section as string}
                          </span>
                        )}
                        {('designation' in conversation.metadata) && (conversation.metadata.designation as string) && (
                          <span className="bg-muted/50 px-2 py-1 rounded">
                            {conversation.metadata.designation as string}
                          </span>
                        )}
                      </div>
                    )
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">
                      {conversation?.lastMessageAt 
                        ? `Last seen ${formatDistanceToNow(conversation.lastMessageAt)} ago`
                        : "No recent activity"
                      }
                    </span>
                    
                    {/* Minimal window status indicator */}
                    {messageWindow?.canSendFreeform && timeRemaining && timeRemaining !== "EXPIRED" && (
                      <>
                        <span className="text-muted-foreground/60">•</span>
                        <div className={cn(
                          "flex items-center gap-1 text-xs",
                          formatWindowTimer(timeRemaining).color
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            formatWindowTimer(timeRemaining).color.replace('text-', 'bg-')
                          )}></div>
                          <span className="font-medium">
                            {getTimerStatusText(timeRemaining)}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {conversation?._count?.messages || 0} messages
                    </Badge>
                    
                    {/* ⚡ Enhanced: Show unread count */}
                    {conversation?.unreadCount && conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount} unread
                      </Badge>
                    )}
                    
                    {/* 🐛 Debug: Show metadata status */}
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        const meta = conversation?.metadata;
                        return meta && typeof meta === 'object' && meta !== null && !Array.isArray(meta) && 'contactDetails' in meta ? '✓ Enhanced' : '⚠️ Basic';
                      })()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {/* Minimal Timer Display */}
                {messageWindow?.canSendFreeform && timeRemaining && timeRemaining !== "EXPIRED" && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono",
                    (() => {
                      const { urgency } = formatWindowTimer(timeRemaining);
                      if (urgency === 'high') return "bg-red-100/80 text-red-700 dark:bg-red-900/30 dark:text-red-300";
                      if (urgency === 'medium') return "bg-orange-100/80 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
                      return "bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-300";
                    })()
                  )}>
                    <Clock className="w-3 h-3" />
                    <span className="font-semibold tracking-wide">{formatWindowTimer(timeRemaining).display}</span>
                  </div>
                )}
                
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-accent/50">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-accent/50">
                  <PhoneCall className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-accent/50">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-accent/50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {messagesLoading ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="animate-pulse"
                  >
                    <div className={cn(
                      "flex gap-3",
                      i % 2 === 0 ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[70%] rounded-2xl p-4 shadow-sm",
                        i % 2 === 0 
                          ? "bg-primary/20" 
                          : "bg-muted"
                      )}>
                        <div className="space-y-2">
                          <div className={cn(
                            "h-4 rounded",
                            i % 2 === 0 ? "bg-primary/30" : "bg-muted-foreground/20"
                          )}></div>
                          <div className={cn(
                            "h-3 rounded w-3/4",
                            i % 2 === 0 ? "bg-primary/30" : "bg-muted-foreground/20"
                          )}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-2xl opacity-30"></div>
                  <div className="relative bg-gradient-to-r from-primary to-blue-500 p-4 rounded-2xl shadow-lg mx-auto w-fit">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Start the conversation
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No messages yet. Send a message below to begin your conversation with {conversation?.participantName || 'this contact'}.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => {
                  const isOwn = message.direction === 'OUTGOING';
                  const showDate = index === 0 || 
                    new Date(message.createdAt).toDateString() !== 
                    new Date(messages[index - 1]?.createdAt || '').toDateString();
                  const showAvatar = !isOwn && (
                    index === messages.length - 1 || 
                    messages[index + 1]?.direction === 'OUTGOING'
                  );

                  return (
                    <motion.div 
                      key={message.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {/* Date separator */}
                      {showDate && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex justify-center my-8"
                        >
                          <div className="bg-card/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">
                              {format(new Date(message.createdAt), "EEEE, MMMM d, yyyy")}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Message */}
                      <div className={cn(
                        "flex items-end gap-3 mb-2",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        {/* Avatar for incoming messages */}
                        {!isOwn && (
                          <div className="flex-shrink-0 w-8">
                            {showAvatar && (
                              <Avatar className="h-8 w-8 shadow-md ring-2 ring-background">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-muted to-muted/80 font-semibold">
                                  {getInitials(conversation?.participantName || '')}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "relative max-w-[75%] rounded-2xl px-4 py-3 shadow-md",
                            "group cursor-pointer transition-all duration-300",
                            isOwn
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-primary/20"
                              : "bg-card text-card-foreground rounded-bl-md hover:shadow-lg border border-border/50"
                          )}
                        >
                          {/* Message content */}
                          <div className="break-words">
                            {message.content.startsWith('[Template:') ? (
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  isOwn ? "bg-primary-foreground/20" : "bg-primary/10"
                                )}>
                                  <Mail className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Template Message</p>
                                  <p className="text-xs opacity-80">
                                    {message.content.replace('[Template:', '').replace(']', '')}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">
                                {message.content}
                              </p>
                            )}
                          </div>

                          {/* Message metadata */}
                          <div className={cn(
                            "flex items-center justify-end mt-2 gap-1.5",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            <span className="text-xs font-medium">
                              {formatMessageTime(new Date(message.createdAt))}
                            </span>
                            {getMessageStatusIcon(message)}
                          </div>

                          {/* Hover indicator */}
                          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className={cn(
                              "absolute inset-0 rounded-2xl",
                              isOwn ? "bg-primary-foreground/5" : "bg-primary/5"
                            )}></div>
                          </div>
                        </motion.div>

                        {/* Spacer for outgoing messages */}
                        {isOwn && <div className="w-8"></div>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Window Status */}
      {hasPermission("create_communication_message") && conversation && messageWindow && (
        <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm">
          {/* Enhanced Window Status Display */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 my-4"
          >
            <Alert className={cn(
              "backdrop-blur-sm shadow-sm",
              messageWindow.canSendFreeform 
                ? "border-primary/20 bg-primary/5" 
                : "border-destructive/20 bg-destructive/5"
            )}>
              {messageWindow.canSendFreeform ? (
                <Clock className="h-4 w-4 text-primary" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className={cn(
                "font-medium",
                messageWindow.canSendFreeform ? "text-primary" : "text-destructive"
              )}>
                {getWindowStatusExplanation(messageWindow)}
                {!messageWindow.canSendFreeform && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto ml-2 text-destructive hover:text-destructive/80 font-medium"
                    onClick={() => setShowTemplateSelector(true)}
                  >
                    Use Template Message →
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Template Selector */}
          <AnimatePresence>
            {showTemplateSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <Card className="m-4 bg-card/95 backdrop-blur-sm border-border/30 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">Template Message</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            Send an approved template outside the 24-hour window
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplateSelector(false)}
                        className="h-8 w-8 p-0 hover:bg-accent/50 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{template.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedTemplateData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Template Preview
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedTemplateData.templateBody}
                          </p>
                        </div>
                        
                        {selectedTemplateData.templateVariables?.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Template Variables
                            </h4>
                            <div className="grid gap-3">
                              {selectedTemplateData.templateVariables.map((variable) => (
                                <div key={variable} className="space-y-1">
                                  <label className="block text-sm font-medium text-muted-foreground">
                                    {variable}
                                  </label>
                                  <input
                                    type="text"
                                    value={templateVariables[variable] || ""}
                                    onChange={(e) => setTemplateVariables(prev => ({
                                      ...prev,
                                      [variable]: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                                    placeholder={`Enter ${variable}...`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={handleSendTemplateMessage}
                          disabled={sendTemplateMessageMutation.isPending}
                          size="sm"
                          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Template Message
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modern Message Input */}
      {hasPermission("create_communication_message") && conversation && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-border/50 bg-card/90 backdrop-blur-md"
        >
          {/* Show template button when outside window */}
          {messageWindow && !messageWindow.canSendFreeform && !showTemplateSelector && (
            <div className="p-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
                className="w-full bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-sm rounded-lg"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Template Message
              </Button>
            </div>
          )}

          <div className="p-4 bg-card/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {/* Attachment Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 p-0 hover:bg-accent/50 rounded-full flex-shrink-0"
                disabled={messageWindow && !messageWindow.canSendFreeform}
              >
                <Plus className="w-5 h-5" />
              </Button>

              {/* Message Input Container */}
              <div className="flex-1 relative">
                <div className="flex items-center bg-background/90 backdrop-blur-sm rounded-3xl border border-border/50 shadow-sm overflow-hidden min-h-[44px]">
                  {/* Quick Actions */}
                  <div className="flex items-center pl-3 pr-2 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-accent/50 rounded-full"
                      disabled={messageWindow && !messageWindow.canSendFreeform}
                    >
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-accent/50 rounded-full"
                      disabled={messageWindow && !messageWindow.canSendFreeform}
                    >
                      <File className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1 px-2 py-2">
                    <Textarea
                      ref={messageInputRef}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        messageWindow?.canSendFreeform 
                          ? "Type your message..." 
                          : "Use template message to contact"
                      }
                      disabled={messageWindow && !messageWindow.canSendFreeform}
                      className="min-h-[28px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/70 disabled:opacity-50 leading-relaxed"
                      rows={1}
                    />
                  </div>

                  {/* Emoji and Voice */}
                  <div className="flex items-center pl-2 pr-3 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-accent/50 rounded-full"
                      disabled={messageWindow && !messageWindow.canSendFreeform}
                    >
                      <Smile className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-accent/50 rounded-full"
                      disabled={messageWindow && !messageWindow.canSendFreeform}
                    >
                      <Mic className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={sendMessage}
                disabled={!messageContent.trim() || isLoading || (messageWindow && !messageWindow.canSendFreeform)}
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg transition-all duration-200 flex-shrink-0",
                  messageContent.trim() && messageWindow?.canSendFreeform
                    ? "bg-gradient-to-r from-primary to-primary/90 hover:shadow-xl hover:scale-105 shadow-primary/30"
                    : "bg-muted/80 hover:bg-muted text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
} 