"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Shield,
  MessageSquare,
  Bell,
  Clock,
  Users,
  Key,
  Globe,
  Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// Validation schemas
const twilioConfigSchema = z.object({
  accountSid: z.string().min(1, "Account SID is required"),
  authToken: z.string().min(1, "Auth Token is required"),
  whatsAppFrom: z.string().min(1, "WhatsApp from number is required"),
  isActive: z.boolean(),
});

const metaConfigSchema = z.object({
  accessToken: z.string().min(1, "Access Token is required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  businessAccountId: z.string().optional(),
  apiVersion: z.string().min(1, "API Version is required"),
  webhookVerifyToken: z.string().min(1, "Webhook Verify Token is required"),
  isActive: z.boolean(),
});

const templateSettingsSchema = z.object({
  autoSyncEnabled: z.boolean(),
  syncInterval: z.coerce.number().min(1, "Sync interval must be at least 1 hour").max(72, "Sync interval cannot exceed 72 hours"),
  defaultCategory: z.string().optional(),
  defaultLanguage: z.string(),
});

const messageSettingsSchema = z.object({
  enableScheduling: z.boolean(),
  maxRecipientsPerMessage: z.coerce.number().min(1, "Must allow at least 1 recipient").max(10000, "Cannot exceed 10,000 recipients"),
  retryFailedMessages: z.boolean(),
  maxRetryAttempts: z.coerce.number().min(1, "Must allow at least 1 retry").max(5, "Cannot exceed 5 retries"),
  retryDelay: z.coerce.number().min(1, "Retry delay must be at least 1 minute").max(1440, "Retry delay cannot exceed 24 hours"),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  notificationEmail: z.string().email("Please enter a valid email").optional(),
  notifyOnFailures: z.boolean(),
  notifyOnSuccess: z.boolean(),
  dailySummary: z.boolean(),
});

type TwilioConfigFormData = z.infer<typeof twilioConfigSchema>;
type MetaConfigFormData = z.infer<typeof metaConfigSchema>;
type TemplateSettingsFormData = z.infer<typeof templateSettingsSchema>;
type MessageSettingsFormData = z.infer<typeof messageSettingsSchema>;
type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

export default function CommunicationSettingsPage() {
  const { currentBranchId } = useBranchContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("meta-config");
  const [testingConnection, setTestingConnection] = useState(false);

  // Load existing settings
  const { data: existingSettings, isLoading: settingsLoading } = api.communication.getSettings.useQuery({
    branchId: currentBranchId || "",
  }, {
    enabled: !!currentBranchId,
  });

  // Save settings mutation
  const saveSettingsMutation = api.communication.saveSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Communication settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms
  const twilioForm = useForm<TwilioConfigFormData>({
    resolver: zodResolver(twilioConfigSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      whatsAppFrom: "whatsapp:+14155238886",
      isActive: true,
    },
  });

  const metaForm = useForm<MetaConfigFormData>({
    resolver: zodResolver(metaConfigSchema),
    defaultValues: {
      accessToken: "",
      phoneNumberId: "",
      businessAccountId: "",
      apiVersion: "v21.0",
      webhookVerifyToken: "",
      isActive: true,
    },
  });

  // Update forms when settings load
  React.useEffect(() => {
    if (existingSettings) {
      const settings = existingSettings as any;
      twilioForm.reset({
        accountSid: settings.twilioAccountSid || "",
        authToken: settings.twilioAuthToken || "",
        whatsAppFrom: settings.twilioWhatsAppFrom || "whatsapp:+14155238886",
        isActive: settings.twilioIsActive ?? true,
      });

      metaForm.reset({
        accessToken: settings.metaAccessToken || "",
        phoneNumberId: settings.metaPhoneNumberId || "",
        businessAccountId: settings.metaBusinessAccountId || "",
        apiVersion: settings.metaApiVersion || "v21.0",
        webhookVerifyToken: settings.metaWebhookVerifyToken || "",
        isActive: settings.metaIsActive ?? false,
      });
    }
  }, [existingSettings, twilioForm, metaForm]);

  const templateForm = useForm<TemplateSettingsFormData>({
    resolver: zodResolver(templateSettingsSchema),
    defaultValues: {
      autoSyncEnabled: existingSettings?.templateAutoSyncEnabled ?? true,
      syncInterval: existingSettings?.templateSyncInterval ?? 24,
      defaultCategory: existingSettings?.templateDefaultCategory || "UTILITY",
      defaultLanguage: existingSettings?.templateDefaultLanguage || "en",
    },
  });

  // Update template form when settings load
  useEffect(() => {
    if (existingSettings) {
      templateForm.reset({
        autoSyncEnabled: existingSettings.templateAutoSyncEnabled,
        syncInterval: existingSettings.templateSyncInterval,
        defaultCategory: existingSettings.templateDefaultCategory || "UTILITY",
        defaultLanguage: existingSettings.templateDefaultLanguage,
      });
    }
  }, [existingSettings, templateForm]);

  const messageForm = useForm<MessageSettingsFormData>({
    resolver: zodResolver(messageSettingsSchema),
    defaultValues: {
      enableScheduling: true,
      maxRecipientsPerMessage: 1000,
      retryFailedMessages: true,
      maxRetryAttempts: 3,
      retryDelay: 30,
    },
  });

  const notificationForm = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: false,
      notificationEmail: "",
      notifyOnFailures: true,
      notifyOnSuccess: false,
      dailySummary: true,
    },
  });

  // Test Twilio connection
  const testConnectionMutation = api.communication.testWhatsAppConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Twilio API.",
        });
      } else {
        let description = data.error || "Failed to connect to Twilio API.";
        
        // Add specific troubleshooting tips
        if (data.isConfigurationIssue) {
          description += "\n\nConfiguration issues detected. Please check the environment variables listed above.";
        }
        
        if (data.issues && data.issues.length > 0) {
          description += `\n\nIssues found: ${data.issues.join(', ')}`;
        }
        
        toast({
          title: "Connection Failed",
          description,
          variant: "destructive",
        });
        
        // Log detailed information for debugging
        console.error('Twilio connection test failed:', {
          error: data.error,
          envCheck: data.envCheck,
          issues: data.issues,
          isConfigurationIssue: data.isConfigurationIssue
        });
      }
      setTestingConnection(false);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message + "\n\nCheck the browser console for more details.",
        variant: "destructive",
      });
      setTestingConnection(false);
    },
  });

  // Debug environment variables
  const debugEnvironmentMutation = api.communication.debugEnvironment.useMutation({
    onSuccess: (data) => {
      console.log('Environment Debug Results:', data);
      toast({
        title: "Environment Variables Debug",
        description: `Access Token: ${data.hasAccessToken ? 'Found' : 'Missing'} | Phone Number ID: ${data.hasPhoneNumberId ? 'Found' : 'Missing'} | Business Account ID: ${data.hasBusinessAccountId ? 'Found' : 'Missing'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh Twilio client
  const refreshClientMutation = api.communication.refreshWhatsAppClient.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Client Refreshed",
          description: data.message || "Twilio client refreshed successfully",
        });
      } else {
        toast({
          title: "Refresh Failed",
          description: data.error || "Failed to refresh Twilio client",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await testConnectionMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const handleDebugEnvironment = async () => {
    try {
      await debugEnvironmentMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const handleRefreshClient = async () => {
    try {
      await refreshClientMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  // Save settings functions
  const handleSaveTwilioConfig = (data: TwilioConfigFormData) => {
    if (!currentBranchId) return;
    
    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      twilioAccountSid: data.accountSid,
      twilioAuthToken: data.authToken,
      twilioWhatsAppFrom: data.whatsAppFrom,
      twilioIsActive: data.isActive,
    });
  };

  const handleSaveMetaConfig = (data: MetaConfigFormData) => {
    if (!currentBranchId) return;
    
    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      metaAccessToken: data.accessToken,
      metaPhoneNumberId: data.phoneNumberId,
      metaBusinessAccountId: data.businessAccountId,
      metaApiVersion: data.apiVersion,
      metaWebhookVerifyToken: data.webhookVerifyToken,
      metaIsActive: data.isActive,
    });
  };

  const handleSaveTemplateSettings = (data: TemplateSettingsFormData) => {
    if (!currentBranchId) return;
    
    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      templateAutoSyncEnabled: data.autoSyncEnabled,
      templateSyncInterval: data.syncInterval,
      templateDefaultCategory: data.defaultCategory,
      templateDefaultLanguage: data.defaultLanguage,
    });
  };

  const handleSaveMessageSettings = (data: MessageSettingsFormData) => {
    if (!currentBranchId) return;
    
    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      messageEnableScheduling: data.enableScheduling,
      messageMaxRecipientsPerMessage: data.maxRecipientsPerMessage,
      messageRetryFailedMessages: data.retryFailedMessages,
      messageMaxRetryAttempts: data.maxRetryAttempts,
      messageRetryDelay: data.retryDelay,
    });
  };

  const handleSaveNotificationSettings = (data: NotificationSettingsFormData) => {
    if (!currentBranchId) return;
    
    saveSettingsMutation.mutate({
      branchId: currentBranchId,
      notificationEmailEnabled: data.emailNotifications,
      notificationEmail: data.notificationEmail,
      notifyOnFailures: data.notifyOnFailures,
      notifyOnSuccess: data.notifyOnSuccess,
      notificationDailySummary: data.dailySummary,
    });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/communication">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Communication Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Configure WhatsApp integration and communication preferences
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="meta-config" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Meta WhatsApp
            </TabsTrigger>
            <TabsTrigger value="twilio-config" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Twilio API
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Meta WhatsApp Configuration */}
          <TabsContent value="meta-config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  Meta WhatsApp Business API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Meta WhatsApp Business API credentials for sending and receiving messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormProvider {...metaForm}>
                  <form onSubmit={metaForm.handleSubmit(handleSaveMetaConfig)} className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant={existingSettings?.metaIsActive ? "default" : "secondary"}>
                        {existingSettings?.metaIsActive ? "Active" : "Inactive"}
                      </Badge>
                      {existingSettings?.metaIsActive && (
                        <Badge variant="outline" className="text-green-600">
                          Ready for incoming messages
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={metaForm.control}
                        name="accessToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Token *</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="EAAxxxxxxxxx..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Your Meta WhatsApp Business API access token
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={metaForm.control}
                        name="phoneNumberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="123456789012345" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your WhatsApp Business phone number ID from Meta
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={metaForm.control}
                        name="businessAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="123456789012345" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Meta Business Account ID (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={metaForm.control}
                        name="apiVersion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Version</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select API version" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="v21.0">v21.0 (Latest)</SelectItem>
                                <SelectItem value="v20.0">v20.0</SelectItem>
                                <SelectItem value="v19.0">v19.0</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Meta WhatsApp API version to use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={metaForm.control}
                      name="webhookVerifyToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook Verify Token *</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="your-secure-webhook-token" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            A secure token for webhook verification. Use the same token in your Meta WhatsApp webhook configuration.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={metaForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Meta WhatsApp Integration</FormLabel>
                            <FormDescription>
                              When enabled, the system will use Meta WhatsApp API for bidirectional messaging
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Webhook Configuration Info */}
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
                    </div>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Twilio API Configuration */}
          <TabsContent value="twilio-config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Twilio API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Twilio WhatsApp Business API credentials and connection settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormProvider {...twilioForm}>
                  <form onSubmit={twilioForm.handleSubmit(handleSaveTwilioConfig)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={twilioForm.control}
                        name="accountSid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account SID *</FormLabel>
                            <FormControl>
                              <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Twilio Account SID from your Twilio Console
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={twilioForm.control}
                        name="whatsAppFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp From Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="whatsapp:+14155238886" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Twilio WhatsApp Business number (with whatsapp: prefix)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={twilioForm.control}
                      name="authToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auth Token *</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Your Twilio Auth Token" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Keep this token secure. It will be encrypted when stored.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={twilioForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Twilio Integration</FormLabel>
                            <FormDescription>
                              When enabled, the system will use Twilio API for sending WhatsApp messages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="flex items-center gap-4">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                      >
                        <Zap className={cn("mr-2 h-4 w-4", testingConnection && "animate-pulse")} />
                        {testingConnection ? "Testing..." : "Test Connection"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleDebugEnvironment}
                        disabled={debugEnvironmentMutation.isPending}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Debug Environment
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRefreshClient}
                        disabled={refreshClientMutation.isPending}
                      >
                        <RefreshCw className={cn("mr-2 h-4 w-4", refreshClientMutation.isPending && "animate-spin")} />
                        {refreshClientMutation.isPending ? "Refreshing..." : "Refresh Client"}
                      </Button>
                    </div>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Settings */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Template Management Settings
                </CardTitle>
                <CardDescription>
                  Configure how WhatsApp templates are managed and synchronized with Twilio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormProvider {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(handleSaveTemplateSettings)} className="space-y-6">
                    <FormField
                      control={templateForm.control}
                      name="autoSyncEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Sync Templates</FormLabel>
                            <FormDescription>
                              Automatically synchronize templates from Twilio at regular intervals
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={templateForm.control}
                        name="syncInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sync Interval (hours)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="72" {...field} />
                            </FormControl>
                            <FormDescription>
                              How often to sync templates from Twilio (1-72 hours)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={templateForm.control}
                        name="defaultLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Language</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select default language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="hi">Hindi</SelectItem>
                                <SelectItem value="bn">Bengali</SelectItem>
                                <SelectItem value="te">Telugu</SelectItem>
                                <SelectItem value="mr">Marathi</SelectItem>
                                <SelectItem value="ta">Tamil</SelectItem>
                                <SelectItem value="gu">Gujarati</SelectItem>
                                <SelectItem value="kn">Kannada</SelectItem>
                                <SelectItem value="ml">Malayalam</SelectItem>
                                <SelectItem value="pa">Punjabi</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Default language for new templates
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={templateForm.control}
                      name="defaultCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select default category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MARKETING">Marketing</SelectItem>
                              <SelectItem value="UTILITY">Utility</SelectItem>
                              <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Default category for new templates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save Template Settings
                    </Button>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Settings */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Message Configuration
                </CardTitle>
                <CardDescription>
                  Configure message sending limits, retry policies, and scheduling options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormProvider {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(handleSaveMessageSettings)} className="space-y-6">
                    <FormField
                      control={messageForm.control}
                      name="enableScheduling"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Message Scheduling</FormLabel>
                            <FormDescription>
                              Allow users to schedule messages for future delivery
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={messageForm.control}
                        name="maxRecipientsPerMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Recipients per Message</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="10000" {...field} />
                            </FormControl>
                            <FormDescription>
                              Maximum number of recipients allowed in a single message (1-10,000)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={messageForm.control}
                        name="maxRetryAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Retry Attempts</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="5" {...field} />
                            </FormControl>
                            <FormDescription>
                              Number of times to retry failed messages (1-5)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={messageForm.control}
                      name="retryFailedMessages"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Retry Failed Messages</FormLabel>
                            <FormDescription>
                              Automatically retry sending messages that fail due to temporary issues
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={messageForm.control}
                      name="retryDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Delay (minutes)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="1440" {...field} />
                          </FormControl>
                          <FormDescription>
                            Delay between retry attempts in minutes (1-1440)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save Message Settings
                    </Button>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure email notifications and alerts for communication activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormProvider {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(handleSaveNotificationSettings)} className="space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email alerts for communication events and reports
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="notificationEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="admin@school.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Email address to receive communication notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="notifyOnFailures"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Notify on Failures</FormLabel>
                              <FormDescription>
                                Send alerts when messages fail to send
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="notifyOnSuccess"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Notify on Success</FormLabel>
                              <FormDescription>
                                Send confirmation when messages are successfully sent
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="dailySummary"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Daily Summary</FormLabel>
                              <FormDescription>
                                Receive daily summary reports of communication activities
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save Notification Settings
                    </Button>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle className="inline w-4 h-4 mr-2" />
                  Data Encryption
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All API tokens and sensitive data are encrypted at rest and in transit.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                  <Globe className="inline w-4 h-4 mr-2" />
                  WhatsApp Compliance
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All messages comply with WhatsApp Business API policies and guidelines.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Important Notes
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• Changes to API configuration require a connection test before activation</li>
                    <li>• Template changes may take up to 24 hours to sync from WhatsApp</li>
                    <li>• Rate limits are enforced by WhatsApp and cannot be overridden</li>
                    <li>• Message scheduling is subject to WhatsApp's delivery windows</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
} 