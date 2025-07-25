"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Webhook, TestTube, Settings, Eye, AlertCircle, CheckCircle } from "lucide-react";

interface WebhookConfig {
  webhookUrl: string;
  verifyToken: string;
  appSecret: string;
  environment: string;
  webhookConfigured: boolean;
}

interface TemplateLogEntry {
  id: string;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
}

interface RecentTemplate {
  id: string;
  name: string;
  metaTemplateName: string;
  metaTemplateId?: string;
  metaTemplateStatus?: string;
  metaRejectionReason?: string;
  metaApprovedAt?: string;
  updatedAt: string;
  templateVariables?: string[];
}

export function WebhookDebugPanel() {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [templates, setTemplates] = useState<RecentTemplate[]>([]);
  const [logs, setLogs] = useState<TemplateLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [simulationData, setSimulationData] = useState({
    templateName: "",
    templateLanguage: "en",
    newStatus: "APPROVED",
    reason: ""
  });
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks/meta-whatsapp/debug?action=config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch webhook configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks/meta-whatsapp/debug?action=recent-templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch recent templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks/meta-whatsapp/debug?action=recent-logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch recent logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks/meta-whatsapp/debug?action=test-webhook');
      const data = await response.json();
      setTestResult(data);
      toast({
        title: "Test Webhook Sent",
        description: `Response: ${data.response?.status || 'unknown'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test webhook",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateWebhook = async () => {
    if (!simulationData.templateName) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/webhooks/meta-whatsapp/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationData)
      });
      const data = await response.json();
      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "Webhook Simulation Successful",
          description: `Template ${simulationData.templateName} status updated to ${simulationData.newStatus}`
        });
        // Refresh templates and logs
        fetchRecentTemplates();
        fetchRecentLogs();
      } else {
        toast({
          title: "Webhook Simulation Failed",
          description: data.error || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to simulate webhook",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const colors = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      REJECTED: "bg-red-100 text-red-800",
      FLAGGED: "bg-orange-100 text-orange-800",
      PAUSED: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  React.useEffect(() => {
    fetchConfig();
    fetchRecentTemplates();
    fetchRecentLogs();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Meta Webhook Debug Panel
          </CardTitle>
          <CardDescription>
            Monitor and test Meta WhatsApp webhook functionality for template status updates
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>Current webhook setup and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge className={config.webhookConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {config.webhookConfigured ? "✅ Configured" : "❌ Not Configured"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Environment:</span>
                    <Badge>{config.environment}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Webhook URL:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{config.webhookUrl}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Verify Token:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {config.verifyToken === 'NOT_SET' ? '❌ NOT_SET' : '✅ SET'}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">App Secret:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{config.appSecret}</code>
                  </div>
                </div>
              )}
              <Button onClick={fetchConfig} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Recent Template Updates</CardTitle>
              <CardDescription>Templates recently updated via webhook</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={fetchRecentTemplates} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Templates
              </Button>
              <div className="space-y-2">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{template.name}</span>
                      <Badge className={getStatusBadge(template.metaTemplateStatus)}>
                        {template.metaTemplateStatus || 'UNKNOWN'}
                      </Badge>
                    </div>
                                            <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                          <div>Meta Name: {template.metaTemplateName}</div>
                          <div>Meta ID: {template.metaTemplateId || 'N/A'}</div>
                          <div>Updated: {new Date(template.updatedAt).toLocaleString()}</div>
                          <div>Variables: {Array.isArray(template.templateVariables) ? template.templateVariables.length : 0}</div>
                          {template.metaRejectionReason && (
                            <div className="col-span-2 text-red-600">
                              Rejection: {template.metaRejectionReason}
                            </div>
                          )}
                        </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No recent template updates</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Logs</CardTitle>
              <CardDescription>Template-related webhook and API activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={fetchRecentLogs} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Logs
              </Button>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">{log.description}</div>
                    {log.metadata && (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer">View metadata</summary>
                        <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No recent activity logs</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Webhook</CardTitle>
                <CardDescription>Send a test webhook payload</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={testWebhook} disabled={loading} className="w-full flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Send Test Webhook
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Template Send</CardTitle>
                <CardDescription>Test sending a template message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testTemplateId">Template ID</Label>
                  <Input
                    id="testTemplateId"
                    placeholder="Enter template ID to test"
                    value={simulationData.templateName}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, templateName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Phone (optional)</Label>
                  <Input
                    id="testPhone"
                    placeholder="+1234567890"
                    value={simulationData.reason}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={async () => {
                    if (!simulationData.templateName) {
                      toast({
                        title: "Error",
                        description: "Template ID is required",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      const response = await fetch('/api/debug/test-template-send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          templateId: simulationData.templateName,
                          testPhone: simulationData.reason || undefined
                        })
                      });
                      const data = await response.json();
                      setTestResult(data);
                      
                      if (data.success) {
                        toast({
                          title: "Template Test Successful",
                          description: "Template message sent successfully"
                        });
                      } else {
                        toast({
                          title: "Template Test Failed",
                          description: data.result?.error || data.error || "Unknown error",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to test template",
                        variant: "destructive"
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading} 
                  className="w-full flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Template Send
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Simulate Template Update</CardTitle>
                <CardDescription>Simulate a specific template status change</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={simulationData.templateName}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, templateName: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={simulationData.templateLanguage}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, templateLanguage: e.target.value }))}
                    placeholder="en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select value={simulationData.newStatus} onValueChange={(value) => setSimulationData(prev => ({ ...prev, newStatus: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="FLAGGED">FLAGGED</SelectItem>
                      <SelectItem value="PAUSED">PAUSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {simulationData.newStatus === 'REJECTED' && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">Rejection Reason</Label>
                    <Textarea
                      id="reason"
                      value={simulationData.reason}
                      onChange={(e) => setSimulationData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter rejection reason"
                    />
                  </div>
                )}
                <Button onClick={simulateWebhook} disabled={loading} className="w-full flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Simulate Webhook
                </Button>
              </CardContent>
            </Card>
          </div>

          {testResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Test Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 