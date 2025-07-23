"use client";

import React, { useState } from "react";
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
  Trash2
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

export default function MessageHistoryPage() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<CommunicationMessage | null>(null);

  // Fetch messages
  const { data: messagesData, isLoading, refetch } = api.communication.getMessages.useQuery({
    branchId: currentBranchId || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  // Fetch message details
  const { data: messageDetails } = api.communication.getMessageDetails.useQuery({
    messageId: selectedMessage?.id || "",
  }, {
    enabled: !!selectedMessage?.id,
  });

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
      // Clear selected message if it was deleted
      if (selectedMessage?.id === messageToDelete?.id) {
        setSelectedMessage(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Message",
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
      header: "Message Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          {row.original.template && (
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Template: {row.original.template.name}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "recipientType",
      header: "Recipients",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium capitalize">
            {row.original.recipientType.replace(/_/g, ' ').toLowerCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.original.totalRecipients} total
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "delivery",
      header: "Delivery",
      cell: ({ row }) => {
        const successRate = row.original.totalRecipients > 0 
          ? (row.original.successfulSent / row.original.totalRecipients) * 100 
          : 0;
        
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {row.original.successfulSent}/{row.original.totalRecipients}
            </span>
            <span className={cn(
              "text-xs",
              successRate >= 90 ? "text-green-600" : successRate >= 70 ? "text-yellow-600" : "text-red-600"
            )}>
              {successRate.toFixed(1)}% success
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Sent",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {row.original.sentAt 
              ? format(new Date(row.original.sentAt), "MMM dd, yyyy")
              : format(new Date(row.original.createdAt), "MMM dd, yyyy")
            }
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(row.original.createdAt))} ago
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMessage(row.original)}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteMessage(row.original)}
            title="Delete Message"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredMessages = messagesData?.messages.filter(message =>
    message.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.template?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Message History
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              View detailed logs and delivery status of all sent messages
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/communication">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Messages List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Messages</CardTitle>
                    <CardDescription>
                      Complete history of communication messages
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        placeholder="Search messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64 pl-10"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                        <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {searchTerm || statusFilter !== "all"
                        ? "No matching messages"
                        : "No messages found"}
                    </h3>
                    <p className="mb-4 text-gray-500 dark:text-gray-400">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Start sending messages to see them here"}
                    </p>
                    {!searchTerm && statusFilter === "all" && (
                      <Button asChild>
                        <Link href="/communication/send">
                          <Send className="mr-2 h-4 w-4" />
                          Send First Message
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex cursor-pointer items-start justify-between rounded-lg border p-4 transition-colors",
                          selectedMessage?.id === message.id
                            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800",
                        )}
                        onClick={() => setSelectedMessage(message as any)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {message.title}
                            </h4>
                            {getStatusBadge(message.status)}
                          </div>

                          <div className="mb-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {message.totalRecipients} recipients
                            </span>
                            {message.template && (
                              <span>Template: {message.template.name}</span>
                            )}
                            <span>
                              {formatDistanceToNow(new Date(message.createdAt))}{" "}
                              ago
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-green-600 dark:text-green-400">
                              ✓ {message.successfulSent} sent
                            </span>
                            {message.failed > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                ✗ {message.failed} failed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex items-center gap-2">
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Already handled by card click
                            }}
                            title="View Details"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4 text-gray-400" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(message as any);
                            }}
                            title="Delete Message"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Pagination controls would go here */}
                    {messagesData && messagesData.hasMore && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Message Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
                <CardDescription>
                  {selectedMessage
                    ? "Detailed information and delivery status"
                    : "Select a message to view details"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMessage && messageDetails ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                        {selectedMessage.title}
                      </h4>
                      <div className="mb-3 flex items-center gap-2">
                        {getStatusBadge(selectedMessage.status)}
                        <Badge variant="outline" className="text-xs capitalize">
                          {selectedMessage.recipientType
                            .replace(/_/g, " ")
                            .toLowerCase()}
                        </Badge>
                      </div>
                    </div>

                    {messageDetails.template && (
                      <div>
                        <h5 className="mb-2 text-sm font-medium">
                          Template Used
                        </h5>
                        <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-800">
                          <p className="text-sm font-medium">
                            {messageDetails.template.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize dark:text-gray-400">
                            {messageDetails.template.category}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="mb-2 text-sm font-medium">
                        Delivery Summary
                      </h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Recipients:</span>
                          <span className="font-medium">
                            {selectedMessage.totalRecipients}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Successfully Sent:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {selectedMessage.successfulSent}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Failed:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {selectedMessage.failed}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Success Rate:</span>
                          <span className="font-medium">
                            {selectedMessage.totalRecipients > 0
                              ? (
                                  (selectedMessage.successfulSent /
                                    selectedMessage.totalRecipients) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="mb-2 text-sm font-medium">
                        Recent Recipients
                      </h5>
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {messageDetails.recipients
                          .slice(0, 10)
                          .map((recipient) => (
                            <div
                              key={recipient.id}
                              className="flex items-center justify-between rounded border p-2 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {recipient.recipientName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {recipient.recipientPhone}
                                </p>
                              </div>
                              <div>
                                {getRecipientStatusBadge(recipient.status)}
                              </div>
                            </div>
                          ))}
                        {messageDetails.recipients.length > 10 && (
                          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                            +{messageDetails.recipients.length - 10} more
                            recipients
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Created:</span>
                        <span>
                          {format(
                            new Date(selectedMessage.createdAt),
                            "MMM dd, yyyy 'at' h:mm a",
                          )}
                        </span>
                      </div>
                      {selectedMessage.sentAt && (
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Sent:</span>
                          <span>
                            {format(
                              new Date(selectedMessage.sentAt),
                              "MMM dd, yyyy 'at' h:mm a",
                            )}
                          </span>
                        </div>
                      )}
                      {selectedMessage.watiMessageId && (
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Wati ID:</span>
                          <span className="font-mono text-xs">
                            {selectedMessage.watiMessageId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Log Button */}
                    <div className="border-t pt-4">
                      <Button asChild className="w-full">
                        <Link href={`/communication/history/${selectedMessage.id}/detailed-log`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Detailed Log
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select a message from the list to view detailed
                      information and delivery status
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the message "{messageToDelete?.title}"? 
                This action cannot be undone and will permanently remove the message, 
                all recipient records, and delivery logs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteMessage}
                disabled={deleteMessageMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMessageMutation.isPending ? "Deleting..." : "Delete Message"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
} 