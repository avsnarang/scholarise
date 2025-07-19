"use client";

import React, { useState } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { 
  MessageSquare, 
  RefreshCw, 
  Search,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Settings,
  Plus,
  Zap,
  Building,
  Info
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";

interface WhatsAppTemplate {
  id: string;
  name: string;
  description?: string | null;
  watiTemplateId: string | null;
  twilioContentSid: string | null;
  templateBody: string;
  templateVariables: string[];
  category: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  isActive: boolean;
  branchId: string | null; // Now optional - templates are global
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null; // Optional - may not have an origin branch
  _count?: {
    messages: number;
  };
}

export default function TemplatesPage() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  // Fetch templates (now global - no branch dependency)
  const { data: templates, isLoading, refetch } = api.communication.getTemplates.useQuery({
    category: searchTerm || undefined,
  });

  // Sync templates mutation (now global)
  const syncTemplatesMutation = api.communication.syncTemplatesFromTwilio.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Templates Synced Successfully",
        description: `Synced ${data.syncedCount} global templates from Twilio. All branches can now use these templates.`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to Sync Templates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = api.communication.testTwilioConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Twilio API.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Twilio API.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Debug Twilio response mutation
  const debugTwilioMutation = api.communication.debugTwilioResponse.useMutation({
    onSuccess: (data) => {
      console.log('Debug Twilio Response:', data);
      if (data.success) {
        toast({
          title: "Debug Complete",
          description: "Check browser console for detailed Twilio API response.",
        });
      } else {
        toast({
          title: "Debug Failed",
          description: data.error || "Failed to debug Twilio API.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      APPROVED: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
      PENDING: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: <Clock className="w-3 h-3" /> },
      REJECTED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="w-3 h-3" /> },
      PAUSED: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: <AlertCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1", config?.color || "")}>
        {config?.icon}
        {status}
      </Badge>
    );
  };

  const handleSyncTemplates = async () => {
    try {
      await syncTemplatesMutation.mutateAsync({
        originBranchId: currentBranchId || undefined, // Optional tracking of which branch initiated sync
      });
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnectionMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const handleDebugTwilio = async () => {
    try {
      await debugTwilioMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const columns: ColumnDef<WhatsAppTemplate>[] = [
    {
      accessorKey: "name",
      header: "Template Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "language",
      header: "Language",
      cell: ({ row }) => (
        <span className="uppercase text-sm">{row.original.language}</span>
      ),
    },
    {
      accessorKey: "templateVariables",
      header: "Variables",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.templateVariables.length} variable{row.original.templateVariables.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      accessorKey: "_count.messages",
      header: "Usage",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original._count?.messages || 0} message{(row.original._count?.messages || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(row.original.updatedAt))} ago
        </span>
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
            onClick={() => setSelectedTemplate(row.original)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.twilioContentSid && template.twilioContentSid.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (template.watiTemplateId && template.watiTemplateId.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (!hasPermission("manage_whatsapp_templates")) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Access Denied
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to manage WhatsApp templates.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            WhatsApp Templates
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage approved WhatsApp message templates from Twilio - Available to
            all branches
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/communication">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            {testConnectionMutation.isPending
              ? "Testing..."
              : "Test Connection"}
          </Button>

          <Button
            onClick={handleSyncTemplates}
            disabled={syncTemplatesMutation.isPending}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                syncTemplatesMutation.isPending && "animate-spin",
              )}
            />
            {syncTemplatesMutation.isPending
              ? "Syncing..."
              : "Sync Global Templates"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Templates
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {templates?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {templates?.filter((t) => t.status === "APPROVED").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {templates?.filter((t) => t.status === "PENDING").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Usage
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {templates?.reduce(
                (sum, template) => sum + ((template as any)._count?.messages || 0),
                0,
              ) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Templates</CardTitle>
                  <CardDescription>
                    WhatsApp templates synced from Twilio
                  </CardDescription>
                </div>

                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 pl-10"
                  />
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
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {searchTerm
                      ? "No matching templates"
                      : "No templates found"}
                  </h3>
                  <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? "Try adjusting your search criteria"
                      : "Sync templates from Twilio to get started"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleSyncTemplates}
                      disabled={syncTemplatesMutation.isPending}
                    >
                      <RefreshCw
                        className={cn(
                          "mr-2 h-4 w-4",
                          syncTemplatesMutation.isPending && "animate-spin",
                        )}
                      />
                      Sync Templates
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "flex cursor-pointer items-start justify-between rounded-lg border p-4 transition-colors",
                        selectedTemplate?.id === template.id
                          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800",
                      )}
                      onClick={() => setSelectedTemplate(template as WhatsAppTemplate)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {template.name}
                          </h4>
                          {getStatusBadge(template.status)}
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {template.category}
                          </Badge>
                        </div>

                        {template.description && (
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            {template.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {template.templateVariables.length} variables
                          </span>
                          <span>{(template as any)._count?.messages || 0} messages sent</span>
                          <span>
                            Updated{" "}
                            {formatDistanceToNow(new Date(template.updatedAt))}{" "}
                            ago
                          </span>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? "Preview of selected template"
                  : "Select a template to preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                      {selectedTemplate.name}
                    </h4>
                    <div className="mb-3 flex items-center gap-2">
                      {getStatusBadge(selectedTemplate.status)}
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedTemplate.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase">
                        {selectedTemplate.language}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h5 className="mb-2 text-sm font-medium">Template Body</h5>
                    <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedTemplate.templateBody}
                      </p>
                    </div>
                  </div>

                  {selectedTemplate.templateVariables.length > 0 && (
                    <div>
                      <h5 className="mb-2 text-sm font-medium">Variables</h5>
                      <div className="space-y-2">
                        {selectedTemplate.templateVariables.map(
                          (variable, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <Badge variant="secondary" className="text-xs">
                                {variable}
                              </Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Messages sent:</span>
                      <span>{selectedTemplate._count?.messages || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Twilio Content SID:</span>
                      <span className="font-mono text-xs">
                        {selectedTemplate.twilioContentSid || selectedTemplate.watiTemplateId || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a template from the list to view its details and
                    preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 