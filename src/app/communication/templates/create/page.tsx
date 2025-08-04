"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchContext } from "@/hooks/useBranchContext";

import { EnhancedTemplateBuilder } from "@/components/communication/enhanced-template-builder";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";

function CreateTemplatePageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { currentBranchId } = useBranchContext();

  // Get utils for cache invalidation
  const utils = api.useUtils();

  // Create template mutation with cache invalidation
  const createTemplateMutation = api.communication.createTemplate.useMutation({
    onSuccess: async (data) => {
      // Invalidate template queries to refresh all template lists
      await utils.communication.getTemplates.invalidate();
      
      // Show success message
      toast({
        title: "🎉 Template Created Successfully!",
        description: `Template "${data.name}" has been created and is ready for submission to Meta for approval.`,
        duration: 5000,
      });
      
      router.push("/communication/templates");
    },
    onError: (error) => {
      toast({
        title: "❌ Failed to Create Template",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleSave = (templateData: any) => {
    createTemplateMutation.mutate({
      ...templateData,
      branchId: currentBranchId || undefined,
      metaTemplateName: templateData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      metaTemplateLanguage: templateData.language || 'en',
      // Include all the new rich media fields
      headerType: templateData.headerType,
      headerContent: templateData.headerContent,
      headerMediaUrl: templateData.headerMediaUrl,
      footerText: templateData.footerText,
      buttons: templateData.buttons || [],
      interactiveType: templateData.interactiveType,
      templateMedia: templateData.templateMedia || [],
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
            You don't have permission to create WhatsApp templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EnhancedTemplateBuilder
      onSave={handleSave}
      onCancel={handleCancel}
      isLoading={createTemplateMutation.isPending}
      showHeader={true}
    />
  );
}
// Dynamically import to disable SSR completely
const DynamicCreateTemplatePageContent = dynamic(() => Promise.resolve(CreateTemplatePageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function CreateTemplatePage() {
  return <DynamicCreateTemplatePageContent />;
} 