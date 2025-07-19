"use client";

import React from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center text-xs",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            <TrendingUp className="mr-1 h-3 w-3" />
            {trend.isPositive ? "+" : ""}{trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunicationDashboard() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();

  // Fetch communication statistics
  const { data: stats, isLoading: statsLoading } = api.communication.getStats.useQuery({
    branchId: currentBranchId || undefined,
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of month
    dateTo: new Date(), // Today
  });

  // Fetch recent messages
  const { data: recentMessages, isLoading: messagesLoading } = api.communication.getMessages.useQuery({
    branchId: currentBranchId || undefined,
    limit: 5,
    offset: 0,
  });

  // Fetch available templates (now global)
  const { data: templates, isLoading: templatesLoading } = api.communication.getTemplates.useQuery({
    isActive: true,
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Communication Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage WhatsApp messages and communication with students, teachers, and parents
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {canManageSettings && (
              <Button variant="outline" asChild>
                <Link href="/communication/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
            
            {canCreateMessage && (
              <Button asChild>
                <Link href="/communication/send">
                  <Plus className="mr-2 h-4 w-4" />
                  Send Message
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages ?? 0}
            description="All time messages sent"
            icon={<MessageSquare className="h-4 w-4" />}
            className="border-l-4 border-l-blue-500"
          />
          
          <StatCard
            title="Successfully Sent"
            value={stats?.sentMessages ?? 0}
            description="This month"
            icon={<CheckCircle className="h-4 w-4" />}
            className="border-l-4 border-l-green-500"
          />
          
          <StatCard
            title="Failed Messages"
            value={stats?.failedMessages ?? 0}
            description="Requires attention"
            icon={<XCircle className="h-4 w-4" />}
            className="border-l-4 border-l-red-500"
          />
          
          <StatCard
            title="Delivery Rate"
            value={`${stats?.deliveryRate?.toFixed(1) ?? 0}%`}
            description="Overall success rate"
            icon={<TrendingUp className="h-4 w-4" />}
            className="border-l-4 border-l-purple-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* WhatsApp Chat Interface */}
          {canViewLogs && (
            <Card className="border-dashed border-gray-300 hover:border-green-500 transition-colors cursor-pointer">
              <Link href="/chat" target="_blank" rel="noopener noreferrer" className="block p-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  WhatsApp Chat Interface
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Full-screen chat interface to view and respond to WhatsApp messages
                </p>
                <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                  Opens in new window
                </div>
              </Link>
            </Card>
          )}

          {/* Send Message */}
          {canCreateMessage && (
            <Card className="border-dashed border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
              <Link href="/communication/send" className="block p-6 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Send New Message
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Compose and send WhatsApp messages to students, teachers, or parents
                </p>
              </Link>
            </Card>
          )}

          {/* Manage Templates */}
          {canManageTemplates && (
            <Card className="border-dashed border-gray-300 hover:border-green-500 transition-colors cursor-pointer">
              <Link href="/communication/templates" className="block p-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Manage Templates
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Create and manage WhatsApp message templates approved by Meta
                </p>
              </Link>
            </Card>
          )}

          {/* View History */}
          {canViewLogs && (
            <Card className="border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer">
              <Link href="/communication/history" className="block p-6 text-center">
                <History className="mx-auto h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Message History
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  View detailed logs and delivery status of all sent messages
                </p>
              </Link>
            </Card>
          )}
        </div>

        {/* Recent Messages & Templates */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Messages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Latest communication activities</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/communication/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentMessages?.messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No messages sent yet</p>
                  {canCreateMessage && (
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/communication/send">Send First Message</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentMessages?.messages.map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {message.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {message.totalRecipients} recipients • {formatDistanceToNow(new Date(message.createdAt))} ago
                        </p>
                        {message.template && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Template: {message.template.name}
                          </p>
                        )}
                      </div>
                      <div className="ml-2">
                        {getStatusBadge(message.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Templates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>WhatsApp Templates</CardTitle>
                <CardDescription>Approved templates ready to use</CardDescription>
              </div>
              {canManageTemplates && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/communication/templates">Manage</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : templates?.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No templates available</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sync templates from Twilio or create new ones
                  </p>
                  {canManageTemplates && (
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/communication/templates">Manage Templates</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {templates?.slice(0, 4).map((template) => (
                    <div key={template.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {template.category} • {template.language}
                        </p>
                        {template.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-2">
                        <Badge className={cn(
                          template.status === 'APPROVED' 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        )}>
                          {template.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {templates && templates.length > 4 && (
                    <div className="text-center pt-2">
                      <Link 
                        href="/communication/templates" 
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
  );
} 