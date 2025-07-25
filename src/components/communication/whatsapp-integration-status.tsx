"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  MessageSquare,
  Settings,
  FileText,
  Zap,
  Timer,
  BarChart
} from 'lucide-react';

interface TestResult {
  success: boolean;
  error?: string;
  data?: any;
  timestamp?: string;
}

interface IntegrationStatusProps {
  className?: string;
}

export function WhatsAppIntegrationStatus({ className }: IntegrationStatusProps) {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  const runTest = async (testType: string, endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    setActiveTest(testType);
    try {
      const url = endpoint.includes('?') 
        ? `${endpoint}&_t=${Date.now()}` 
        : `${endpoint}?_t=${Date.now()}`;
      
      const response = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: method === 'POST' && body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [testType]: {
          success: data.success,
          error: data.error,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [testType]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setActiveTest(null);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    const tests = [
      { type: 'environment', endpoint: '/api/whatsapp/test?type=environment' },
      { type: 'connection', endpoint: '/api/whatsapp/test?type=connection' },
      { type: 'templates', endpoint: '/api/whatsapp/test?type=templates' },
      { type: 'ratelimiter', endpoint: '/api/whatsapp/test?type=ratelimiter' },
      { type: 'validator', endpoint: '/api/whatsapp/test?type=validator' }
    ];

    for (const test of tests) {
      await runTest(test.type, test.endpoint);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setIsRunningAll(false);
  };

  const getStatusIcon = (result?: TestResult) => {
    if (!result) return <AlertCircle className="h-5 w-5 text-gray-400" />;
    return result.success 
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (result?: TestResult) => {
    if (!result) return <Badge variant="secondary">Not Tested</Badge>;
    return result.success 
      ? <Badge variant="default" className="bg-green-500">✓ Passed</Badge>
      : <Badge variant="destructive">✗ Failed</Badge>;
  };

  const testSections = [
    {
      id: 'environment',
      title: 'Environment Configuration',
      description: 'Check all required environment variables',
      icon: Settings,
      endpoint: '/api/whatsapp/test?type=environment'
    },
    {
      id: 'connection',
      title: 'API Connection',
      description: 'Test connection to Meta WhatsApp API',
      icon: Zap,
      endpoint: '/api/whatsapp/test?type=connection'
    },
    {
      id: 'templates',
      title: 'Template Management',
      description: 'Check template syncing and status',
      icon: FileText,
      endpoint: '/api/whatsapp/test?type=templates'
    },
    {
      id: 'ratelimiter',
      title: 'Rate Limiting',
      description: 'Test rate limiting functionality',
      icon: Timer,
      endpoint: '/api/whatsapp/test?type=ratelimiter'
    },
    {
      id: 'validator',
      title: 'Template Validator',
      description: 'Test template validation logic',
      icon: CheckCircle,
      endpoint: '/api/whatsapp/test?type=validator'
    }
  ];

  const sendTestActions = [
    {
      id: 'send_text',
      title: 'Send Test Text Message',
      description: 'Send a simple text message',
      action: 'send_test_message',
      defaultParams: {
        to: '+1234567890',
        messageType: 'text',
        message: 'Test message from Scholarise'
      }
    },
    {
      id: 'send_template',
      title: 'Send Test Template Message',
      description: 'Send a template message with variables',
      action: 'send_test_message',
      defaultParams: {
        to: '+1234567890',
        messageType: 'template',
        templateName: 'hello_world',
        variables: { name: 'Test User' }
      }
    },
    {
      id: 'submit_template',
      title: 'Submit Test Template',
      description: 'Create and submit a test template to Meta',
      action: 'submit_test_template',
      defaultParams: {
        name: `test_template_${Date.now()}`,
        category: 'UTILITY',
        templateBody: 'Hello {{name}}, this is a test template from Scholarise.',
        templateVariables: ['name']
      }
    }
  ];

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                WhatsApp Cloud API Integration Status
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor and test your WhatsApp integration health
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runAllTests}
                disabled={isRunningAll || activeTest !== null}
              >
                {isRunningAll ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tests">Detailed Tests</TabsTrigger>
              <TabsTrigger value="actions">Test Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {testSections.map((section) => {
                  const result = testResults[section.id];
                  const Icon = section.icon;
                  
                  return (
                    <Card key={section.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <h3 className="font-semibold text-sm">{section.title}</h3>
                          </div>
                          {getStatusIcon(result)}
                        </div>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(result)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runTest(section.id, section.endpoint)}
                            disabled={activeTest === section.id}
                          >
                            {activeTest === section.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                        </div>
                        {result?.error && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Overall Status Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Integration Health</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(testResults).length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tests Passed</span>
                        <span className="text-sm font-medium">
                          {Object.values(testResults).filter(r => r.success).length} / {Object.keys(testResults).length}
                        </span>
                      </div>
                      <Progress 
                        value={(Object.values(testResults).filter(r => r.success).length / Object.keys(testResults).length) * 100}
                        className="h-2"
                      />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>✓ {Object.values(testResults).filter(r => r.success).length} Passed</span>
                        <span>✗ {Object.values(testResults).filter(r => !r.success).length} Failed</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <BarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Run tests to see integration health</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              {testSections.map((section) => {
                const result = testResults[section.id];
                
                return (
                  <Card key={section.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <section.icon className="h-5 w-5" />
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          {getStatusBadge(result)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runTest(section.id, section.endpoint)}
                          disabled={activeTest === section.id}
                        >
                          {activeTest === section.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          {activeTest === section.id ? 'Testing...' : 'Run Test'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result ? (
                        <div className="space-y-3">
                          {result.error && (
                            <Alert variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>{result.error}</AlertDescription>
                            </Alert>
                          )}
                          {result.data && (
                            <div className="bg-muted rounded-lg p-4">
                              <pre className="text-xs overflow-auto max-h-60">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {result.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              Last tested: {new Date(result.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click "Run Test" to execute this test
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These actions will send real messages or create templates. Use test phone numbers only.
                </AlertDescription>
              </Alert>

              {sendTestActions.map((action) => (
                <Card key={action.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-muted rounded-lg p-4">
                        <pre className="text-xs">
                          {JSON.stringify(action.defaultParams, null, 2)}
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => runTest(
                          action.id, 
                          '/api/whatsapp/test', 
                          'POST', 
                          { action: action.action, ...action.defaultParams }
                        )}
                        disabled={activeTest === action.id}
                      >
                        {activeTest === action.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Execute Test
                          </>
                        )}
                      </Button>
                      
                      {testResults[action.id] && (
                        <div className="space-y-2">
                          {testResults[action.id].success ? (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                Action completed successfully
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                {testResults[action.id].error}
                              </AlertDescription>
                            </Alert>
                          )}
                          {testResults[action.id].data && (
                            <div className="bg-muted rounded-lg p-4">
                              <pre className="text-xs overflow-auto max-h-40">
                                {JSON.stringify(testResults[action.id].data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 