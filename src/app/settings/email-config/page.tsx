"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Mail,
  Settings,
  TestTube,
  Shield,
  Bell,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  X
} from "lucide-react";

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "From name is required"),
  adminEmails: z.array(z.string().email()),
  notifyOnTaskCompletion: z.boolean(),
  notifyOnTaskFailure: z.boolean(),
  includeTaskDetails: z.boolean(),
  includeErrorLogs: z.boolean(),
  branchId: z.string().optional(),
  isGlobal: z.boolean(),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

export default function EmailConfigurationPage() {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newEmailInput, setNewEmailInput] = useState("");

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpSecure: false,
      fromEmail: "",
      fromName: "Scholarise System",
      adminEmails: [],
      notifyOnTaskCompletion: true,
      notifyOnTaskFailure: true,
      includeTaskDetails: true,
      includeErrorLogs: false,
      isGlobal: true,
    },
  });

  const { data: emailConfig, isLoading } = api.backgroundTasks.getEmailConfig.useQuery();
  
  const saveConfigMutation = api.backgroundTasks.saveEmailConfig.useMutation({
    onSuccess: () => {
      toast({
        title: "Email configuration saved",
        description: "Your email settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = api.backgroundTasks.testEmailConnection.useMutation({
    onSuccess: (result) => {
      setTestResult({
        success: result.success,
        message: result.success 
          ? "Connection successful! SMTP settings are working correctly."
          : "Connection failed. Please check your SMTP settings."
      });
      setIsTestingConnection(false);
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: `Connection test failed: ${error.message}`
      });
      setIsTestingConnection(false);
    },
  });

  // Load existing configuration
  useEffect(() => {
    if (emailConfig) {
      form.reset({
        smtpHost: emailConfig.smtpHost || "",
        smtpPort: emailConfig.smtpPort || 587,
        smtpUsername: emailConfig.smtpUsername || "",
        smtpPassword: emailConfig.smtpPassword || "",
        smtpSecure: emailConfig.smtpSecure || false,
        fromEmail: emailConfig.fromEmail || "",
        fromName: emailConfig.fromName || "Scholarise System",
        adminEmails: emailConfig.adminEmails || [],
        notifyOnTaskCompletion: emailConfig.notifyOnTaskCompletion ?? true,
        notifyOnTaskFailure: emailConfig.notifyOnTaskFailure ?? true,
        includeTaskDetails: emailConfig.includeTaskDetails ?? true,
        includeErrorLogs: emailConfig.includeErrorLogs ?? false,
        branchId: emailConfig.branchId || undefined,
        isGlobal: emailConfig.isGlobal ?? true,
      });
    }
  }, [emailConfig, form]);

  const onSubmit = (data: EmailConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTestResult(null);
    testConnectionMutation.mutate();
  };

  const addAdminEmail = () => {
    if (newEmailInput.trim() && z.string().email().safeParse(newEmailInput).success) {
      const currentEmails = form.getValues("adminEmails");
      if (!currentEmails.includes(newEmailInput.trim())) {
        form.setValue("adminEmails", [...currentEmails, newEmailInput.trim()]);
        setNewEmailInput("");
      }
    }
  };

  const removeAdminEmail = (emailToRemove: string) => {
    const currentEmails = form.getValues("adminEmails");
    form.setValue("adminEmails", currentEmails.filter(email => email !== emailToRemove));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Email Configuration</h1>
      </div>

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMTP server settings for sending email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="587"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                        />
                      </FormControl>
                      <FormDescription>
                        Common ports: 587 (STARTTLS), 465 (SSL), 25 (unsecured)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtpUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your-email@gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={field.value === "********" ? "Password unchanged" : "Enter password"}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use app passwords for Gmail, not your regular password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use SSL/TLS</FormLabel>
                      <FormDescription>
                        Enable for port 465, disable for port 587 with STARTTLS
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Test Connection */}
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="w-full md:w-auto"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test SMTP Connection
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert className={`mt-4 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                        {testResult.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure the sender information and recipients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email</FormLabel>
                      <FormControl>
                        <Input placeholder="noreply@yourdomain.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Email address that notifications will be sent from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Scholarise System" {...field} />
                      </FormControl>
                      <FormDescription>
                        Display name for sent emails
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Admin Emails */}
              <div className="space-y-2">
                <Label>Admin Email Recipients</Label>
                <p className="text-sm text-muted-foreground">
                  Email addresses that will receive task notifications
                </p>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="admin@yourdomain.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAdminEmail();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addAdminEmail}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {form.watch("adminEmails").map((email, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeAdminEmail(email)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure when and what to include in email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notifyOnTaskCompletion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Task Completion Notifications</FormLabel>
                      <FormDescription>
                        Send email when background tasks complete successfully
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyOnTaskFailure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Task Failure Notifications</FormLabel>
                      <FormDescription>
                        Send email when background tasks fail or encounter errors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="includeTaskDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include Task Results</FormLabel>
                      <FormDescription>
                        Include detailed task results in notification emails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeErrorLogs"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include Error Logs</FormLabel>
                      <FormDescription>
                        Include error details in failure notification emails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveConfigMutation.isPending}
              className="min-w-[120px]"
            >
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
      </Form>

      {/* Info Section */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> Passwords are stored securely. For Gmail, use App Passwords instead of your regular password.
          To create an App Password: Google Account → Security → 2-Step Verification → App passwords.
        </AlertDescription>
      </Alert>
    </div>
  );
} 