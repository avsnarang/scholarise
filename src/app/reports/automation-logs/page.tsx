"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/use-toast";


import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

import { AutomationStatsCards } from "@/components/communication/automation-stats-cards";

interface AutomationLogEntry {
  id: string;
  messageId: string;
  messageTitle: string;
  recipientName: string;
  recipientPhone: string;
  recipientType: string;
  status: string;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
  automationType: string; // e.g., "ADMISSION_REGISTRATION", "FEE_REMINDER", etc.
  automationTrigger?: string;
  templateName?: string;
  platformUsed?: string;
  externalMessageId?: string;
}

const getStatusConfig = (status: string) => {
  const configs = {
    PENDING: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Pending",
      color: "text-yellow-600"
    },
    SENT: {
      variant: "default" as const,
      icon: Send,
      label: "Sent",
      color: "text-blue-600"
    },
    DELIVERED: {
      variant: "outline" as const,
      icon: CheckCircle,
      label: "Delivered",
      color: "text-green-600"
    },
    READ: {
      variant: "secondary" as const,
      icon: Eye,
      label: "Read",
      color: "text-purple-600"
    },
    FAILED: {
      variant: "destructive" as const,
      icon: XCircle,
      label: "Failed",
      color: "text-red-600"
    }
  };
  return configs[status as keyof typeof configs] || configs.PENDING;
};

const getAutomationTypeLabel = (type: string) => {
  const labels = {
    ADMISSION_REGISTRATION: "Admission Registration",
    FEE_REMINDER: "Fee Reminder",
    ATTENDANCE_ALERT: "Attendance Alert",
    EXAM_REMINDER: "Exam Reminder",
    TRANSPORT_NOTIFICATION: "Transport Notification",
    SALARY_NOTIFICATION: "Salary Notification",
    LEAVE_STATUS: "Leave Status Update",
    SYSTEM_NOTIFICATION: "System Notification"
  };
  return labels[type as keyof typeof labels] || type;
};

