"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import {
  Activity,
  RefreshCw,
  Play,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react";

export default function BackgroundServicesPage() {
  const { toast } = useToast();
  const [isRestarting, setIsRestarting] = useState(false);

  const { data: serviceStatus, isLoading, refetch } = api.backgroundTasks.getServiceStatus.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  const { data: processingStatus } = api.backgroundTasks.getProcessingStatus.useQuery(
    undefined,
    {
      refetchInterval: 2000, // Refresh every 2 seconds
    }
  );

  const { data: recentTasks } = api.backgroundTasks.getAllTasks.useQuery(
    undefined,
    {
      refetchInterval: 3000, // Refresh every 3 seconds
    }
  );

  const restartServicesMutation = api.backgroundTasks.restartServices.useMutation({
    onSuccess: () => {
      toast({
        title: "Services restarted",
        description: "Background services have been restarted successfully.",
      });
      refetch();
      setIsRestarting(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to restart services",
        description: error.message,
        variant: "destructive",
      });
      setIsRestarting(false);
    },
  });

  const handleRestartServices = () => {
    setIsRestarting(true);
    restartServicesMutation.mutate();
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "text-green-600" : "text-red-600";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  const activeTasks = recentTasks?.filter(task => 
    task.status === 'processing' || task.status === 'pending'
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Background Services</h1>
      </div>

      {/* Service Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                getStatusIcon(serviceStatus?.isInitialized || false)
              )}
              <span className={`text-sm font-medium ${getStatusColor(serviceStatus?.isInitialized || false)}`}>
                {serviceStatus?.isInitialized ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(processingStatus?.isProcessing || false)}
              <span className={`text-sm font-medium ${getStatusColor(processingStatus?.isProcessing || false)}`}>
                {processingStatus?.isProcessing ? 'Active' : 'Idle'}
              </span>
            </div>
            {processingStatus?.currentTaskId && (
              <p className="text-xs text-muted-foreground mt-1">
                Task: {processingStatus.currentTaskId}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">
                {activeTasks.length} active
              </span>
            </div>
            {activeTasks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {activeTasks.map(task => task.type).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Service Controls</CardTitle>
          <CardDescription>
            Manage background service operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleRestartServices}
              disabled={isRestarting}
              variant="outline"
            >
              {isRestarting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Restart Services
                </>
              )}
            </Button>

            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Background services handle bulk operations like importing users and sending email notifications. 
              If services are not running, new bulk tasks will queue until services are restarted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      {recentTasks && recentTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>
              Latest background task activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={task.status === 'completed' ? 'default' : 
                               task.status === 'failed' ? 'destructive' : 
                               'secondary'}
                    >
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {task.progress.processed}/{task.progress.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 