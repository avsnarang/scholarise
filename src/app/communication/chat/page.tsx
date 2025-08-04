"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { AppLayout } from "@/components/layout/app-layout";
import { ChatInterface } from "@/components/communication/chat-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowLeft,
  MessageSquare,
  Info
} from "lucide-react";
import Link from "next/link";
import { api } from "@/utils/api";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={className}>
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
      </CardContent>
    </Card>
  );
}

function ChatPageContent() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  
  // Use chat notifications for real-time updates
  const { totalUnreadMessages } = useChatNotifications();

  // Fetch chat statistics
  const { data: stats, isLoading: statsLoading } = api.chat.getStats.useQuery({
    branchId: currentBranchId || "",
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of month
    dateTo: new Date(), // Today
  }, {
    enabled: !!currentBranchId,
  });

  // Permission check
  const canViewChat = hasPermission("view_communication_logs");

  if (!canViewChat) {
    return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link 
                href="/communication" 
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Communication
              </Link>
            </div>
          </div>
          
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
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link 
              href="/communication" 
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Communication
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Chat Conversations
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                View and manage WhatsApp conversations with students, teachers, and parents
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Conversations"
            value={stats?.totalConversations ?? 0}
            description="All time conversations"
            icon={<MessageCircle className="h-4 w-4" />}
            className="border-l-4 border-l-blue-500"
          />
          
          <StatCard
            title="Active Conversations"
            value={stats?.activeConversations ?? 0}
            description="Last 7 days"
            icon={<Users className="h-4 w-4" />}
            className="border-l-4 border-l-green-500"
          />
          
          <StatCard
            title="Unread Messages"
            value={totalUnreadMessages || stats?.totalUnreadMessages || 0}
            description="Require attention"
            icon={<Clock className="h-4 w-4" />}
            className="border-l-4 border-l-red-500"
          />
          
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages ?? 0}
            description={`${stats?.incomingMessages ?? 0} in, ${stats?.outgoingMessages ?? 0} out`}
            icon={<TrendingUp className="h-4 w-4" />}
            className="border-l-4 border-l-purple-500"
          />
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  How Chat Works
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Incoming WhatsApp messages from students, teachers, and parents automatically create conversations. 
                  You can respond directly from this interface. Make sure your Meta WhatsApp webhook is configured properly in your Meta Business dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="space-y-4">
          <ChatInterface />
        </div>
      </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicChatPageContent = dynamic(() => Promise.resolve(ChatPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ChatPage() {
  return <DynamicChatPageContent />;
} 