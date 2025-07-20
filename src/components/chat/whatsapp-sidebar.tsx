"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { EnhancedAcademicSessionSelector } from "@/components/enhanced-academic-session-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Search, 
  MessageCircle, 
  Users, 
  UserCheck, 
  Briefcase, 
  GraduationCap,
  RefreshCw,
  Filter,
  Building,
  ChevronDown,
  Check,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Settings,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { 
  sortConversationsForRealtime, 
  getUnreadConversationClasses, 
  getUnreadBadgeClasses,
  formatUnreadCount,
  isRecentlyActive,
  REALTIME_INTERVALS,
  logRealtimeEvent
} from "@/utils/chat-realtime-utils";

interface WhatsAppSidebarProps {
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

function StyledBranchSelector() {
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: branches = [], isLoading } = api.branch.getUserBranches.useQuery();

  // Get current branch display data
  const currentBranch = branches.find((branch) => branch.id === currentBranchId);
  const branchName = currentBranch?.name || "Select Branch";
  const branchCode = currentBranch?.code || "BR";

  // Filter branches based on search
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-lg bg-muted/50 px-3 py-1">
        <Building className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-full items-center gap-2 rounded-lg bg-muted/30 hover:bg-muted/50 px-3 py-1 transition-colors">
        <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium truncate">{branchName}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
            {branchCode}
          </span>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[280px]" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search size={12} className="mr-2 opacity-50" />
          <Input
            placeholder="Search branches..."
            className="h-6 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="max-h-48 overflow-y-auto">
          {filteredBranches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No branches found
            </div>
          ) : (
            filteredBranches.map((branch) => (
              <DropdownMenuItem
                key={branch.id}
                onClick={() => setCurrentBranchId(branch.id)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-xs">{branch.name}</span>
                  {branch.city && (
                    <span className="text-[10px] text-muted-foreground">
                      {branch.city}, {branch.state}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {branch.code && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px]">
                      {branch.code}
                    </span>
                  )}
                  {currentBranchId === branch.id && (
                    <Check size={12} className="text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WhatsAppSidebar({ 
  selectedConversationId, 
  onConversationSelect 
}: WhatsAppSidebarProps) {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { isTeacher } = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [participantFilter, setParticipantFilter] = useState<string>("all");

  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: conversationsLoading, 
    refetch: refetchConversations 
  } = api.chat.getConversations.useQuery({
    branchId: currentBranchId || "",
    search: searchTerm || undefined,
    participantType: participantFilter !== "all" ? participantFilter as any : undefined,
    limit: 100,
  }, {
    enabled: !!currentBranchId && hasPermission("view_communication_logs"),
    refetchInterval: REALTIME_INTERVALS.CONVERSATIONS, // ⚡ Realtime polling
  });

  // Fetch chat statistics with faster refresh
  const { data: stats, refetch: refetchStats } = api.chat.getStats.useQuery({
    branchId: currentBranchId || "",
  }, {
    enabled: !!currentBranchId && hasPermission("view_communication_logs"),
    refetchInterval: REALTIME_INTERVALS.STATS, // ⚡ Realtime stats
  });

  // Get enhanced contact type display text
  const getContactTypeDisplay = (conversation: any) => {
    if (conversation.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata) {
      const contactType = (conversation.metadata.contactDetails as any)?.contactType;
      // Clean up the display text (remove "Phone" suffix for cleaner display)
      return contactType?.replace(' Phone', '') || 'Contact';
    }
    
    // Fallback to capitalize participantType
    return conversation.participantType?.charAt(0).toUpperCase() + conversation.participantType?.slice(1) || 'Unknown';
  };

  // Get participant icon based on enhanced contact details
  const getParticipantIcon = (conversation: any) => {
    // Check if we have enhanced contact details
    if (conversation.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata) {
      const contactType = (conversation.metadata.contactDetails as any)?.contactType;
      
      switch (contactType) {
        case "Student Phone":
          return <GraduationCap className="w-3 h-3 text-blue-500" />;
        case "Father Phone":
          return <Users className="w-3 h-3 text-blue-600" />;
        case "Mother Phone":
          return <Users className="w-3 h-3 text-pink-500" />;
        case "Guardian Phone":
          return <Users className="w-3 h-3 text-purple-500" />;
        case "Teacher Phone":
          return <UserCheck className="w-3 h-3 text-green-500" />;
        case "Employee Phone":
          return <Briefcase className="w-3 h-3 text-purple-500" />;
        default:
          return <MessageCircle className="w-3 h-3 text-gray-500" />;
      }
    }
    
    // Fallback to old participantType logic
    switch (conversation.participantType) {
      case "student":
        return <GraduationCap className="w-3 h-3 text-blue-500" />;
      case "teacher":
        return <UserCheck className="w-3 h-3 text-green-500" />;
      case "employee":
        return <Briefcase className="w-3 h-3 text-purple-500" />;
      case "parent":
        return <Users className="w-3 h-3 text-orange-500" />;
      default:
        return <MessageCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  // Get participant initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ⚡ Sort conversations using realtime utility for optimal UX
  const conversations = sortConversationsForRealtime(conversationsData?.conversations || []);
  
  const totalUnread = stats?.totalUnreadMessages || 0;

  if (!hasPermission("view_communication_logs")) {
    return (
      <Sidebar className="border-r bg-card/50">
        <SidebarContent className="flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-30"></div>
              <MessageSquare className="relative mx-auto h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">No Access</h3>
              <p className="text-sm text-muted-foreground">Chat permissions required</p>
            </div>
          </motion.div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r bg-card w-80 min-w-80 max-w-80" style={{ width: '320px', minWidth: '320px', maxWidth: '320px' }}>
      <SidebarHeader className="border-b bg-background/95 backdrop-blur-sm">
        {/* Compact Header */}
        <div className="px-3 py-3 space-y-3">
          {/* Top Row - Logo and Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={isTeacher ? "/staff/teachers/dashboard" : "/dashboard"} className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-r from-primary to-primary/80">
                  <span className="text-[9px] font-bold text-primary-foreground">SR</span>
                </div>
                <span className="text-sm font-semibold text-foreground">ScholaRise</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-1">
              <Link href="/communication">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </Link>
              <Link href="/communication" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Title and Stats */}
          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3 text-primary" />
                <h1 className="text-sm font-semibold">WhatsApp Chat</h1>
              </div>
              {totalUnread > 0 && (
                <Badge variant="default" className="h-4 text-[10px] px-1">
                  {formatUnreadCount(totalUnread)}
                </Badge>
              )}
          </div>

                    {/* Styled Controls Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Building className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">Branch</span>
                </div>
                <StyledBranchSelector />
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">Academic Session</span>
                </div>
                <div className="[&>button]:h-8 [&>button]:text-xs [&>button]:px-3 [&>button]:w-full [&>button]:bg-muted/30 [&>button]:hover:bg-muted/50 [&>button]:rounded-lg [&>button]:border-0">
                  <EnhancedAcademicSessionSelector />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Settings className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">Theme</span>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>

                {/* Search and Filters */}
        <div className="px-3 pb-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted/30 border-0 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>

          {/* Filter and Refresh */}
          <div className="flex items-center gap-2">
            <Select value={participantFilter} onValueChange={setParticipantFilter}>
              <SelectTrigger className="h-8 flex-1 text-xs bg-muted/30 border-0 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3" />
                  <SelectValue placeholder="Filter contacts" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Contacts</SelectItem>
                <SelectItem value="student" className="text-sm">Students</SelectItem>
                <SelectItem value="teacher" className="text-sm">Teachers</SelectItem>
                <SelectItem value="employee" className="text-sm">Employees</SelectItem>
                <SelectItem value="parent" className="text-sm">Parents</SelectItem>
                <SelectItem value="unknown" className="text-sm">Unknown</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchConversations()}
              className="h-8 w-8 p-0 bg-muted/30 hover:bg-muted/50 rounded-lg"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="w-full max-w-full overflow-hidden">
        <ScrollArea className="flex-1 w-full max-w-full">
          {conversationsLoading ? (
                        <div className="px-1 py-2 space-y-2 w-full max-w-full overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="animate-pulse w-full max-w-[272px] overflow-hidden"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg w-full max-w-full overflow-hidden">
                    <div className="h-9 w-9 bg-muted rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                      <div className="h-2 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-8 text-center space-y-3 w-full max-w-full overflow-hidden"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-20"></div>
                <MessageCircle className="relative mx-auto h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">No conversations</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchTerm ? "No matches found" : "Conversations will appear here"}
                </p>
              </div>
              {searchTerm && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                  className="text-xs h-auto p-0"
                >
                  Clear search
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="px-1 py-1 space-y-1 w-full max-w-full overflow-hidden">
              <AnimatePresence mode="popLayout">
                {conversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={cn(
                      "relative flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 group",
                      "w-full max-w-full overflow-hidden",
                      "hover:bg-accent/80 hover:shadow-sm border border-transparent",
                      selectedConversationId === conversation.id && 
                      "bg-primary/10 border-primary/20 shadow-sm",
                      // ⚡ Enhanced styling for unread conversations using utility
                      getUnreadConversationClasses(conversation.unreadCount)
                    )}
                    onClick={() => onConversationSelect?.(conversation.id)}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9 ring-1 ring-background shadow-sm">
                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                          {getInitials(conversation.participantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm">
                        {getParticipantIcon(conversation)}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className={cn(
                          "absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold",
                          getUnreadBadgeClasses(conversation.unreadCount)
                        )}>
                          {formatUnreadCount(conversation.unreadCount)}
                        </div>
                      )}
                    </div>
                    
                                          <div className="flex-1 ml-3 min-w-0 max-w-[230px] overflow-hidden">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className={cn(
                            "text-sm truncate text-foreground flex-1 min-w-0",
                            conversation.unreadCount > 0 ? "font-bold" : "font-semibold"
                          )}>
                            {conversation.participantName}
                          </h4>
                          {conversation.lastMessageAt && (
                            <p className="text-[10px] text-muted-foreground font-medium shrink-0">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mb-1 min-w-0 overflow-hidden">
                          {/* Enhanced contact type display */}
                          {conversation.metadata && typeof conversation.metadata === 'object' && 'contactDetails' in conversation.metadata ? (
                            <>
                              <span className="text-[10px] font-medium text-primary capitalize shrink-0">
                                {getContactTypeDisplay(conversation)}
                              </span>
                              {(conversation.metadata.contactDetails as any)?.studentName && (
                                <>
                                  <span className="text-muted-foreground text-[9px] shrink-0">•</span>
                                  <span className="text-[9px] text-muted-foreground truncate min-w-0">
                                    {(conversation.metadata.contactDetails as any)?.studentName}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground capitalize shrink-0">
                              {conversation.participantType}
                            </span>
                          )}
                          <span className="text-muted-foreground text-[9px] shrink-0">•</span>
                          <span className="text-[10px] text-muted-foreground truncate min-w-0 flex-1">
                            {conversation.participantPhone.replace('whatsapp:', '')}
                          </span>
                        </div>
                        
                        <div className="flex items-center min-w-0 overflow-hidden">
                          <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                            {conversation.lastMessageFrom === 'INCOMING' ? '' : '✓ '}
                            {conversation.lastMessageContent || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Delete button - appears on hover */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent selecting the conversation
                          
                          const confirmDelete = confirm(
                            `Delete conversation with ${conversation.participantName}?\n\n` +
                            `This will:\n` +
                            `• Delete all messages in this conversation\n` +
                            `• Remove the conversation from the sidebar\n` +
                            `• When they message again, it will create a NEW conversation with enhanced metadata\n\n` +
                            `This action cannot be undone.`
                          );
                          
                          if (!confirmDelete) return;
                          
                          console.log(`🗑️ Deleting conversation: ${conversation.id}`);
                          
                          // Delete conversation
                          fetch('/api/debug/delete-conversation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              conversationId: conversation.id
                            })
                          })
                          .then(response => response.json())
                          .then(result => {
                            console.log('🗑️ Delete result:', result);
                            
                            if (result.success) {
                              // Clear selection if this was the selected conversation
                              if (selectedConversationId === conversation.id) {
                                onConversationSelect?.('');
                              }
                              
                              // Refresh conversations list
                              refetchConversations();
                            } else {
                              alert(`❌ Failed to delete conversation: ${result.error}`);
                            }
                          })
                          .catch(error => {
                            console.error('Delete error:', error);
                            alert(`❌ Error deleting conversation: ${error}`);
                          });
                        }}
                        title="Delete conversation"
                      >
                        🗑️
                      </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer Stats */}
        <div className="p-2 border-t bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              {totalUnread > 0 && ` • ${totalUnread} unread`}
            </p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
} 