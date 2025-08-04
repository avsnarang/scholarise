"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { 
  MessageSquare, 
  Search,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Send,
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Trash2,
  RotateCcw,
  FileText,
  ExternalLink,
  Info,
  Phone
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommunicationMessage {
  id: string;
  title: string;
  templateId?: string | null;
  customMessage?: string | null;
  messageType: string;
  recipientType: string;
  status: string;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  totalRecipients: number;
  successfulSent: number;
  failed: number;
  watiMessageId?: string | null;
  branchId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  template: {
    name: string;
    category: string;
  } | null;
  branch: {
    name: string;
    code: string;
  };
  _count: {
    recipients: number;
  };
}

function MessageHistoryPageContent() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<CommunicationMessage | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  
  // Server-side pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

  // Fetch messages with server-side pagination
  const { data: messagesData, isLoading, refetch } = api.communication.getMessages.useQuery({
    branchId: currentBranchId || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  });

  const allMessages = messagesData?.messages || [];
  const totalMessages = messagesData?.total || 0;

  // Delete message mutation
  const deleteMessageMutation = api.communication.deleteMessage.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Message Deleted",
        description: `Message deleted successfully. Removed ${data.deletedRecipients} recipients and ${data.deletedLogs} log entries.`,
      });
      refetch();
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retry failed recipients mutation
  const retryFailedMutation = api.communication.retryFailedRecipients.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Retry Initiated",
        description: `Successfully retried ${data.retriedCount} failed recipients.`,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleDeleteMessage = (message: CommunicationMessage) => {
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMessage = () => {
    if (messageToDelete) {
      deleteMessageMutation.mutate({ messageId: messageToDelete.id });
    }
  };

  const handleRetryMessage = (message: CommunicationMessage) => {
    if (message.failed > 0) {
      retryFailedMutation.mutate({ messageId: message.id });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      SENT: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
      FAILED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
      PENDING: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: <Clock className="w-3 h-3" /> },
      SCHEDULED: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: <Calendar className="w-3 h-3" /> },
      SENDING: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: <Send className="w-3 h-3" /> },
      DRAFT: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: <AlertCircle className="w-3 h-3" /> },
      CANCELLED: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: <XCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1", config?.color || "")}>
        {config?.icon}
        {status}
      </Badge>
    );
  };

  const getRecipientStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      SENT: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
      DELIVERED: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: <CheckCircle className="w-3 h-3" /> },
      READ: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: <Eye className="w-3 h-3" /> },
      FAILED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
      PENDING: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: <Clock className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1 text-xs", config?.color || "")}>
        {config?.icon}
        {status}
      </Badge>
    );
  };

  const columns: ColumnDef<CommunicationMessage>[] = [
    {
      accessorKey: "title",
      header: "Message",
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1 min-w-0">
          {/* Clickable Message Title */}
          <Link 
            href={`/communication/history/${row.original.id}/detailed-log`}
            className="font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 hover:underline truncate max-w-xs transition-colors"
            title={row.original.title}
          >
            {row.original.title}
          </Link>
          
          {/* Template Info with Tooltip */}
          {row.original.template && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-help">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{row.original.template.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-1">
                  <p className="font-medium">{row.original.template.name}</p>
                  <p className="text-xs opacity-80 capitalize">{row.original.template.category}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Message Type Badge with better spacing */}
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="outline" className="text-xs px-2 py-0.5 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600">
              {row.original.recipientType.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col space-y-2">
          {getStatusBadge(row.original.status)}
          
          {/* Progress indicator for sending status */}
          {row.original.status === 'SENDING' && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: '60%' }} // This could be dynamic if we have progress data
              />
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "recipients",
      header: "Recipients",
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col cursor-help">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{row.original.totalRecipients}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {row.original.recipientType.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              <p className="font-medium">Recipient Breakdown</p>
              <p className="text-xs">Type: {row.original.recipientType.replace(/_/g, ' ')}</p>
              <p className="text-xs">Total: {row.original.totalRecipients}</p>
              <p className="text-xs">Branch: {row.original.branch.name}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      accessorKey: "delivery",
      header: "Delivery Stats",
      cell: ({ row }) => {
        const successRate = row.original.totalRecipients > 0 
          ? (row.original.successfulSent / row.original.totalRecipients) * 100 
          : 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col cursor-help space-y-3">
                {/* Success Rate Circle with improved design */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {/* Background circle */}
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <circle 
                        cx="20" cy="20" r="18" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                        className="text-gray-200 dark:text-gray-600"
                      />
                    </svg>
                    
                    {/* Progress circle */}
                    <svg className="absolute inset-0 w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <circle 
                        cx="20" cy="20" r="18" 
                        fill="none" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - successRate / 100)}`}
                        className={cn(
                          "transition-all duration-700 ease-out",
                          successRate >= 90 ? "stroke-green-500" : 
                          successRate >= 70 ? "stroke-amber-500" : 
                          "stroke-red-500"
                        )}
                        style={{
                          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.1))'
                        }}
                      />
                    </svg>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={cn(
                          "text-xs font-bold leading-none",
                          successRate >= 90 ? "text-green-600 dark:text-green-400" : 
                          successRate >= 70 ? "text-amber-600 dark:text-amber-400" : 
                          "text-red-600 dark:text-red-400"
                        )}>
                          {successRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {row.original.successfulSent}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        / {row.original.totalRecipients}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      delivered
                    </span>
                  </div>
                </div>

                {/* Failed Count with improved spacing */}
                {row.original.failed > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                      {row.original.failed} failed
                    </span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1">
                <p className="font-medium">Delivery Details</p>
                <p className="text-xs">✅ Sent: {row.original.successfulSent}</p>
                <p className="text-xs">❌ Failed: {row.original.failed}</p>
                <p className="text-xs">📊 Success Rate: {successRate.toFixed(1)}%</p>
                <p className="text-xs">👥 Total: {row.original.totalRecipients}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "timing",
      header: "Timing",
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col space-y-1 cursor-help">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span>
                  {row.original.sentAt 
                    ? format(new Date(row.original.sentAt), "MMM dd")
                    : format(new Date(row.original.createdAt), "MMM dd")
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(row.original.createdAt))} ago</span>
              </div>

              {row.original.scheduledAt && (
                <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                  <Calendar className="w-3 h-3" />
                  <span>Scheduled</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              <p className="font-medium">Message Timeline</p>
              <p className="text-xs">📅 Created: {format(new Date(row.original.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
              {row.original.sentAt && (
                <p className="text-xs">📤 Sent: {format(new Date(row.original.sentAt), "MMM dd, yyyy 'at' h:mm a")}</p>
              )}
              {row.original.scheduledAt && (
                <p className="text-xs">⏰ Scheduled: {format(new Date(row.original.scheduledAt), "MMM dd, yyyy 'at' h:mm a")}</p>
              )}
                               {row.original.watiMessageId && (
                   <p className="text-xs font-mono">🔗 Wati ID: {row.original.watiMessageId}</p>
                 )}
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {/* View Detailed Log */}
          <Tooltip>
            <TooltipTrigger asChild>
                          <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Link href={`/communication/history/${row.original.id}/detailed-log`}>
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Link>
            </Button>
            </TooltipTrigger>
            <TooltipContent>View detailed delivery logs</TooltipContent>
          </Tooltip>
          
          {/* Retry failed recipients */}
          {row.original.failed > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRetryMessage(row.original)}
                  disabled={retryFailedMutation.isPending}
                  className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  {retryFailedMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-orange-600" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Retry {row.original.failed} failed recipients</TooltipContent>
            </Tooltip>
          )}
          
          {/* Additional Info */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Info className="w-4 h-4 text-gray-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <div className="space-y-2">
                <p className="font-medium">{row.original.title}</p>
                {row.original.template && (
                  <p className="text-xs">📄 Template: {row.original.template.name}</p>
                )}
                <p className="text-xs">🏢 Branch: {row.original.branch.name}</p>
                <p className="text-xs">👤 Created by: {row.original.createdBy}</p>
                                 {row.original.watiMessageId && (
                   <p className="text-xs font-mono">🔗 Wati: {row.original.watiMessageId.slice(0, 12)}...</p>
                 )}
              </div>
            </TooltipContent>
          </Tooltip>
          
          {/* Delete Message */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteMessage(row.original)}
                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete message and all logs</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  if (!hasPermission("view_communication_logs")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view communication logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3"></div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-gray-100">
            Message History
          </h1>
          <p className="text-sm text-gray-500 md:text-base dark:text-gray-400">
            View detailed logs and delivery status of all sent messages
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/communication">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Main DataTable */}
      <TooltipProvider>
        <div className="w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Messages</CardTitle>
                  <CardDescription>
                    Complete history of communication messages
                  </CardDescription>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  {/* Filters Row */}
                  <div className="flex flex-1 items-center gap-3">
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value);
                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SENT">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Sent
                          </span>
                        </SelectItem>
                        <SelectItem value="FAILED">
                          <span className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Failed
                          </span>
                        </SelectItem>
                        <SelectItem value="PENDING">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="SCHEDULED">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            Scheduled
                          </span>
                        </SelectItem>
                        <SelectItem value="SENDING">
                          <span className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-orange-600" />
                            Sending
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>

                    <Button asChild size="sm">
                      <Link href="/communication/send">
                        <Send className="mr-2 h-4 w-4" />
                        Send New
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex animate-pulse space-x-4 p-4">
                      <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 w-3/4 rounded bg-gray-300"></div>
                        <div className="h-3 w-1/2 rounded bg-gray-300"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : totalMessages === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {statusFilter !== "all"
                      ? "No matching messages"
                      : "No messages found"}
                  </h3>
                  <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {statusFilter !== "all"
                      ? "Try adjusting your filter criteria"
                      : "Start sending messages to see them here"}
                  </p>
                  {statusFilter === "all" && (
                    <Button asChild>
                      <Link href="/communication/send">
                        <Send className="mr-2 h-4 w-4" />
                        Send First Message
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={allMessages}
                  searchPlaceholder="Search messages and templates..."
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  pageCount={Math.ceil(totalMessages / pagination.pageSize)}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                  pageSize={50}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the message "
              {messageToDelete?.title}"? This action cannot be undone and will
              permanently remove the message, all recipient records, and
              delivery logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMessage}
              disabled={deleteMessageMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMessageMutation.isPending
                ? "Deleting..."
                : "Delete Message"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicMessageHistoryPageContent = dynamic(() => Promise.resolve(MessageHistoryPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function MessageHistoryPage() {
  return <DynamicMessageHistoryPageContent />;
} 