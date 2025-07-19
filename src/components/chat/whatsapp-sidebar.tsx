"use client";

import React, { useState } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { 
  Search, 
  MessageCircle, 
  Users, 
  UserCheck, 
  Briefcase, 
  GraduationCap,
  RefreshCw,
  Settings,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface WhatsAppSidebarProps {
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

export function WhatsAppSidebar({ 
  selectedConversationId, 
  onConversationSelect 
}: WhatsAppSidebarProps) {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch chat statistics
  const { data: stats } = api.chat.getStats.useQuery({
    branchId: currentBranchId || "",
  }, {
    enabled: !!currentBranchId && hasPermission("view_communication_logs"),
  });

  // Get participant icon
  const getParticipantIcon = (type: string) => {
    switch (type) {
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

  const conversations = conversationsData?.conversations || [];
  const totalUnread = stats?.totalUnreadMessages || 0;

  if (!hasPermission("view_communication_logs")) {
    return (
      <Sidebar className="border-r">
        <SidebarContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No access to chat</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r bg-background/95">
      <SidebarContent className="pt-14">
        <div className="p-4 border-b bg-background">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Filter and Refresh */}
          <div className="flex items-center gap-2">
            <Select value={participantFilter} onValueChange={setParticipantFilter}>
              <SelectTrigger className="h-9 flex-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchConversations()}
              className="h-9 w-9 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {totalUnread > 0 && (
              <Badge variant="default" className="h-6 text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
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
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
              {searchTerm && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-center p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-1",
                    selectedConversationId === conversation.id && "bg-muted ring-1 ring-ring"
                  )}
                  onClick={() => onConversationSelect?.(conversation.id)}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="text-sm font-semibold">
                        {getInitials(conversation.participantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                      {getParticipantIcon(conversation.participantType)}
                    </div>
                  </div>
                  
                  <div className="flex-1 ml-3 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {conversation.participantName}
                      </p>
                      {conversation.lastMessageAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {conversation.lastMessageFrom === 'INCOMING' ? '' : '✓ '}
                        {conversation.lastMessageContent || 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground/70 capitalize mt-0.5">
                      {conversation.participantType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          {totalUnread > 0 && ` • ${totalUnread} unread`}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
} 