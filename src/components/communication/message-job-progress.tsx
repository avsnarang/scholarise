"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageJobProgressProps {
  messageId: string;
  onComplete?: () => void;
  className?: string;
}

interface JobStatus {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';
  progress: number;
  totalRecipients: number;
  processedRecipients: number;
  successfulSent: number;
  failed: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export function MessageJobProgress({ messageId, onComplete, className }: MessageJobProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`message-job-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'MessageJob',
          filter: `messageId=eq.${messageId}`
        },
        (payload) => {
          console.log('📡 Job update received:', payload);
          if (payload.new) {
            const newJobData = payload.new as JobStatus;
            setJobStatus(newJobData);
            
            // Call onComplete when job is finished
            if (newJobData.status === 'COMPLETED' && onComplete) {
              onComplete();
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('📡 Subscription status:', status);
      });

    // Fetch initial status
    supabase
      .from('MessageJob')
      .select('*')
      .eq('messageId', messageId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setJobStatus(data as JobStatus);
        }
      });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [messageId, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-4 w-4" />;
      case 'PROCESSING':
        return <Loader className="h-4 w-4 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-gray-100 text-gray-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'RETRYING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!jobStatus) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon(jobStatus.status)}
            Message Sending Progress
          </span>
          <Badge className={cn("text-xs", getStatusColor(jobStatus.status))}>
            {jobStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
          {isConnected ? "Real-time connected" : "Connecting..."}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{jobStatus.progress}%</span>
          </div>
          <Progress value={jobStatus.progress} className="h-2" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Recipients</span>
            <div className="font-medium">{jobStatus.totalRecipients}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Processed</span>
            <div className="font-medium">{jobStatus.processedRecipients}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Successful</span>
            <div className="font-medium text-green-600">{jobStatus.successfulSent}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Failed</span>
            <div className="font-medium text-red-600">{jobStatus.failed}</div>
          </div>
        </div>

        {/* Error Message */}
        {jobStatus.errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {jobStatus.errorMessage}
            </div>
          </div>
        )}

        {/* Timing Info */}
        {(jobStatus.startedAt || jobStatus.completedAt) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {jobStatus.startedAt && (
              <div>Started: {new Date(jobStatus.startedAt).toLocaleString()}</div>
            )}
            {jobStatus.completedAt && (
              <div>Completed: {new Date(jobStatus.completedAt).toLocaleString()}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 