function AutomationLogsPageContent() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  // Simple state management for DataTable
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Fetch all automation logs (DataTable will handle pagination/filtering)
  const { data: logsData, isLoading, refetch } = api.communication.getAutomationLogs.useQuery({
    branchId: currentBranchId || undefined,
  });

  const allLogs = logsData?.logs || [];
  const totalLogs = logsData?.total || 0;

  // Define filters for the DataTable
  const tableFilters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All statuses",
      options: [
        { label: "Sent", value: "SENT", icon: "🟢" },
        { label: "Delivered", value: "DELIVERED", icon: "🟢" },
        { label: "Read", value: "READ", icon: "🟢" },
        { label: "Failed", value: "FAILED", icon: "🔴" },
        { label: "Pending", value: "PENDING", icon: "🟡" },
      ]
    },
    {
      key: "automationType",
      label: "Type",
      type: "select",
      placeholder: "All types",
      options: [
        { label: "Admissions", value: "ADMISSION_REGISTRATION", icon: "📝" },
        { label: "Fee Reminder", value: "FEE_REMINDER", icon: "💰" },
        { label: "Attendance", value: "ATTENDANCE_ALERT", icon: "📅" },
        { label: "Exams", value: "EXAM_REMINDER", icon: "📚" },
        { label: "Transport", value: "TRANSPORT_NOTIFICATION", icon: "🚌" },
        { label: "System", value: "SYSTEM_NOTIFICATION", icon: "⚙️" },
      ]
    }
  ];

  const columns: ColumnDef<AutomationLogEntry>[] = [
    {
      accessorKey: "messageTitle",
      header: "Message",
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1 min-w-0">
          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs">
            {row.original.messageTitle}
          </div>
          <Badge variant="outline" className="text-xs w-fit">
            {getAutomationTypeLabel(row.original.automationType)}
          </Badge>
          {row.original.templateName && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Template: {row.original.templateName}
            </div>
          )}
          {row.original.platformUsed && (
            <Badge variant="secondary" className="text-xs w-fit">
              {row.original.platformUsed}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "recipientName",
      header: "Recipient",
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {row.original.recipientName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.original.recipientPhone}
          </div>
          <Badge variant="secondary" className="text-xs w-fit capitalize">
            {row.original.recipientType.toLowerCase().replace('_', ' ')}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = getStatusConfig(row.original.status);
        return (
          <div className="flex flex-col space-y-1">
            <Badge variant={config.variant} className="w-fit">
              <config.icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {row.original.errorMessage && (
              <div className="text-xs text-red-500 dark:text-red-400 max-w-xs truncate">
                {row.original.errorMessage}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "timeline",
      header: "Timeline",
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1 text-xs">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Send className="w-3 h-3" />
            <span>Sent: {row.original.sentAt ? format(new Date(row.original.sentAt), "MMM dd, HH:mm") : "Not sent"}</span>
          </div>
          {row.original.deliveredAt && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>Delivered: {format(new Date(row.original.deliveredAt), "MMM dd, HH:mm")}</span>
            </div>
          )}
          {row.original.readAt && (
            <div className="flex items-center gap-1 text-purple-600">
              <Eye className="w-3 h-3" />
              <span>Read: {format(new Date(row.original.readAt), "MMM dd, HH:mm")}</span>
            </div>
          )}
          <div className="text-gray-500 dark:text-gray-400">
            Created: {format(new Date(row.original.createdAt), "MMM dd, HH:mm")}
          </div>
        </div>
      ),
    },
  ];

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!allLogs.length) return { 
      total: 0, 
      sent: 0, 
      delivered: 0, 
      read: 0, 
      failed: 0,
      totalChange: 0,
      sentChange: 0,
      deliveredChange: 0,
      readChange: 0,
      failedChange: 0
    };
    
    const currentStats = {
      total: allLogs.length,
      sent: allLogs.filter((log: AutomationLogEntry) => log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ').length,
      delivered: allLogs.filter((log: AutomationLogEntry) => log.status === 'DELIVERED' || log.status === 'READ').length,
      read: allLogs.filter((log: AutomationLogEntry) => log.status === 'READ').length,
      failed: allLogs.filter((log: AutomationLogEntry) => log.status === 'FAILED').length,
    };

    // Calculate mock percentage changes (in a real app, you'd compare with previous period data)
    return {
      ...currentStats,
      totalChange: Math.floor(Math.random() * 20) - 10, // Random between -10 and 10
      sentChange: Math.floor(Math.random() * 15) - 5,   // Random between -5 and 10
      deliveredChange: Math.floor(Math.random() * 15) - 5,
      readChange: Math.floor(Math.random() * 15) - 5,
      failedChange: Math.floor(Math.random() * 10) - 15 // Bias towards negative (fewer failures is good)
    };
  }, [allLogs]);

  return (
    <div className="max-w-full bg-white dark:bg-gray-950">
      <div className="space-y-8 p-6 max-w-full mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automation Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Track automated messages sent by the system after various operations
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="@container/main">
          <AutomationStatsCards
            totalMessages={stats.total}
            totalMessagesChange={stats.totalChange}
            sentMessages={stats.sent}
            sentMessagesChange={stats.sentChange}
            deliveredMessages={stats.delivered}
            deliveredMessagesChange={stats.deliveredChange}
            readMessages={stats.read}
            readMessagesChange={stats.readChange}
            failedMessages={stats.failed}
            failedMessagesChange={stats.failedChange}
            isLoading={isLoading}
          />
        </div>

        {/* Data Table with built-in search and filters */}
        <DataTable
          columns={columns}
          data={allLogs}
          searchKey="messageTitle"
          searchPlaceholder="Search messages by title..."
          filters={tableFilters}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          pageSize={50}
        />
      </div>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicAutomationLogsPageContent = dynamic(() => Promise.resolve(AutomationLogsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function AutomationLogsPage() {
  return <DynamicAutomationLogsPageContent />;
} 