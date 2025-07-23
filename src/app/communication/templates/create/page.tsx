"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchContext } from "@/hooks/useBranchContext";

import { TemplateBuilder } from "@/components/communication/template-builder";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { currentBranchId } = useBranchContext();

  // Create template mutation
  const createTemplateMutation = api.communication.createTemplate.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Template Created Successfully",
        description: `Template "${data.name}" has been created and is ready for submission to Meta.`,
      });
      router.push("/communication/templates");
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (templateData: any) => {
    createTemplateMutation.mutate({
      ...templateData,
      branchId: currentBranchId || undefined,
      metaTemplateName: templateData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      metaTemplateLanguage: templateData.language || 'en',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Create Template</h1>
            <p className="text-muted-foreground">
              Create WhatsApp message templates with dynamic variables
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/communication/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      {/* Template Builder */}
      <TemplateBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={createTemplateMutation.isPending}
        showHeader={false}
      />
    </div>
  );
} 