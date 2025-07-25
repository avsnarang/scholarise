"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";

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
  Info,
  Edit,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
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

interface WhatsAppTemplate {
  id: string;
  name: string;
  description?: string | null;
  watiTemplateId: string | null;
  twilioContentSid: string | null;
  metaTemplateName: string;
  metaTemplateLanguage: string;
  metaTemplateStatus: string | null;
  metaTemplateId: string | null;
  metaRejectionReason: string | null;
  metaSubmittedAt: Date | null;
  metaApprovedAt: Date | null;
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
  const router = useRouter();
  const utils = api.useUtils();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

  // Fetch templates (now global - no branch dependency)
  const { data: templates, isLoading, refetch } = api.communication.getTemplates.useQuery({
    category: searchTerm || undefined,
  });

  // Real-time polling for template updates
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [previousTemplates, setPreviousTemplates] = useState<any[]>([]);

  // Smart polling: only when page is visible and has pending templates
  React.useEffect(() => {
    if (!templates) return;

    const hasPendingTemplates = templates.some(t => 
      t.metaTemplateStatus === 'PENDING' || !t.metaTemplateStatus
    );

    if (!hasPendingTemplates) return;

    const pollInterval = setInterval(() => {
      // Only poll if document is visible (tab is active)
      if (document.visibilityState === 'visible') {
        console.log('🔄 Polling for template updates...');
        // Use silent refetch to avoid loading states
        utils.communication.getTemplates.invalidate();
      }
    }, 8000); // Poll every 8 seconds for pending templates (slightly faster)

    return () => clearInterval(pollInterval);
  }, [templates, utils.communication.getTemplates]);

