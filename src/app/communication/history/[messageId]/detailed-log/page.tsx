"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
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
  Filter
} from "lucide-react";
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
  errorMessage?: string | null;
  twilioMessageId?: string | null;
}

export default function DetailedLogPage() {
  const params = useParams();
  const messageId = params?.messageId as string;
  const { hasPermission } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Fetch message details with recipients
  const { data: messageDetails, isLoading } = api.communication.getMessageDetails.useQuery({
    messageId: messageId || "",
  }, {
    enabled: !!messageId,
  });

  // Export CSV functionality
  const exportCsvMutation = api.communication.exportDeliveryLog.useQuery({
    messageId: messageId || "",
  }, {
    enabled: false, // Only run when manually triggered
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
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
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
        label: errorMessage ? "Failed" : "Failed" 
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
          <span className="text-xs text-red-600 dark:text-red-400" title={errorMessage}>
            {errorMessage.length > 30 ? `${errorMessage.substring(0, 30)}...` : errorMessage}
          </span>
        )}
      </div>
    );
  };

  const getRecipientTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      student: { 
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", 
        icon: <User className="w-3 h-3" />, 
        label: "Student" 
      },
      father: { 
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", 
        icon: <Users className="w-3 h-3" />, 
        label: "Father" 
      },
      mother: { 
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", 
        icon: <Users className="w-3 h-3" />, 
        label: "Mother" 
      },
      teacher: { 
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", 
        icon: <User className="w-3 h-3" />, 
        label: "Teacher" 
      },
      employee: { 
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", 
        icon: <User className="w-3 h-3" />, 
        label: "Employee" 
      },
    };

    const config = typeConfig[type] || typeConfig.student;

    return (
      <Badge className={cn("flex items-center gap-1", config?.color)}>
        {config?.icon}
        {config?.label}
      </Badge>
    );
  };

  const getPhoneStatusIcon = (phone: string) => {
    if (!phone || phone.trim() === '') {
      return <PhoneOff className="w-4 h-4 text-red-500" />;
    }
    
    // Basic phone validation
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.recipientName}</span>
            {getRecipientTypeBadge(row.original.recipientType)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {getPhoneStatusIcon(row.original.recipientPhone)}
            <span className="font-mono">
              {row.original.recipientPhone || "No phone number"}
            </span>
          </div>
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
      header: "Sent Time",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.sentAt 
            ? format(new Date(row.original.sentAt), "MMM dd, yyyy 'at' h:mm a")
            : "Not sent"
          }
        </div>
      ),
    },
    {
      accessorKey: "deliveredAt",
      header: "Delivered Time",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.deliveredAt 
            ? format(new Date(row.original.deliveredAt), "MMM dd, yyyy 'at' h:mm a")
            : row.original.status === "DELIVERED" ? "Unknown" : "-"
          }
        </div>
      ),
    },
    {
      accessorKey: "twilioMessageId",
      header: "Message ID",
      cell: ({ row }) => (
        <div className="text-xs font-mono">
          {row.original.twilioMessageId || "-"}
        </div>
      ),
    },
  ];

  // Filter the recipients based on search and filter criteria
  const filteredRecipients = messageDetails?.recipients.filter(recipient => {
    const matchesSearch = !searchTerm || 
      recipient.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.recipientPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || recipient.status === statusFilter;
    const matchesType = typeFilter === "all" || recipient.recipientType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  // Get summary statistics
  const stats = messageDetails?.recipients.reduce((acc: Record<string, number>, recipient) => {
    acc.total = (acc.total || 0) + 1;
    acc[recipient.status.toLowerCase()] = (acc[recipient.status.toLowerCase()] || 0) + 1;
    
    if (!recipient.recipientPhone || recipient.recipientPhone.trim() === '') {
      acc.noPhone = (acc.noPhone || 0) + 1;
    } else {
      const cleanPhone = recipient.recipientPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        acc.invalidPhone = (acc.invalidPhone || 0) + 1;
      }
    }
    
    acc[recipient.recipientType] = (acc[recipient.recipientType] || 0) + 1;
    
    return acc;
  }, {}) || {};

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
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/communication/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Detailed Delivery Log
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {messageDetails.title} - Comprehensive delivery status for all recipients
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successfully Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phone Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(stats.noPhone || 0) + (stats.invalidPhone || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              No phone: {stats.noPhone || 0}, Invalid: {stats.invalidPhone || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery Details</CardTitle>
              <CardDescription>
                Complete log of all delivery attempts and their status
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search recipients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredRecipients || []}
            searchPlaceholder="Search recipients..."
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </CardContent>
      </Card>
    </div>
  );
} 