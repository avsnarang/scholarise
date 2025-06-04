"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";
import {
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    processed: number;
    total: number;
    percentage: number;
  };
  results?: any;
  startTime: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
  description?: string;
}

export function TaskProgressDropdown() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Get API utils for manual invalidation
  const utils = api.useContext();
  
  // Fetch tasks with polling, but prevent loading states from hiding content
  const { data: tasks = [], isLoading, isError } = api.clerkManagement.getAllTasks.useQuery(
    undefined,
    {
      refetchInterval: () => {
        // Simple polling - check if dropdown is open and poll accordingly
        return isOpen ? 2000 : 5000; // Poll every 2s when open, 5s when closed
      },
      refetchIntervalInBackground: true,
      // Prevent loading states on background refetches
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      // Keep previous data while refetching to prevent flickering
      placeholderData: (previousData) => previousData,
    }
  );

  // Count active tasks
  const activeTasks = tasks.filter((task: Task) => 
    task.status === 'pending' || task.status === 'processing'
  );

  // Delete task mutation
  const deleteTaskMutation = api.clerkManagement.deleteTask.useMutation({
    onSuccess: () => {
      // Invalidate and refetch the tasks query
      utils.clerkManagement.getAllTasks.invalidate();
      toast({
        title: "Task deleted",
        description: "Task has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      failed: "destructive",
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "Unknown";
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m`;
  };

  const formatElapsedTime = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const elapsed = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = async () => {
    try {
      // Invalidate the query to force a fresh fetch
      await utils.clerkManagement.getAllTasks.invalidate();
      toast({
        title: "Refreshed",
        description: "Task data has been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh task data.",
        variant: "destructive",
      });
    }
  };

  const handleExport = (task: Task) => {
    if (!task.results) {
      toast({
        title: "No data to export",
        description: "This task doesn't have any results to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataStr = JSON.stringify(task.results, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `task-${task.id}-results.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Task results have been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export task results.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTaskMutation.mutate({ taskId });
  };

  if (isError) {
    return (
      <Button variant="outline" size="sm" disabled>
        <AlertCircle className="h-4 w-4 mr-2" />
        Error
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4 mr-2" />
          Tasks
          {activeTasks.length > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeTasks.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Background Tasks</h3>
              <p className="text-sm text-muted-foreground">
                {activeTasks.length} active, {tasks.length} total
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No background tasks</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {tasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {task.description || task.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatElapsedTime(task.startTime, task.endTime)}
                          {task.status === 'processing' && task.estimatedTimeRemaining && (
                            <span> • {formatTimeRemaining(task.estimatedTimeRemaining)} remaining</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusBadge(task.status)}
                    </div>
                  </div>

                  {/* Progress bar for active tasks */}
                  {(task.status === 'processing' || task.status === 'pending') && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {task.progress.processed} / {task.progress.total}
                        </span>
                        <span className="font-medium">
                          {task.progress.percentage}%
                        </span>
                      </div>
                      <Progress value={task.progress.percentage} className="h-2" />
                    </div>
                  )}

                  {/* Results summary for completed tasks */}
                  {task.status === 'completed' && task.results && (
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="flex justify-between">
                        <span>Success: {task.results.success || 0}</span>
                        <span>Failed: {task.results.failed || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1">
                    {task.status === 'completed' && task.results && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(task)}
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                    )}
                    {(task.status === 'completed' || task.status === 'failed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        disabled={deleteTaskMutation.isPending}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 