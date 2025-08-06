"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import dynamic from "next/dynamic";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Trash2,
  Hash,
  Globe,
  FileText,
  Send,
  Users,
  Loader2,
  Filter,
  MoreHorizontal,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  branchId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: {
    name: string;
    code: string;
  } | null;
  _count?: {
    messages: number;
  };
}

// Template Stats Cards Component (following student-stats-cards pattern)
function TemplateStatsCards({ templates }: { templates: WhatsAppTemplate[] | undefined }) {
  if (!templates) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading stats...</span>
      </div>
    );
  }

  const totalTemplates = templates.length;
  const activeTemplates = templates.filter(t => t.status === "APPROVED").length;
  const draftTemplates = templates.filter(t => t.status === "PENDING").length;
  const totalUsage = templates.reduce((sum, template) => sum + ((template as any)._count?.messages || 0), 0);

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Templates</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalTemplates.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
              <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <MessageSquare className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Global Templates
          </div>
          <div className="text-muted-foreground">
            Available across all branches
          </div>
        </CardFooter>
      </Card>
      
             <Card className="@container/card">
         <CardHeader>
           <CardDescription>Active Templates</CardDescription>
           <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
             {activeTemplates.toLocaleString()}
           </CardTitle>
           <CardAction>
             <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
               <CheckCircle className="w-3 h-3 text-[#00501B] dark:text-[#7AAD8B]" />
               Ready
             </Badge>
           </CardAction>
         </CardHeader>
         <CardFooter className="flex-col items-start gap-1.5 text-sm">
           <div className="line-clamp-1 flex gap-2 font-medium">
             <CheckCircle className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
             Ready for Use
           </div>
           <div className="text-muted-foreground">
             {totalTemplates > 0
               ? `${Math.round((activeTemplates / totalTemplates) * 100)}% of total templates`
               : "No templates found"}
           </div>
         </CardFooter>
       </Card>
      
             <Card className="@container/card">
         <CardHeader>
           <CardDescription>Draft Templates</CardDescription>
           <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
             {draftTemplates.toLocaleString()}
           </CardTitle>
           <CardAction>
             <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400">
               <Clock className="w-3 h-3" />
               Draft
             </Badge>
           </CardAction>
         </CardHeader>
         <CardFooter className="flex-col items-start gap-1.5 text-sm">
           <div className="line-clamp-1 flex gap-2 font-medium">
             <Clock className="size-4 text-yellow-600 dark:text-yellow-400" /> 
             Work in Progress
           </div>
           <div className="text-muted-foreground">
             Not yet submitted for approval
           </div>
         </CardFooter>
       </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Messages Sent</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalUsage.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
              <Send className="w-3 h-3" />
              Sent
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Send className="size-4 text-blue-600 dark:text-blue-400" /> 
            Template Usage
          </div>
          <div className="text-muted-foreground">
            Across all messaging campaigns
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function TemplatesPageContent() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

  // Fetch templates with auto-refresh (now global - no branch dependency)
  const { data: templates, isLoading, refetch } = api.communication.getTemplates.useQuery({
    category: searchTerm || undefined,
  }, {
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes (increased due to real-time updates)
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes when page is active (reduced due to real-time updates)
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
  });

  // Real-time subscription for template status updates
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [previousTemplates, setPreviousTemplates] = useState<any[]>([]);

  // Real-time subscription to template status updates via Supabase
  const { session, user } = useAuth();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Test authentication state before setting up subscriptions
  const testAuthenticationState = React.useCallback(async () => {
    if (!session?.user) {
      console.warn('⚠️ User not signed in - skipping template real-time subscription');
      return false;
    }

    try {
      // Use existing session instead of fetching new one
      if (!session) {
        console.error('❌ No current session for real-time subscription');
        setConnectionError('No authenticated session');
        return false;
      }

      console.log('✅ Authentication state verified for real-time subscription');
      setConnectionError(null);
      return true;
    } catch (error) {
      console.error('❌ Authentication verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(`Authentication failed: ${errorMessage}`);
      return false;
    }
  }, [session]);
  
  React.useEffect(() => {
    if (!session?.user) {
      console.warn('⚠️ User not signed in - skipping template real-time subscription');
      return;
    }
    
    const setupSubscription = async () => {
      console.log('🔗 Setting up Supabase real-time subscription for template status updates...');
      
      // Test authentication first
      const hasAuth = await testAuthenticationState();
      if (!hasAuth) {
        console.error('❌ Authentication failed, skipping real-time subscription');
        return;
      }

      // Session is already available from auth context
      
      // Subscribe to WhatsAppTemplate table changes with user-specific channel
      const subscription = supabase
        .channel(`template-updates:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'WhatsAppTemplate',
            // Note: RLS policies will handle access control
          },
          (payload) => {
            console.log('📡 Template status update received:', payload);
            
            const updatedTemplate = payload.new as any;
            const oldTemplate = payload.old as any;
            
            // Check if the status actually changed
            if (oldTemplate?.metaTemplateStatus !== updatedTemplate?.metaTemplateStatus) {
              console.log(`📄 Template "${updatedTemplate.name}" status changed: ${oldTemplate?.metaTemplateStatus} → ${updatedTemplate.metaTemplateStatus}`);
              
              // Show immediate notification based on new status
              if (updatedTemplate.metaTemplateStatus === 'APPROVED') {
                toast({
                  title: "🎉 Template Approved!",
                  description: `Template "${updatedTemplate.name}" has been approved by Meta and is ready to use.`,
                  duration: 8000,
                });
              } else if (updatedTemplate.metaTemplateStatus === 'REJECTED') {
                const rejectionReason = updatedTemplate.metaRejectionReason;
                toast({
                  title: "❌ Template Rejected",
                  description: `Template "${updatedTemplate.name}" was rejected${rejectionReason ? `: ${rejectionReason}` : '.'}`,
                  variant: "destructive",
                  duration: 8000,
                });
              } else if (updatedTemplate.metaTemplateStatus === 'FLAGGED') {
                toast({
                  title: "⚠️ Template Flagged",
                  description: `Template "${updatedTemplate.name}" has been flagged by Meta.`,
                  variant: "destructive",
                  duration: 8000,
                });
              } else if (updatedTemplate.metaTemplateStatus === 'PAUSED') {
                toast({
                  title: "⏸️ Template Paused",
                  description: `Template "${updatedTemplate.name}" has been paused by Meta.`,
                  duration: 8000,
                });
              } else if (updatedTemplate.metaTemplateStatus === 'PENDING') {
                toast({
                  title: "⏳ Template Pending",
                  description: `Template "${updatedTemplate.name}" is now pending review by Meta.`,
                  duration: 5000,
                });
              }
              
              // Instantly refresh the template list
              refetch();
              setLastUpdateTime(new Date());
            }
          }
        )
        .subscribe((status, error) => {
          console.log('📡 Template subscription status:', status);
          
          if (error) {
            console.error('❌ Template subscription error:', error);
            console.error('📋 Subscription error details:', {
              message: error?.message || 'Unknown message',
              type: (error as any)?.type || 'Unknown type',
              details: (error as any)?.details || 'No details'
            });
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Template real-time subscription successful!');
            setConnectionError(null);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const errorMsg = `Template subscription ${status}: ${error?.message || 'Unknown error'}`;
            console.error('❌ Template subscription failed:', status, error);
            setConnectionError(errorMsg);
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Template subscription closed');
            setConnectionError('Real-time subscription closed');
          }
        });

      // Cleanup subscription
      return () => {
        console.log('🔌 Cleaning up template real-time subscription...');
        subscription.unsubscribe();
      };
    };
    
    setupSubscription();
  }, [session?.user?.id, user, refetch, toast]); // Only stable values

  // Fallback polling: only when page is visible and has pending templates (reduced frequency)
  React.useEffect(() => {
    const hasPendingTemplates = templates?.some(t => 
      t.metaTemplateStatus === 'PENDING' || 
      t.metaTemplateStatus === 'IN_APPEAL' ||
      t.status === 'PENDING'
    );

    if (hasPendingTemplates && document.visibilityState === 'visible') {
      const interval = setInterval(() => {
        refetch();
        setLastUpdateTime(new Date());
      }, 120000); // Poll every 2 minutes as fallback (reduced from 30 seconds)

      return () => clearInterval(interval);
    }
  }, [templates, refetch]);

  // Store templates for comparison (keeping for potential future use)
  React.useEffect(() => {
    if (templates) {
      setPreviousTemplates(templates);
    }
  }, [templates]);

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
        title: "Template submitted",
        description: `Template has been submitted to Meta for approval.`,
      });
    },
    onError: (error: any, variables, context) => {
      // Revert optimistic update
      if (context?.previousTemplates) {
        utils.communication.getTemplates.setData({ category: searchTerm || undefined }, context.previousTemplates);
      }
      
      // Parse error for better user experience
      let title = "Template submission failed";
      let description = error.message;
      
      if (error.message.includes('header format error')) {
        title = "Header Format Error";
        description = "The template header contains invalid characters. Please remove any line breaks, emojis, asterisks (*), or formatting from the header and try again.";
      } else if (error.message.includes('body format error')) {
        title = "Body Format Error";  
        description = "The template body contains invalid formatting. Please check for unsupported characters and remove any special formatting.";
      } else if (error.message.includes('variable error')) {
        title = "Template Variable Error";
        description = "There's an issue with your template variables. Please check variable names use only letters, numbers, and underscores.";
      } else if (error.message.includes('content validation failed')) {
        title = "Content Validation Failed";
        description = "Your template content doesn't meet Meta's requirements. Please check for invalid characters, emojis, or formatting.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000, // Show longer for complex errors
      });
    },
  });

  // Sync templates mutation with cache invalidation
  const syncTemplatesMutation = api.communication.syncTemplatesFromWhatsApp.useMutation({
    onSuccess: async (data: any) => {
      // Invalidate template queries to refresh all template lists
      await utils.communication.getTemplates.invalidate();
      
      toast({
        title: "Templates synced",
        description: `Successfully synced ${data.syncedCount || 0} templates from Meta WhatsApp.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation with cache invalidation
  const deleteTemplateMutation = api.communication.deleteTemplate.useMutation({
    onSuccess: async () => {
      // Invalidate template queries to refresh all template lists
      await utils.communication.getTemplates.invalidate();
      
      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSubmitToMeta = (templateId: string) => {
    submitTemplateToMetaMutation.mutate({ templateId });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      APPROVED: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" />, label: "Active" },
      PENDING: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: <Clock className="w-3 h-3" />, label: "Draft" },
      REJECTED: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
      PAUSED: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", icon: <AlertCircle className="w-3 h-3" />, label: "Paused" },
      FLAGGED: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: <AlertCircle className="w-3 h-3" />, label: "Flagged" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1", config?.color || "")}>
        {config?.icon}
        {config?.label}
      </Badge>
    );
  };

  const getMetaStatusBadge = (metaStatus: string | null) => {
    if (!metaStatus) {
      return (
        <Badge variant="outline" className="text-gray-500 text-xs">
          <Hash className="w-3 h-3 mr-1" />
          Not Submitted to Meta
        </Badge>
      );
    }
    
    // Use different styling/labels for Meta status to differentiate from general status
    const metaStatusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      APPROVED: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", icon: <CheckCircle className="w-3 h-3" />, label: "Meta Approved" },
      PENDING: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300", icon: <Clock className="w-3 h-3" />, label: "Meta Review" },
      REJECTED: { color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300", icon: <XCircle className="w-3 h-3" />, label: "Meta Rejected" },
      PAUSED: { color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300", icon: <AlertCircle className="w-3 h-3" />, label: "Meta Paused" },
      FLAGGED: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: <AlertCircle className="w-3 h-3" />, label: "Meta Flagged" },
    };

    const config = metaStatusConfig[metaStatus] || metaStatusConfig.PENDING;

    return (
      <Badge className={cn("flex items-center gap-1 text-xs", config?.color || "")}>
        {config?.icon}
        {config?.label}
      </Badge>
    );
  };

  const handleSyncTemplates = async () => {
    try {
      await syncTemplatesMutation.mutateAsync({
        originBranchId: currentBranchId || undefined,
      });
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  // Filter templates based on search and filters
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.watiTemplateId && template.watiTemplateId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || template.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

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
    <div className="@container/main space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#00501B]/20 to-[#00501B]/10 p-3 rounded-xl">
              <MessageSquare className="h-7 w-7 text-[#00501B] dark:text-[#7AAD8B]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                WhatsApp Templates
              </h1>
              <p className="text-muted-foreground">
                Manage approved WhatsApp message templates - Available to all branches
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/communication" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSyncTemplates}
              disabled={syncTemplatesMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  syncTemplatesMutation.isPending && "animate-spin",
                )}
              />
              {syncTemplatesMutation.isPending
                ? "Syncing..."
                : "Sync Templates"}
            </Button>

            <Button asChild className="bg-gradient-to-r from-[#00501B] to-[#00501B]/80 hover:from-[#00501B]/90 hover:to-[#00501B]/70">
              <Link href="/communication/templates/create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connectionError && (
        <Card className="border-2 border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Real-time updates unavailable: {connectionError}</span>
              <Badge variant="outline" className="ml-auto">Using polling fallback</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <TemplateStatsCards templates={templates} />

      {/* Filters */}
      <Card className="border-2 border-muted">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Filter Templates</CardTitle>
              <CardDescription>Search and filter your templates</CardDescription>
            </div>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10"
                />
              </div>
              
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger className="w-full sm:w-40">
                   <SelectValue placeholder="All Status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="APPROVED">Active</SelectItem>
                   <SelectItem value="PENDING">Draft</SelectItem>
                   <SelectItem value="REJECTED">Rejected</SelectItem>
                   <SelectItem value="PAUSED">Paused</SelectItem>
                 </SelectContent>
               </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates Grid */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-muted">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Templates</CardTitle>
                  <CardDescription>
                    {filteredTemplates.length} of {templates?.length || 0} templates
                  </CardDescription>
                </div>
                
                {filteredTemplates.length > 0 && (
                  <Badge variant="outline" className="text-[#00501B] dark:text-[#7AAD8B]">
                    {filteredTemplates.length} Found
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted rounded-lg p-4 space-y-3">
                        <div className="h-4 w-3/4 bg-muted-foreground/20 rounded"></div>
                        <div className="h-3 w-1/2 bg-muted-foreground/20 rounded"></div>
                        <div className="flex gap-2">
                          <div className="h-5 w-16 bg-muted-foreground/20 rounded"></div>
                          <div className="h-5 w-20 bg-muted-foreground/20 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                      ? "No templates match your filters"
                      : "No templates found"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Get started by creating your first WhatsApp template"}
                  </p>
                  {!searchTerm && statusFilter === "all" && categoryFilter === "all" && (
                    <Button asChild>
                      <Link href="/communication/templates/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Template
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                        selectedTemplate?.id === template.id
                          ? "border-[#00501B] bg-[#00501B]/5 shadow-md"
                          : "border-muted hover:border-[#00501B]/50"
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg truncate">{template.name}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getStatusBadge(template.status)}
                                {getMetaStatusBadge(template.metaTemplateStatus)}
                              </div>
                            </div>

                            {template.description && (
                              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {template.templateVariables.length} variables
                              </div>
                              <div className="flex items-center gap-1">
                                <Send className="w-3 h-3" />
                                {(template as any)._count?.messages || 0} sent
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(template.updatedAt))} ago
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {template.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs uppercase">
                                {template.language}
                              </Badge>
                            </div>
                          </div>

                          <div className="ml-4 flex items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                
                                {template.metaTemplateStatus !== 'APPROVED' && (
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template.id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Template
                                  </DropdownMenuItem>
                                )}
                                
                                {(!template.metaTemplateStatus || 
                                  ['REJECTED', 'FLAGGED', 'PAUSED'].includes(template.metaTemplateStatus)) && (
                                  <DropdownMenuItem onClick={() => handleSubmitToMeta(template.id)}>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Submit to Meta
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteTemplate(template)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Preview */}
        <div>
          <Card className="border-2 border-muted sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Template Preview</CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? "Details of selected template"
                  : "Select a template to preview"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedTemplate ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 font-semibold text-xl">
                      {selectedTemplate.name}
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getStatusBadge(selectedTemplate.status)}
                      {getMetaStatusBadge(selectedTemplate.metaTemplateStatus)}
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedTemplate.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase">
                        {selectedTemplate.language}
                      </Badge>
                    </div>
                  </div>

                  {selectedTemplate.description && (
                    <div>
                      <h5 className="mb-2 text-sm font-medium text-muted-foreground">Description</h5>
                      <p className="text-sm">{selectedTemplate.description}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Template Structure Preview */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-muted-foreground">Template Structure</h5>
                    
                                         {/* Header Section */}
                     {(selectedTemplate as any).headerType && (
                       <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                         <div className="flex items-center gap-2 mb-2">
                           <Badge variant="secondary" className="text-xs">Header</Badge>
                           <Badge variant="outline" className="text-xs capitalize">{(selectedTemplate as any).headerType}</Badge>
                         </div>
                         {(selectedTemplate as any).headerType === 'TEXT' && (selectedTemplate as any).headerContent && (
                           <p className="text-sm font-medium">{(selectedTemplate as any).headerContent}</p>
                         )}
                         {['IMAGE', 'VIDEO', 'DOCUMENT'].includes((selectedTemplate as any).headerType || '') && (selectedTemplate as any).headerMediaUrl && (
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span>Media URL:</span>
                             <span className="font-mono truncate">{(selectedTemplate as any).headerMediaUrl}</span>
                           </div>
                         )}
                       </div>
                     )}

                    {/* Body Section */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">Body</Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap font-mono">
                        {selectedTemplate.templateBody}
                      </p>
                    </div>

                                         {/* Footer Section */}
                     {(selectedTemplate as any).footerText && (
                       <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-950/20">
                         <div className="flex items-center gap-2 mb-2">
                           <Badge variant="secondary" className="text-xs">Footer</Badge>
                         </div>
                         <p className="text-sm text-muted-foreground">{(selectedTemplate as any).footerText}</p>
                       </div>
                     )}

                                         {/* Buttons Section */}
                     {((selectedTemplate as any).templateButtons?.length > 0 || (selectedTemplate as any).buttons) && (
                       <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                         <div className="flex items-center gap-2 mb-2">
                           <Badge variant="secondary" className="text-xs">Buttons</Badge>
                         </div>
                         <div className="space-y-2">
                           {(selectedTemplate as any).templateButtons?.map((button: any, index: number) => (
                             <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                               <Badge variant="outline" className="text-xs">{button.type}</Badge>
                               <span className="font-medium">{button.text}</span>
                               {button.url && <span className="text-muted-foreground truncate">→ {button.url}</span>}
                               {button.phoneNumber && <span className="text-muted-foreground">📞 {button.phoneNumber}</span>}
                             </div>
                           )) || (
                             (selectedTemplate as any).buttons && typeof (selectedTemplate as any).buttons === 'object' && 
                             Object.keys((selectedTemplate as any).buttons).length > 0 && (
                               <div className="text-xs text-muted-foreground">
                                 {Object.keys((selectedTemplate as any).buttons).length} button(s) configured
                               </div>
                             )
                           )}
                         </div>
                       </div>
                     )}

                     {/* Media Attachments Section */}
                     {((selectedTemplate as any).templateMedia?.length > 0 || (selectedTemplate as any).mediaAttachments) && (
                       <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-950/20">
                         <div className="flex items-center gap-2 mb-2">
                           <Badge variant="secondary" className="text-xs">Media Attachments</Badge>
                         </div>
                         <div className="space-y-2">
                           {(selectedTemplate as any).templateMedia?.map((media: any, index: number) => (
                             <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                               <Badge variant="outline" className="text-xs">{media.type}</Badge>
                               <span className="font-medium truncate">{media.filename || 'Media file'}</span>
                               {media.mimeType && <span className="text-muted-foreground">({media.mimeType})</span>}
                             </div>
                           )) || (
                             (selectedTemplate as any).mediaAttachments && typeof (selectedTemplate as any).mediaAttachments === 'object' && 
                             Object.keys((selectedTemplate as any).mediaAttachments).length > 0 && (
                               <div className="text-xs text-muted-foreground">
                                 {Object.keys((selectedTemplate as any).mediaAttachments).length} media attachment(s)
                               </div>
                             )
                           )}
                         </div>
                       </div>
                     )}

                     {/* Interactive Components Section */}
                     {(selectedTemplate as any).interactiveType && (
                       <div className="rounded-lg border p-4 bg-orange-50 dark:bg-orange-950/20">
                         <div className="flex items-center gap-2 mb-2">
                           <Badge variant="secondary" className="text-xs">Interactive</Badge>
                           <Badge variant="outline" className="text-xs capitalize">{(selectedTemplate as any).interactiveType}</Badge>
                         </div>
                         {(selectedTemplate as any).interactiveContent && (
                           <div className="text-xs text-muted-foreground">
                             Interactive content configured
                           </div>
                         )}
                       </div>
                     )}
                  </div>

                  {/* WhatsApp Message Mockup */}
                  <div>
                    <h5 className="mb-3 text-sm font-medium text-muted-foreground">WhatsApp Preview</h5>
                    <div className="bg-[#e5ddd5] dark:bg-gray-800 p-4 rounded-lg">
                                             <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm max-w-xs ml-auto p-3 space-y-2">
                         {/* Header */}
                         {(selectedTemplate as any).headerType && (
                           <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                             {(selectedTemplate as any).headerType === 'TEXT' && (selectedTemplate as any).headerContent && (
                               <p className="font-semibold text-sm">{(selectedTemplate as any).headerContent}</p>
                             )}
                             {['IMAGE', 'VIDEO', 'DOCUMENT'].includes((selectedTemplate as any).headerType || '') && (
                               <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs text-center text-muted-foreground">
                                 📎 {(selectedTemplate as any).headerType} Media
                               </div>
                             )}
                           </div>
                         )}

                         {/* Body */}
                         <div className="text-sm">
                           {selectedTemplate.templateBody.split(/(\{\{[^}]+\}\})/).map((part, index) => 
                             (/\{\{[^}]+\}\}/.exec(part)) ? (
                               <span key={index} className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                                 {part}
                               </span>
                             ) : (
                               <span key={index}>{part}</span>
                             )
                           )}
                         </div>

                         {/* Footer */}
                         {(selectedTemplate as any).footerText && (
                           <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                             <p className="text-xs text-muted-foreground">{(selectedTemplate as any).footerText}</p>
                           </div>
                         )}

                         {/* Buttons */}
                         {(selectedTemplate as any).templateButtons?.length > 0 && (
                           <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                             {(selectedTemplate as any).templateButtons.map((button: any, index: number) => (
                               <div key={index} className="border border-blue-300 rounded text-center py-1 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer">
                                 {button.type === 'CALL_TO_ACTION' && '📞 '}
                                 {button.type === 'URL' && '🔗 '}
                                 {button.type === 'QUICK_REPLY' && '💬 '}
                                 {button.text}
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Timestamp */}
                         <div className="flex justify-end items-center gap-1 text-xs text-muted-foreground">
                           <span>12:34</span>
                           <span>✓✓</span>
                         </div>
                       </div>
                    </div>
                  </div>

                  {selectedTemplate.templateVariables.length > 0 && (
                    <div>
                      <h5 className="mb-3 text-sm font-medium text-muted-foreground">
                        Variables ({selectedTemplate.templateVariables.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.templateVariables.map((variable, index) => (
                          <Badge key={index} variant="secondary" className="text-xs font-mono">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h5 className="mb-3 text-sm font-medium text-muted-foreground">Usage Stats</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Messages sent:</span>
                        <span className="font-medium">{(selectedTemplate as any)._count?.messages || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span className="font-medium">{format(new Date(selectedTemplate.createdAt), "PP")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last updated:</span>
                        <span className="font-medium">{format(new Date(selectedTemplate.updatedAt), "PP")}</span>
                      </div>
                      {selectedTemplate.metaApprovedAt && (
                        <div className="flex justify-between">
                          <span>Approved:</span>
                          <span className="font-medium text-green-600">{format(new Date(selectedTemplate.metaApprovedAt), "PP")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTemplate.metaRejectionReason && (
                    <div>
                      <h5 className="mb-2 text-sm font-medium text-red-600">Rejection Reason</h5>
                      <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                        {selectedTemplate.metaRejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {selectedTemplate.metaTemplateStatus !== 'APPROVED' && (
                      <Button
                        variant="outline"
                        onClick={() => handleEditTemplate(selectedTemplate.id)}
                        className="w-full"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Template
                      </Button>
                    )}
                    
                    {(!selectedTemplate.metaTemplateStatus || 
                      ['REJECTED', 'FLAGGED', 'PAUSED'].includes(selectedTemplate.metaTemplateStatus)) && (
                      <Button
                        onClick={() => handleSubmitToMeta(selectedTemplate.id)}
                        disabled={submitTemplateToMetaMutation.isPending}
                        className="w-full bg-gradient-to-r from-[#00501B] to-[#00501B]/80"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Submit to Meta
                      </Button>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Select a template from the list to view its details and preview
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

// Dynamically import to disable SSR completely
const DynamicTemplatesPageContent = dynamic(() => Promise.resolve(TemplatesPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading templates...</div>
});

export default function TemplatesPage() {
  return <DynamicTemplatesPageContent />;
} 