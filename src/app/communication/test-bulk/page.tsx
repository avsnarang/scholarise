"use client";

import React, { useState } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageJobProgress } from "@/components/communication/message-job-progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Send,
  Users,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";

export default function TestBulkMessagePage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [recipientCount, setRecipientCount] = useState<number>(10);
  const [sentMessageId, setSentMessageId] = useState<string | null>(null);

  // Fetch templates with auto-refresh
  const { data: templates } = api.communication.getTemplates.useQuery({
    branchId: currentBranchId || "",
  }, {
    enabled: !!currentBranchId,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
    staleTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Send test message mutation
  const sendTestMessageMutation = api.communication.sendMessage.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Test Message Queued",
        description: `Test message has been queued for processing with ${recipientCount} simulated recipients.`,
      });
      setSentMessageId(data.messageId);
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Test Message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendTestMessage = async () => {
    if (!selectedTemplate || !currentBranchId) {
      toast({
        title: "Missing Information",
        description: "Please select a template and ensure you're in a branch.",
        variant: "destructive",
      });
      return;
    }

    // Generate fake recipients for testing
    const testRecipients = Array.from({ length: recipientCount }, (_, i) => ({
      id: `test_recipient_${i + 1}`,
      name: `Test User ${i + 1}`,
      phone: `+91900000${String(i + 1).padStart(4, '0')}`, // Fake phone numbers
      type: "student",
      additional: {
        student: {
          name: `Test Student ${i + 1}`,
          class: { name: "Test Class" },
          section: { name: "A" }
        }
      }
    }));

    sendTestMessageMutation.mutate({
      title: `Test Bulk Message - ${new Date().toLocaleString()}`,
      templateId: selectedTemplate,
      recipientType: "INDIVIDUAL_STUDENTS",
      recipients: testRecipients,
      branchId: currentBranchId,
      dryRun: true, // This is the key - enables safe testing
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Test Bulk Message System
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Safely test the bulk message sending system without sending real messages
        </p>
      </div>

      {/* Warning Card */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <TestTube className="h-5 w-5" />
            Dry Run Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>No real messages will be sent to parents or students</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Uses fake phone numbers for testing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Simulates ~90% success rate for realistic testing</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Tests the complete job processing pipeline</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Configure your test to simulate bulk message sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to test" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      <Badge variant="outline" className="ml-2">
                        {template.status}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Test Recipients</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={recipientCount}
                onChange={(e) => setRecipientCount(parseInt(e.target.value) || 10)}
                placeholder="Enter number of recipients"
              />
            </div>
          </div>

          <Button 
            onClick={handleSendTestMessage}
            disabled={!selectedTemplate || sendTestMessageMutation.isPending}
            className="w-full"
          >
            {sendTestMessageMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Test Message...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Send Test Message ({recipientCount} recipients)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Real-time Progress */}
      {sentMessageId && (
        <MessageJobProgress 
          messageId={sentMessageId}
          onComplete={() => {
            toast({
              title: "Test Complete",
              description: "Your test bulk message has finished processing!",
            });
          }}
        />
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use This Test</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Select a WhatsApp template that you want to test</li>
            <li>Choose how many fake recipients you want to simulate (1-100)</li>
            <li>Click "Send Test Message" to start the dry-run test</li>
            <li>Watch the real-time progress bar to see the job processing</li>
            <li>Check the detailed log by clicking on the message in Communication History</li>
            <li>Verify that statistics are consistent between different pages</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> After testing, check the Communication History page to see your test message 
              and click on "View Details" to see the complete delivery log with all the fake recipients.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 