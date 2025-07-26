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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Settings,
  Check,
  Archive,
  BellOff,
  Trash2
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
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

interface WhatsAppChatProps {
  conversationId: string | null;
  refreshTrigger?: number; // Add refresh trigger prop
}

export function WhatsAppChat({ conversationId, refreshTrigger }: WhatsAppChatProps) {
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

  // API calls - REMOVED refetchInterval polling for realtime subscriptions
  const { data: conversation, isLoading: conversationLoading, error: conversationError, refetch: refetchConversation } = api.chat.getConversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = api.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      // ⚡ REMOVED: refetchInterval: REALTIME_INTERVALS.MESSAGES // Old polling approach
    }
  );

  const { data: messageWindow, refetch: refetchMessageWindow } = api.chat.checkMessageWindow.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      // ⚡ REMOVED: refetchInterval: REALTIME_INTERVALS.WINDOW_STATUS // Old polling approach
    }
  );

  // ⚡ NEW: Real-time chat subscription
  const { isConnected, newMessageCount, connectionError, markAsViewed, refreshMessages } = useRealtimeChat({
    conversationId: conversationId!,
    branchId: conversation?.branchId || "",
  });

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
      // ⚡ Real-time subscriptions handle updates automatically
      // No need for manual refetch calls
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
      // ⚡ Real-time subscriptions handle updates automatically
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

  // ✅ Add markAsRead mutation
  const markAsReadMutation = api.chat.markAsRead.useMutation({
    onSuccess: () => {
      console.log('✅ Successfully marked conversation as read');
      // Mark as viewed in realtime hook
      markAsViewed();
      refetchConversation();
      toast({
        title: "Marked as read",
        description: "All messages in this conversation have been marked as read.",
      });
    },
    onError: (error) => {
      console.error('❌ Failed to mark as read:', error);
      toast({
        title: "Failed to mark as read",
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
      // For today's messages: just show time in 12-hour format
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      // For yesterday: "Yesterday 2:30 PM"
      return `Yesterday ${format(date, "h:mm a")}`;
    } else {
      // For older messages: "19/07/2025 2:30 PM"
      return `${format(date, "dd/MM/yyyy")} ${format(date, "h:mm a")}`;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  // ✅ Automatically mark conversation as read when opened (if it has unread messages)
  useEffect(() => {
    if (conversationId && conversation && conversation.unreadCount > 0) {
      console.log(`🔄 Auto-marking conversation ${conversationId} as read (${conversation.unreadCount} unread messages)`);
      markAsReadMutation.mutate({
        conversationId: conversationId,
        // Don't specify messageIds to mark ALL unread messages as read
      });
    }
  }, [conversationId, conversation?.unreadCount]); // Only trigger when conversation ID changes or unread count changes

  // Refresh conversation when metadata is updated
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Refreshing conversation due to metadata update');
      refetchConversation();
    }
  }, [refreshTrigger, refetchConversation]);

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
      {/* Compact Chat Header */}
      {conversationId && conversation && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm"
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - Contact info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-1 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                      {getInitials(conversation?.participantName || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-background rounded-full shadow-sm border">
                    {getParticipantIcon(conversation)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground truncate text-sm">
                    {conversation?.participantName || 'Unknown Contact'}
                  </h4>
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-primary/5 border-primary/20 text-primary shrink-0">
                          {getContactTypeDisplay(conversation)}
                        </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span className="font-mono">
                      {conversation?.participantPhone?.replace('whatsapp:', '') || 'No phone'}
                    </span>
                    
                    {/* Real-time connection status */}
                    <span className="mx-1">•</span>
                    <div className={cn(
                      "flex items-center gap-1",
                      isConnected ? "text-green-600" : connectionError ? "text-red-600" : "text-yellow-600"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500" : connectionError ? "bg-red-500" : "bg-yellow-500"
                      )}></div>
                      <span className="text-[10px] font-medium">
                        {isConnected ? "Live" : connectionError ? "Error" : "Connecting..."}
                      </span>
                      {connectionError && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 px-1 text-[10px]"
                          onClick={refreshMessages}
                          title={`Connection error: ${connectionError}. Click to retry.`}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                    
                    {/* New message count indicator */}
                    {newMessageCount > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <div className="flex items-center gap-1 text-blue-600">
                          <MessageCircle className="w-3 h-3" />
                          <span className="text-[10px] font-medium">
                            {newMessageCount} new
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Window status indicator - minimal */}
                    {messageWindow?.canSendFreeform && timeRemaining && timeRemaining !== "EXPIRED" && (
                      <>
                        <span className="mx-1">•</span>
                        <div className={cn(
                          "flex items-center gap-1",
                          formatWindowTimer(timeRemaining).color
                        )}>
                          <Clock className="w-3 h-3" />
                          <span className="font-mono text-[10px] font-medium">
                            {formatWindowTimer(timeRemaining).display}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50">
                  <PhoneCall className="h-3.5 w-3.5" />
                </Button>
                
                {/* Three-dot menu moved from sidebar */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        // ✅ Fix mark as read functionality
                        if (!conversationId) {
                          console.error('No conversation selected');
                          return;
                        }
                        
                        console.log(`🔄 Manually marking conversation ${conversationId} as read`);
                        markAsReadMutation.mutate({
                          conversationId: conversationId,
                          // Don't specify messageIds to mark ALL unread messages as read
                        });
                      }}
                      disabled={markAsReadMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {markAsReadMutation.isPending ? "Marking..." : "Mark as Read"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Archive functionality
                        console.log('Archive conversation:', conversationId);
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Mute/unmute functionality
                        console.log('Toggle mute:', conversationId);
                      }}
                    >
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute Notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => {
                        const confirmDelete = confirm(
                          `Delete conversation with ${conversation?.participantName}?\n\n` +
                          `This will:\n` +
                          `• Delete all messages in this conversation\n` +
                          `• Remove the conversation from the sidebar\n` +
                          `• When they message again, it will create a NEW conversation with enhanced metadata\n\n` +
                          `This action cannot be undone.`
                        );
                        
                        if (!confirmDelete) return;
                        
                        console.log(`🗑️ Deleting conversation: ${conversationId}`);
                        
                        // Delete conversation
                        fetch('/api/debug/delete-conversation', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            conversationId: conversationId
                          })
                        })
                        .then(response => response.json())
                        .then(result => {
                          console.log('🗑️ Delete result:', result);
                          
                          if (result.success) {
                            // Navigate back to chat list or close conversation
                            window.location.href = '/chat';
                          } else {
                            alert(`❌ Failed to delete conversation: ${result.error}`);
                          }
                        })
                        .catch(error => {
                          console.error('Delete error:', error);
                          alert(`❌ Error deleting conversation: ${error}`);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Info Drawer Trigger */}
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50">
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-w-md ml-auto">
                    <div className="mx-auto w-full max-w-sm">
                      <DrawerHeader>
                        <DrawerTitle className="flex items-center gap-2">
                          {getParticipantIcon(conversation)}
                          Contact Details
                        </DrawerTitle>
                        <DrawerDescription>
                          Detailed information about this conversation
                        </DrawerDescription>
                      </DrawerHeader>
                      
                      <div className="p-4 space-y-4">
                        {/* Contact Information */}
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Contact Information
                            </h4>
                            <div className="space-y-1 text-sm bg-muted/30 p-3 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{conversation.participantName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">
                                  {getContactTypeDisplay(conversation)}
                      </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone:</span>
                    <span className="font-mono text-xs">
                                  {conversation.participantPhone?.replace('whatsapp:', '')}
                    </span>
                              </div>
                              {(conversation.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata && (conversation.metadata.contactDetails as any)?.studentName) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Student:</span>
                                  <span className="font-medium">
                                    {(conversation.metadata.contactDetails as any).studentName}
                                  </span>
                                </div>
                              )}
                            </div>
                  </div>
                  
                          {/* Academic Information */}
                  {conversation?.metadata && typeof conversation.metadata === 'object' && (
                    (('class' in conversation.metadata) || ('section' in conversation.metadata) || ('designation' in conversation.metadata)) && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4" />
                                  Academic Details
                                </h4>
                                <div className="space-y-1 text-sm bg-muted/30 p-3 rounded-lg">
                        {('class' in conversation.metadata) && (conversation.metadata.class as string) && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Class:</span>
                                      <span className="font-medium">{conversation.metadata.class as string}</span>
                                    </div>
                        )}
                        {('section' in conversation.metadata) && (conversation.metadata.section as string) && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Section:</span>
                                      <span className="font-medium">{conversation.metadata.section as string}</span>
                                    </div>
                        )}
                        {('designation' in conversation.metadata) && (conversation.metadata.designation as string) && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Designation:</span>
                                      <span className="font-medium">{conversation.metadata.designation as string}</span>
                                    </div>
                        )}
                                </div>
                      </div>
                    )
                  )}
                  
                          {/* Conversation Statistics */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Conversation Stats
                            </h4>
                            <div className="space-y-1 text-sm bg-muted/30 p-3 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Messages:</span>
                                <span className="font-medium">{conversation._count?.messages || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Unread:</span>
                                <span className="font-medium">
                                  {conversation.unreadCount > 0 ? conversation.unreadCount : 'None'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Activity:</span>
                                <span className="text-xs">
                                  {conversation.lastMessageAt 
                                    ? formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })
                                    : "No activity"
                      }
                    </span>
                              </div>
                            </div>
                          </div>

                          {/* Window Status */}
                          {messageWindow && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Message Window
                              </h4>
                              <div className="space-y-1 text-sm bg-muted/30 p-3 rounded-lg">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge variant={messageWindow.canSendFreeform ? "default" : "secondary"} className="text-xs">
                                    {messageWindow.canSendFreeform ? "Open" : "Closed"}
                                  </Badge>
                                </div>
                                {messageWindow.canSendFreeform && timeRemaining && timeRemaining !== "EXPIRED" && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Remaining:</span>
                                    <span className={cn("font-mono text-xs font-medium", formatWindowTimer(timeRemaining).color)}>
                                      {formatWindowTimer(timeRemaining).display}
                          </span>
                        </div>
                                )}
                              </div>
                            </div>
                    )}
                    

                    
                          {/* Debug Info */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Settings className="w-4" />
                              Technical Details
                            </h4>
                            <div className="space-y-1 text-sm bg-muted/30 p-3 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Metadata:</span>
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        const meta = conversation?.metadata;
                        return meta && typeof meta === 'object' && meta !== null && !Array.isArray(meta) && 'contactDetails' in meta ? '✓ Enhanced' : '⚠️ Basic';
                      })()}
                    </Badge>
                  </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono text-xs">{conversation.id.slice(-8)}</span>
                </div>
              </div>
                  </div>
                        </div>
                      </div>
                      
                      <DrawerFooter>
                        <DrawerClose asChild>
                          <Button variant="outline">Close</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <ScrollArea className="flex-1" id="messages-container">
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

                        {/* Message bubble - Minimal design */}
                        <div
                          className={cn(
                            "relative max-w-[75%] rounded-xl px-3 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card text-card-foreground rounded-bl-sm border border-border/30"
                          )}
                        >
                          {/* Message content with inline time */}
                          <div className="break-words">
                            {message.content.startsWith('[Template:') ? (
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "p-1.5 rounded",
                                  isOwn ? "bg-primary-foreground/20" : "bg-primary/10"
                                )}>
                                  <Mail className="h-3 w-3" />
                                </div>
                                <div className="flex-1">
                                  {/* Time inline for template messages */}
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className={cn(
                                      "text-[10px] font-medium",
                                      isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                                    )}>
                                      {formatMessageTime(new Date(message.createdAt))}
                                    </span>
                                    {getMessageStatusIcon(message)}
                                  </div>
                                  <p className="text-sm font-medium">Template Message</p>
                                  <p className="text-xs opacity-80">
                                    {message.content.replace('[Template:', '').replace(']', '')}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {/* Time inline with message */}
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className={cn(
                                    "text-[10px] font-medium shrink-0",
                                    isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                                  )}>
                                    {formatMessageTime(new Date(message.createdAt))}
                                  </span>
                                  {getMessageStatusIcon(message)}
                                </div>
                                <p className="text-sm leading-relaxed">
                                  {message.content}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

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

      {/* Message Window Status - Only show when template messages are required */}
      {hasPermission("create_communication_message") && conversation && messageWindow && !messageWindow.canSendFreeform && (
        <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm">
          {/* Enhanced Window Status Display */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 my-4"
          >
            <Alert className="backdrop-blur-sm shadow-sm border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="text-amber-600 h-5 w-5 mr-2" />
              <AlertDescription className="font-medium leading-relaxed text-amber-800 dark:text-amber-200">
                <div className="flex flex-col gap-1">
                  <span>{getWindowStatusExplanation(messageWindow)}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto justify-start text-amber-700 hover:text-amber-600 font-medium dark:text-amber-300 dark:hover:text-amber-200"
                    onClick={() => setShowTemplateSelector(true)}
                  >
                    Use Template Message →
                  </Button>
                </div>
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