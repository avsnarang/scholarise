"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchContext } from "@/hooks/useBranchContext";
import { EnhancedTemplateBuilder } from "@/components/communication/enhanced-template-builder";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function EditTemplatePageContent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { currentBranchId } = useBranchContext();

  const templateId = params?.templateId as string;

  // Get utils for cache invalidation
  const utils = api.useUtils();

  // Fetch template data for editing
  const { data: templateData, isLoading: isLoadingTemplate, error } = api.communication.getTemplateById.useQuery(
    { templateId },
    { enabled: !!templateId }
  );

  // Update template mutation with cache invalidation
  const updateTemplateMutation = api.communication.updateTemplate.useMutation({
    onSuccess: async (data) => {
      // Invalidate template queries to refresh all template lists
      await utils.communication.getTemplates.invalidate();
      await utils.communication.getTemplateById.invalidate({ templateId });
      
      toast({
        title: "Template Updated Successfully",
        description: `Template "${data.name}" has been updated.`,
      });
      router.push("/communication/templates");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (formData: any) => {
    updateTemplateMutation.mutate({
      templateId,
      ...formData,
      metaTemplateName: formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      metaTemplateLanguage: formData.language || 'en',
      // Include all rich media fields
      headerType: formData.headerType,
      headerContent: formData.headerContent,
      headerMediaUrl: formData.headerMediaUrl,
      footerText: formData.footerText,
      buttons: formData.buttons || [],
      interactiveType: formData.interactiveType,
      templateMedia: formData.templateMedia || [],
    });
  };

  const handleCancel = () => {
    router.push("/communication/templates");
  };

  // Permission check
  if (!hasPermission("manage_whatsapp_templates")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to edit WhatsApp templates.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-blue-500 mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading Template
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please wait while we fetch the template data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Template Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The template you're trying to edit could not be found.
          </p>
          <Button asChild>
            <Link href="/communication/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if template can be edited
  if (templateData?.metaTemplateStatus === 'APPROVED') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cannot Edit Approved Template
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This template has been approved by Meta and cannot be edited. Create a new template instead.
          </p>
          <div className="space-x-2">
            <Button asChild variant="outline">
              <Link href="/communication/templates">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Link>
            </Button>
            <Button asChild>
              <Link href="/communication/templates/create">
                Create New Template
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/communication/templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Template</h1>
            <p className="text-muted-foreground">
              Modify your WhatsApp message template
            </p>
          </div>
        </div>
      </div>

      {/* Template Builder */}
      {templateData && (
        <EnhancedTemplateBuilder
          initialData={{
            name: templateData.name,
            description: templateData.description || undefined,
            category: templateData.category as any,
            language: templateData.language,
            templateBody: templateData.templateBody,
            // Include all rich media fields
            headerType: templateData.headerType as any,
            headerContent: templateData.headerContent || undefined,
            headerMediaUrl: templateData.headerMediaUrl || undefined,
            footerText: templateData.footerText || undefined,
            // Convert relational buttons to the format expected by the UI
            buttons: templateData.templateButtons?.map(btn => ({
              id: btn.id,
              type: btn.type as any,
              text: btn.text,
              url: btn.url || undefined,
              phoneNumber: btn.phoneNumber || undefined,
              payload: btn.payload || undefined,
              order: btn.order || 0
            })) || (templateData.buttons as any[]) || undefined,
            interactiveType: templateData.interactiveType as any,
            // Use the relational templateMedia if available, otherwise fall back to JSON field
            templateMedia: templateData.templateMedia?.map(media => ({
              id: media.id,
              type: media.type as any,
              url: media.url,
              filename: media.filename || '',
              mimeType: media.mimeType || '',
              size: media.size || 0,
              supabasePath: media.supabasePath || '',
              bucket: media.supabaseBucket || 'whatsapp-media'
            })) || undefined,
          }}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={updateTemplateMutation.isPending}
          showHeader={false}
        />
      )}
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicEditTemplatePageContent = dynamic(() => Promise.resolve(EditTemplatePageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function EditTemplatePage() {
  return <DynamicEditTemplatePageContent />;
} 