  // Auto-refresh when page becomes visible
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && templates?.some(t => t.metaTemplateStatus === 'PENDING')) {
        console.log('👀 Page became visible, refreshing template status...');
        utils.communication.getTemplates.invalidate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [templates, utils.communication.getTemplates]);

  // Detect status changes and show notifications
  React.useEffect(() => {
    if (!templates || !previousTemplates.length) {
      setPreviousTemplates(templates || []);
      return;
    }

    const statusMessages = {
      APPROVED: { 
        title: "Template Approved! ✅", 
        description: (name: string) => `"${name}" has been approved by Meta`,
        variant: "default" as const
      },
      REJECTED: { 
        title: "Template Rejected ❌", 
        description: (name: string, reason?: string) => `"${name}" was rejected${reason ? `: ${reason}` : ''}`,
        variant: "destructive" as const
      },
      FLAGGED: { 
        title: "Template Flagged ⚠️", 
        description: (name: string) => `"${name}" has been flagged by Meta`,
        variant: "destructive" as const
      },
      PAUSED: { 
        title: "Template Paused ⏸️", 
        description: (name: string) => `"${name}" has been paused`,
        variant: "destructive" as const
      },
      PENDING: { 
        title: "Template Under Review ⏳", 
        description: (name: string) => `"${name}" is being reviewed by Meta`,
        variant: "default" as const
      }
    };

    // Check for status changes
    templates.forEach(currentTemplate => {
      const previousTemplate = previousTemplates.find(p => p.id === currentTemplate.id);
      
      if (previousTemplate && 
          previousTemplate.metaTemplateStatus !== currentTemplate.metaTemplateStatus &&
          currentTemplate.metaTemplateStatus) {
        
        console.log(`🔄 Detected status change: ${currentTemplate.name} -> ${currentTemplate.metaTemplateStatus}`);
        
        const message = statusMessages[currentTemplate.metaTemplateStatus as keyof typeof statusMessages];
        if (message) {
                   toast({
           title: message.title,
           description: message.description(currentTemplate.name, (currentTemplate as any).metaRejectionReason || undefined),
           variant: message.variant
         });
        }
      }
    });

    setPreviousTemplates(templates);
  }, [templates, toast]);

  // Submit template to Meta mutation with optimistic updates
  const submitTemplateToMetaMutation = api.communication.submitTemplateToMeta.useMutation({
    onMutate: async ({ templateId }) => {
      // Cancel outgoing refetches
      await utils.communication.getTemplates.cancel();
      
      // Snapshot the previous value
      const previousTemplates = utils.communication.getTemplates.getData({ category: searchTerm || undefined });
      
      // Optimistically update template status
      utils.communication.getTemplates.setData({ category: searchTerm || undefined }, (old) => {
        if (!old) return old;
        return old.map((template) =>
          template.id === templateId
            ? { ...template, metaTemplateStatus: 'PENDING' }
            : template
        );
      });
      
      return { previousTemplates };
    },
    onSuccess: (data) => {
      toast({
        title: "Template Submitted",
        description: `Template submitted to Meta for approval. Status: ${data.status}`,
      });
      // Silent refresh to get server state
      refetch();
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.communication.getTemplates.setData({ category: searchTerm || undefined }, context.previousTemplates);
      }
      toast({
        title: "Failed to Submit Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync templates mutation with optimistic feedback
  const syncTemplatesMutation = api.communication.syncTemplatesFromWhatsApp.useMutation({
    onMutate: async () => {
      // Show immediate feedback
      toast({
        title: "Syncing Templates...",
        description: "Fetching latest templates from Meta WhatsApp API",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Templates Synced Successfully",
        description: `Synced ${data.syncedCount} global templates from Meta WhatsApp API. All branches can now use these templates.`,
      });
      // Invalidate and refetch to show new data immediately
      utils.communication.getTemplates.invalidate();
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
  const testConnectionMutation = api.communication.testWhatsAppConnection.useMutation({
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
  const debugTwilioMutation = api.communication.debugWhatsAppResponse.useMutation({
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
      FLAGGED: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: <AlertCircle className="w-3 h-3" /> },
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

  // Delete template mutation with optimistic updates
  const deleteTemplateMutation = api.communication.deleteTemplate.useMutation({
    onMutate: async ({ templateId }) => {
      // Cancel outgoing refetches
      await utils.communication.getTemplates.cancel();
      
      // Snapshot the previous value
      const previousTemplates = utils.communication.getTemplates.getData({ category: searchTerm || undefined });
      
      // Optimistically remove template
      utils.communication.getTemplates.setData({ category: searchTerm || undefined }, (old) => {
        if (!old) return old;
        return old.filter((template) => template.id !== templateId);
      });
      
      return { previousTemplates };
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully.",
      });
      // Silent refresh to get server state
      refetch();
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.communication.getTemplates.setData({ category: searchTerm || undefined }, context.previousTemplates);
      }
      toast({
        title: "Failed to Delete Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleEditTemplate = (templateId: string) => {
    router.push(`/communication/templates/edit/${templateId}`);
  };

  const handleDeleteTemplate = (template: WhatsAppTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate({ templateId: templateToDelete.id });
    }
  };

  const handleSubmitToMeta = (templateId: string) => {
    submitTemplateToMetaMutation.mutate({ templateId });
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
      accessorKey: "metaTemplateStatus",
      header: "Meta Approval",
      cell: ({ row }) => {
        const metaStatus = row.original.metaTemplateStatus;
        if (!metaStatus) {
          return (
            <Badge variant="outline" className="text-gray-500">
              Not Submitted
            </Badge>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            {getStatusBadge(metaStatus)}
            {metaStatus === 'REJECTED' && row.original.metaRejectionReason && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {row.original.metaRejectionReason}
              </span>
            )}
          </div>
        );
      },
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
      cell: ({ row }) => {
        const template = row.original;
        const canSubmit = !template.metaTemplateStatus || 
          ['REJECTED', 'FLAGGED', 'PAUSED'].includes(template.metaTemplateStatus);
        const canEdit = template.metaTemplateStatus !== 'APPROVED'; // Can't edit approved templates
        
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplate(template)}
              title="View Template"
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditTemplate(template.id)}
                title="Edit Template"
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            
            {canSubmit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSubmitToMeta(template.id)}
                disabled={submitTemplateToMetaMutation.isPending}
                className="text-green-600 hover:text-green-700"
                title="Submit to Meta for Approval"
              >
                <Zap className="w-4 h-4 mr-1" />
                Submit
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTemplate(template)}
              className="text-red-600 hover:text-red-700"
              title="Delete Template"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
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

          <Button asChild>
            <Link href="/communication/templates/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Link>
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

                      <div className="ml-4 flex items-center gap-2">
                        {/* View Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Already handled by card click
                          }}
                          title="View Template"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4 text-gray-400" />
                        </Button>

                        {/* Edit Button - Only show for non-approved templates */}
                        {template.metaTemplateStatus !== 'APPROVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template.id);
                            }}
                            title="Edit Template"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Submit to Meta Button - Only show for templates that can be submitted */}
                        {(!template.metaTemplateStatus || 
                          ['REJECTED', 'FLAGGED', 'PAUSED'].includes(template.metaTemplateStatus)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitToMeta(template.id);
                            }}
                            disabled={submitTemplateToMetaMutation.isPending}
                            title="Submit to Meta for Approval"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template as WhatsAppTemplate);
                          }}
                          title="Delete Template"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? 
              This action cannot be undone and will permanently remove the template from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 