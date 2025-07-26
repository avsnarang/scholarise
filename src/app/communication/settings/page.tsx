"use client";

import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  Phone,
  Save,
  Database,
  Zap,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
  Copy,
  CopyCheck,
  MessageSquare,
  RefreshCw,
  TestTube
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Validation schemas
const metaConfigSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  businessAccountId: z.string().min(1, "Business Account ID is required"),
  webhookVerifyToken: z.string().min(1, "Webhook Verify Token is required"),
  isActive: z.boolean(),
});

type MetaConfigFormData = z.infer<typeof metaConfigSchema>;

export default function CommunicationSettingsPage() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("meta-config");
  const [copiedToken, setCopiedToken] = useState(false);

  // Fetch communication settings
  const { data: existingSettings, isLoading: isLoadingSettings } = api.communication.getSettings.useQuery({
    branchId: currentBranchId!,
  }, {
    enabled: !!currentBranchId,
  });

  const saveSettingsMutation = api.communication.saveSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Communication settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms
  const metaForm = useForm<MetaConfigFormData>({
    resolver: zodResolver(metaConfigSchema),
    defaultValues: {
      phoneNumberId: "",
      accessToken: "",
      businessAccountId: "",
      webhookVerifyToken: "",
      isActive: false,
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (existingSettings) {
      metaForm.reset({
        phoneNumberId: existingSettings.metaPhoneNumberId || "",
        accessToken: existingSettings.metaAccessToken || "",
        businessAccountId: existingSettings.metaBusinessAccountId || "",
        webhookVerifyToken: existingSettings.metaWebhookVerifyToken || "",
        isActive: existingSettings.metaIsActive ?? false,
      });
    }
  }, [existingSettings, metaForm]);

  // Test Meta connection manually
  const handleTestMetaConnection = async () => {
    const values = metaForm.getValues();
    
    try {
      // Test the connection manually
      const response = await fetch('/api/webhooks/meta-whatsapp/debug?action=config');
      const data = await response.json();
      
      if (data.webhookConfigured) {
        toast({
          title: "Connection successful",
          description: "Meta WhatsApp API configuration is working.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Meta WhatsApp API configuration has issues.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to test Meta WhatsApp connection.",
        variant: "destructive",
      });
    }
  };

  const handleSaveMetaConfig = (data: MetaConfigFormData) => {
    if (!currentBranchId) return;

    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      metaPhoneNumberId: data.phoneNumberId,
      metaAccessToken: data.accessToken,
      metaBusinessAccountId: data.businessAccountId,
      metaWebhookVerifyToken: data.webhookVerifyToken,
      metaIsActive: data.isActive,
    });
  };

  const handleCopyToken = () => {
    const token = metaForm.getValues("webhookVerifyToken");
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  if (!hasPermission("manage_communication_settings")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to manage communication settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Communication Settings</h1>
            <p className="text-muted-foreground">Configure WhatsApp messaging and template settings for your branch</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meta-config" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Meta WhatsApp API
          </TabsTrigger>
          <TabsTrigger value="template-config" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Template Management
          </TabsTrigger>
        </TabsList>

        {/* Meta WhatsApp Configuration */}
        <TabsContent value="meta-config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Meta WhatsApp Business API Configuration
              </CardTitle>
              <CardDescription>
                Configure your Meta WhatsApp Business API credentials and connection settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormProvider {...metaForm}>
                <form onSubmit={metaForm.handleSubmit(handleSaveMetaConfig)} className="space-y-6">
                  <FormField
                    control={metaForm.control}
                    name="phoneNumberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 110123456789012"
                            type="text"
                          />
                        </FormControl>
                        <FormDescription>
                          Your WhatsApp Business phone number ID from Meta Business Manager
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={metaForm.control}
                    name="businessAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Account ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., 123456789012345"
                            type="text"
                          />
                        </FormControl>
                        <FormDescription>
                          Your WhatsApp Business Account ID for template management
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={metaForm.control}
                    name="accessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Token</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Your Meta Access Token"
                            type="password"
                          />
                        </FormControl>
                        <FormDescription>
                          Your Meta Graph API access token with WhatsApp permissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={metaForm.control}
                    name="webhookVerifyToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Verify Token</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., my_secure_verify_token_123"
                              type="text"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCopyToken}
                          >
                            {copiedToken ? (
                              <CopyCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormDescription>
                          A secure token to verify webhook requests from Meta. You'll need this when configuring webhooks in Meta Business Manager.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={metaForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Meta WhatsApp Integration</FormLabel>
                          <FormDescription>
                            When enabled, the system will use Meta WhatsApp API for sending messages
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      📡 Webhook Configuration Required
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      To receive incoming messages, configure these settings in your Meta WhatsApp Business dashboard:
                    </p>
                    <div className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                      <div>Webhook URL: <span className="text-blue-800 dark:text-blue-200">{process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/meta-whatsapp</span></div>
                      <div>Verify Token: <span className="text-blue-800 dark:text-blue-200">(use the same token entered above)</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button type="submit" disabled={saveSettingsMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {saveSettingsMutation.isPending ? "Saving..." : "Save Meta Configuration"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Test webhook functionality
                        window.open('/api/webhooks/meta-whatsapp/debug?action=config', '_blank');
                      }}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Test Configuration
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestMetaConnection}
                      disabled={false} // Removed testMetaConnectionMutation.isPending
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Connection
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Configuration */}
        <TabsContent value="template-config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Template Management Settings
              </CardTitle>
              <CardDescription>
                Configure how WhatsApp templates are managed and synchronized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-sync Templates</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically synchronize templates from Meta at regular intervals
                    </p>
                  </div>
                  <Switch
                    checked={false}
                    onCheckedChange={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Auto-sync feature will be available soon.",
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <Select defaultValue="24">
                    <SelectTrigger>
                      <SelectValue placeholder="Select sync frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every hour</SelectItem>
                      <SelectItem value="6">Every 6 hours</SelectItem>
                      <SelectItem value="12">Every 12 hours</SelectItem>
                      <SelectItem value="24">Every 24 hours</SelectItem>
                      <SelectItem value="48">Every 2 days</SelectItem>
                      <SelectItem value="72">Every 3 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to sync templates from Meta (1-72 hours)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Template Categories</h4>
                  <div className="space-y-2">
                    {[
                      { id: "marketing", label: "Marketing Templates", enabled: true },
                      { id: "utility", label: "Utility Templates", enabled: true },
                      { id: "authentication", label: "Authentication Templates", enabled: false },
                    ].map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-2 rounded border">
                        <Label htmlFor={category.id} className="text-sm cursor-pointer">
                          {category.label}
                        </Label>
                        <Switch
                          id={category.id}
                          checked={category.enabled}
                          onCheckedChange={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Template category filtering will be available soon.",
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose which template categories to sync and use
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!hasPermission("manage_communication_settings") && (
        <div className="flex items-center gap-2 p-4 mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You don't have permission to manage communication settings. Contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
} 