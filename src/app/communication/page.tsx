"use client";

import React from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/providers/auth-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommunicationStatsCards } from "@/components/communication/communication-stats-cards";
import { 
  MessageSquare, 
  Send, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  Plus,
  MessageCircle,
  AlertCircle,
  History
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";



export default function CommunicationDashboard() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { user, session, loading: authLoading } = useAuth();
  
  // Check authentication state properly
  const isAuthenticated = !!user && !!session;
  const shouldFetchData = isAuthenticated && !authLoading && !!session?.access_token;

  // Debug authentication state
  console.log('🔍 Communication Dashboard Auth State:', {
    isAuthenticated,
    authLoading,
    shouldFetchData,
    hasUser: !!user,
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    userId: user?.id,
    sessionAccessToken: session?.access_token ? '***' + session.access_token.slice(-10) : 'none'
  });

  // Fetch recent messages
  const { data: recentMessages, isLoading: messagesLoading } = api.communication.getMessages.useQuery({
    branchId: currentBranchId || undefined,
    limit: 5,
    offset: 0,
  }, {
    enabled: shouldFetchData, // Only run when authenticated
  });

  // Fetch available templates with auto-refresh (now global)
  const { data: templates, isLoading: templatesLoading } = api.communication.getTemplates.useQuery({
    isActive: true,
  }, {
    enabled: shouldFetchData, // Only run when authenticated
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
    staleTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Permission checks
  const canCreateMessage = hasPermission("create_communication_message");
  const canManageTemplates = hasPermission("manage_whatsapp_templates");
  const canViewLogs = hasPermission("view_communication_logs");
  const canManageSettings = hasPermission("manage_communication_settings");

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      SENT: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
      FAILED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
      PENDING: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: <Clock className="w-3 h-3" /> },
      SCHEDULED: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
      SENDING: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: <Send className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1", config?.color || "")}>
        {config?.icon}
        {status}
      </Badge>
    );
  };

  return (
    <div className="@container/main flex min-h-screen flex-col bg-background">
      <div className="flex-1 space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Communication Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage WhatsApp messages and communication with students, teachers, and parents
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {canManageSettings && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/communication/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              )}
              
              {canCreateMessage && (
                <Button size="sm" asChild className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7AAD8B] dark:hover:bg-[#7AAD8B]/90">
                  <Link href="/communication/send">
                    <Plus className="mr-2 h-4 w-4" />
                    Send Message
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <CommunicationStatsCards 
            dateFrom={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            dateTo={new Date()}
          />

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* WhatsApp Chat Interface */}
              {canViewLogs && (
                <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-[#00501B]/20 dark:hover:border-[#7AAD8B]/20">
                  <Link href="/chat" target="_blank" rel="noopener noreferrer" className="block">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00501B]/10 dark:bg-[#7AAD8B]/10">
                          <MessageSquare className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                        </div>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          New Tab
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium text-foreground group-hover:text-[#00501B] dark:group-hover:text-[#7AAD8B] transition-colors">
                        WhatsApp Chat
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View and respond to WhatsApp messages
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              )}

              {/* Send Message */}
              {canCreateMessage && (
                <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-[#00501B]/20 dark:hover:border-[#7AAD8B]/20">
                  <Link href="/communication/send" className="block">
                    <CardHeader className="pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium text-foreground group-hover:text-blue-600 transition-colors">
                        Send Message
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Compose and send new messages
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              )}

              {/* Manage Templates */}
              {canManageTemplates && (
                <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-[#00501B]/20 dark:hover:border-[#7AAD8B]/20">
                  <Link href="/communication/templates" className="block">
                    <CardHeader className="pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <MessageSquare className="h-5 w-5 text-emerald-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium text-foreground group-hover:text-emerald-600 transition-colors">
                        Templates
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Manage WhatsApp templates
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              )}

              {/* View History */}
              {canViewLogs && (
                <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-[#00501B]/20 dark:hover:border-[#7AAD8B]/20">
                  <Link href="/communication/history" className="block">
                    <CardHeader className="pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <History className="h-5 w-5 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium text-foreground group-hover:text-purple-600 transition-colors">
                        Message History
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View delivery logs and status
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Messages */}
            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold">Recent Messages</CardTitle>
                  <CardDescription className="text-sm">
                    Latest communication activities
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/communication/history" className="text-[#00501B] border-[#00501B]/20 hover:bg-[#00501B]/5 dark:text-[#7AAD8B] dark:border-[#7AAD8B]/20 dark:hover:bg-[#7AAD8B]/5">
                    View All
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentMessages?.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No messages sent yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Start by sending your first message
                    </p>
                    {canCreateMessage && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/communication/send">Send First Message</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMessages?.messages.map((message) => (
                      <div key={message.id} className="group rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {message.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{message.totalRecipients} recipients</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(message.createdAt))} ago</span>
                            </div>
                            {message.template && (
                              <p className="text-xs text-[#00501B] dark:text-[#7AAD8B]">
                                Template: {message.template.name}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {getStatusBadge(message.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Templates */}
            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold">WhatsApp Templates</CardTitle>
                  <CardDescription className="text-sm">
                    Approved templates ready to use
                  </CardDescription>
                </div>
                {canManageTemplates && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/communication/templates" className="text-[#00501B] border-[#00501B]/20 hover:bg-[#00501B]/5 dark:text-[#7AAD8B] dark:border-[#7AAD8B]/20 dark:hover:bg-[#7AAD8B]/5">
                      Manage
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : templates?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-4">
                      <AlertCircle className="h-8 w-8 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No templates available</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Sync templates from Meta or create new ones
                    </p>
                    {canManageTemplates && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/communication/templates">Manage Templates</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates?.slice(0, 4).map((template) => (
                      <div key={template.id} className="group rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {template.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground capitalize">
                              <span>{template.category}</span>
                              <span>•</span>
                              <span>{template.language}</span>
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <Badge 
                              variant={template.status === 'APPROVED' ? 'default' : 'secondary'}
                              className={cn(
                                template.status === 'APPROVED' 
                                  ? "bg-[#00501B]/10 text-[#00501B] dark:bg-[#7AAD8B]/10 dark:text-[#7AAD8B]"
                                  : "bg-amber-500/10 text-amber-600"
                              )}
                            >
                              {template.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {templates && templates.length > 4 && (
                      <div className="text-center pt-2">
                        <Link 
                          href="/communication/templates" 
                          className="text-sm text-[#00501B] dark:text-[#7AAD8B] hover:underline"
                        >
                          View {templates.length - 4} more templates
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
} 