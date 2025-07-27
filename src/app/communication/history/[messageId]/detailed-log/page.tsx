"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  PhoneOff,
  User,
  Users,
  Download,
  Search,
  Filter,
  Eye,
  RotateCcw,
  RefreshCw,
  MessageSquare,
  Send,
  TrendingUp,
  Activity
} from "lucide-react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

interface DeliveryLogEntry {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientType: string;
  recipientId: string;
  status: string;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  errorMessage?: string | null;
  metaMessageId?: string | null;
}

export default function DetailedLogPage() {
  const params = useParams();
  const messageId = params?.messageId as string;
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  
  // Server-side pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // Fetch message details
  const { data: messageDetails, isLoading, refetch: refetchDetails } = api.communication.getMessageDetails.useQuery({
    messageId: messageId || "",
  }, {
    enabled: !!messageId,
    refetchInterval: 2000, // Poll every 2 seconds when sending
  });

  // Fetch message job status
  const { data: messageJob, isLoading: jobLoading, refetch: refetchJob } = api.communication.getMessageJob.useQuery({
    messageId: messageId || "",
  }, {
    enabled: !!messageId,
    refetchInterval: 2000,
  });

  // Combined refetch for real-time updates
  useEffect(() => {
    const shouldPoll = messageDetails?.status === "SENDING" || 
                      messageJob?.status === "PROCESSING" ||
                      messageJob?.status === "QUEUED";
    
    if (shouldPoll) {
      const interval = setInterval(() => {
        refetchDetails();
        refetchJob();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [messageDetails?.status, messageJob?.status, refetchDetails, refetchJob]);

  // Export CSV functionality
  const exportCsvMutation = api.communication.exportDeliveryLog.useQuery({
    messageId: messageId || "",
  }, {
    enabled: false,
  });

  // Retry failed recipients mutation
  const retryFailedMutation = api.communication.retryFailedRecipients.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Retry Initiated",
        description: `Successfully retried ${data.retriedCount} failed recipients.`,
      });
      refetchDetails();
      refetchJob();
      setRowSelection({});
    },
    onError: (error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportCsv = async () => {
    try {
      const result = await exportCsvMutation.refetch();
      if (result.data) {
        const blob = new Blob([result.data.csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "CSV file has been downloaded.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, errorMessage?: string | null) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      SENT: { 
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", 
        icon: <CheckCircle className="w-3 h-3" />, 
        label: "Sent" 
      },
      DELIVERED: { 
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", 
        icon: <CheckCircle className="w-3 h-3" />, 
        label: "Delivered" 
      },
      FAILED: { 
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", 
        icon: <XCircle className="w-3 h-3" />, 
        label: "Failed" 
      },
      PENDING: { 
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
        icon: <Clock className="w-3 h-3" />, 
        label: "Pending" 
      },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <div className="flex flex-col gap-1">
        <Badge className={cn("flex items-center gap-1 w-fit", config?.color)}>
          {config?.icon}
          {config?.label}
        </Badge>
        {errorMessage && (
          <div className="text-xs text-red-600 dark:text-red-400 max-w-[200px]" title={errorMessage}>
            {errorMessage.length > 40 ? `${errorMessage.substring(0, 40)}...` : errorMessage}
          </div>
        )}
      </div>
    );
  };

  const getRecipientTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      student: { 
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-600", 
        icon: <User className="w-3 h-3" />, 
        label: "Student" 
      },
      father: { 
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-slate-800 dark:text-emerald-300 dark:border-slate-600", 
        icon: <Users className="w-3 h-3" />, 
        label: "Father" 
      },
      mother: { 
        color: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-slate-800 dark:text-pink-300 dark:border-slate-600", 
        icon: <Users className="w-3 h-3" />, 
        label: "Mother" 
      },
      teacher: { 
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-slate-800 dark:text-amber-300 dark:border-slate-600", 
        icon: <User className="w-3 h-3" />, 
        label: "Teacher" 
      },
      employee: { 
        color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600", 
        icon: <User className="w-3 h-3" />, 
        label: "Employee" 
      },
    };

    const config = typeConfig[type] || typeConfig.student;

    return (
      <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", config?.color)}>
        {config?.icon}
        {config?.label}
      </Badge>
    );
  };

  const getPhoneStatusIcon = (phone: string) => {
    if (!phone || phone.trim() === '') {
      return <PhoneOff className="w-4 h-4 text-red-500" />;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return <PhoneOff className="w-4 h-4 text-yellow-500" />;
    }
    
    return <Phone className="w-4 h-4 text-green-500" />;
  };

  const columns: ColumnDef<DeliveryLogEntry>[] = [
    {
      accessorKey: "recipientName",
      header: "Recipient Details",
      cell: ({ row }) => (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">{row.original.recipientName}</span>
            {getRecipientTypeBadge(row.original.recipientType)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {getPhoneStatusIcon(row.original.recipientPhone)}
            <span className="font-mono">
              {row.original.recipientPhone || "No phone number"}
            </span>
          </div>
          {row.original.metaMessageId && (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
              Meta ID: {row.original.metaMessageId.slice(0, 12)}...
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Delivery Status",
      cell: ({ row }) => getStatusBadge(row.original.status, row.original.errorMessage),
    },
    {
      accessorKey: "sentAt",
      header: "Sent At",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.sentAt ? format(new Date(row.original.sentAt), "MMM dd, hh:mm a") : "-"}
        </span>
      ),
    },
    {
      accessorKey: "deliveredAt",
      header: "Delivered At",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.deliveredAt ? format(new Date(row.original.deliveredAt), "MMM dd, hh:mm a") : "-"}
        </span>
      ),
    },
    {
      accessorKey: "readAt", 
      header: "Read At",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.original.readAt ? format(new Date(row.original.readAt), "MMM dd, hh:mm a") : "-"}
          </span>
          {row.original.readAt && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3" />
              Read
            </span>
          )}
        </div>
      ),
    },
  ];

  // Get summary statistics from the main message data  
  const stats = messageDetails?.deliveryStats || { delivered: 0, failed: 0, pending: 0, total: 0 };
  const recipients = messageDetails?.recipients || [];
  const totalRecipients = messageDetails?.totalRecipients || stats.total || 0;
  
  // Filter recipients client-side for now
  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = !searchTerm || 
      recipient.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.recipientPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || recipient.status === statusFilter;
    const matchesType = typeFilter === "all" || recipient.recipientType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  // Client-side pagination
  const paginatedRecipients = filteredRecipients.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  if (!hasPermission("view_communication_logs")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view detailed communication logs.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="animate-pulse h-10 w-32 bg-gray-200 rounded"></div>
          <div className="flex-1">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!messageDetails) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Message Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            The requested message could not be found.
          </p>
          <Button asChild className="mt-4">
            <Link href="/communication/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-gray-100">
              Detailed Delivery Log
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">{messageDetails.title}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Send className="h-4 w-4" />
                <span>
                  {format(
                    new Date(messageDetails.createdAt),
                    "MMM dd, yyyy 'at' h:mm a",
                  )}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline" className="text-xs">
                Message Details
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/communication/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchDetails();
              refetchJob();
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Job Progress Bar - Enhanced Design */}
      {messageJob &&
        (messageJob.status === "PROCESSING" ||
          messageJob.status === "QUEUED") && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      {messageJob.status === "PROCESSING"
                        ? "Sending Messages"
                        : "Queued for Processing"}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {messageJob.processedRecipients} of{" "}
                      {messageJob.totalRecipients} processed
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300">
                    <span>Progress</span>
                    <span>{messageJob.progress}%</span>
                  </div>
                  <Progress value={messageJob.progress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Job Error Message */}
      {messageJob?.errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Job Error:</strong> {messageJob.errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Summary Cards */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Recipients</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {totalRecipients.toLocaleString("en-IN")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
                Message Sent
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <Users className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
              All Recipients
            </div>
            <div className="text-muted-foreground">
              Total number of message recipients
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Successfully Delivered</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {(stats.delivered || 0).toLocaleString("en-IN")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
                {totalRecipients > 0 ? `${(((stats.delivered || 0) / totalRecipients) * 100).toFixed(1)}%` : "0%"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <CheckCircle className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
              Delivery Success
            </div>
            <div className="text-muted-foreground">
              Messages delivered successfully
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Messages Read</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {recipients.filter((r) => r.readAt).length.toLocaleString("en-IN")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
                {totalRecipients > 0 ? `${((recipients.filter((r) => r.readAt).length / totalRecipients) * 100).toFixed(1)}%` : "0%"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <Eye className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
              Read Rate
            </div>
            <div className="text-muted-foreground">
              Recipients who opened messages
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Failed Deliveries</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {((stats.failed || 0) + (stats.pending || 0)).toLocaleString("en-IN")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={((stats.failed || 0) + (stats.pending || 0)) > 0 ? "text-[#A65A20]" : "text-[#00501B] dark:text-[#7AAD8B]"}>
                {((stats.failed || 0) + (stats.pending || 0)) > 0 ? (
                  <IconTrendingUp className="text-[#A65A20]" />
                ) : (
                  <IconTrendingDown className="text-[#00501B] dark:text-[#7AAD8B]" />
                )}
                {totalRecipients > 0 ? `${(((stats.failed || 0) + (stats.pending || 0)) / totalRecipients * 100).toFixed(1)}%` : "0%"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <XCircle className="size-4 text-[#A65A20]" /> 
              Delivery Issues
            </div>
            <div className="text-muted-foreground">
              {stats.failed || 0} failed, {stats.pending || 0} pending
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Warning for stuck messages */}
      {recipients.some(
        (r) => r.status === "SENT" && !r.deliveredAt && !r.readAt,
      ) && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Status Update Issue:</strong> Some messages are stuck at
            "SENT" status. This usually indicates webhook configuration issues
            or disabled delivery receipts.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Filters and Data Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Delivery Details
              </CardTitle>
              <CardDescription>
                Individual delivery status for all{" "}
                {totalRecipients.toLocaleString("en-IN")} recipients
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search recipients..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className="w-64 pl-10"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="father">Fathers</SelectItem>
                  <SelectItem value="mother">Mothers</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                </SelectContent>
              </Select>

              {/* Retry Failed Button */}
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    retryFailedMutation.mutate({
                      messageId: messageId || "",
                    });
                  }}
                  disabled={retryFailedMutation.isPending}
                  className="text-orange-600 hover:text-orange-700"
                >
                  {retryFailedMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Retry Failed ({stats.failed})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedRecipients}
            searchPlaceholder="Search recipients..."
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pageCount={Math.ceil(
              filteredRecipients.length / pagination.pageSize,
            )}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </CardContent>
      </Card>
    </div>
  );
} 