"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  testRealtimeChatForBranch, 
  testRealtimeSubscription, 
  formatRealtimeTestResults,
  type RealtimeTestSummary 
} from '@/utils/test-realtime-chat';
import { useBranchContext } from '@/hooks/useBranchContext';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

interface RealtimeDebugPanelProps {
  conversationId?: string;
  className?: string;
}

export function RealtimeDebugPanel({ conversationId, className }: RealtimeDebugPanelProps) {
  const { currentBranchId } = useBranchContext();
  const [isTestingBranch, setIsTestingBranch] = useState(false);
  const [isTestingConversation, setIsTestingConversation] = useState(false);
  const [testResults, setTestResults] = useState<RealtimeTestSummary | null>(null);
  const [conversationTestResult, setConversationTestResult] = useState<boolean | null>(null);

  const handleTestBranch = async () => {
    if (!currentBranchId) return;
    
    setIsTestingBranch(true);
    setTestResults(null);
    
    try {
      const results = await testRealtimeChatForBranch(currentBranchId);
      setTestResults(results);
    } catch (error) {
      console.error('Error testing branch:', error);
    } finally {
      setIsTestingBranch(false);
    }
  };

  const handleTestConversation = async () => {
    if (!conversationId) return;
    
    setIsTestingConversation(true);
    setConversationTestResult(null);
    
    try {
      const result = await testRealtimeSubscription(conversationId);
      setConversationTestResult(result);
    } catch (error) {
      console.error('Error testing conversation:', error);
      setConversationTestResult(false);
    } finally {
      setIsTestingConversation(false);
    }
  };

  const getStatusIcon = (success: boolean | null, isLoading: boolean) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (success === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (success === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Bug className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = (success: boolean | null, isLoading: boolean) => {
    if (isLoading) return "Testing...";
    if (success === true) return "Working";
    if (success === false) return "Failed";
    return "Not tested";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4" />
          Realtime Debug Panel
        </CardTitle>
        <CardDescription className="text-xs">
          Test and verify realtime chat functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Branch-wide Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Branch Test</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestBranch}
              disabled={isTestingBranch || !currentBranchId}
              className="h-7"
            >
              {isTestingBranch ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Test All
                </>
              )}
            </Button>
          </div>
          
          {testResults && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {testResults.totalConversations} Total
                </Badge>
                <Badge variant={testResults.realtimeEnabledConversations > 0 ? "default" : "secondary"} className="text-xs">
                  {testResults.realtimeEnabledConversations} Working
                </Badge>
                {testResults.conversationsWithIssues > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {testResults.conversationsWithIssues} Issues
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Success Rate: {testResults.totalConversations > 0 
                  ? (testResults.realtimeEnabledConversations / testResults.totalConversations * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          )}
        </div>

        {/* Individual Conversation Test */}
        {conversationId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Chat</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(conversationTestResult, isTestingConversation)}
                <span className="text-xs text-muted-foreground">
                  {getStatusText(conversationTestResult, isTestingConversation)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConversation}
                  disabled={isTestingConversation}
                  className="h-7"
                >
                  {isTestingConversation ? (
                    <Loader2 className="h-3 w-3" />
                  ) : (
                    <Wifi className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status Indicators */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Connection Status</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Live</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Connecting</span>
            </div>
          </div>
        </div>

        {/* Test Results Details */}
        {testResults && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Results Summary</div>
            <ScrollArea className="h-24 w-full">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {formatRealtimeTestResults(testResults)}
              </pre>
            </ScrollArea>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Quick Actions</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
              className="h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reload Page
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => console.log('Realtime debug info:', { testResults, conversationTestResult })}
              className="h-7 text-xs"
            >
              <Bug className="h-3 w-3 mr-1" />
              Log Debug
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 