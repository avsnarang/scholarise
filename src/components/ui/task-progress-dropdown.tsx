"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";
import {
  Activity,
  Check,
  X,
  Loader2,
  Trash2,
  Download,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
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
  
  const utils = api.useContext();
  
  const { data: tasks = [], isLoading, error } = api.backgroundTasks.getAllTasks.useQuery(
    {},
    {
      refetchInterval: isOpen ? 2000 : 10000,
      refetchIntervalInBackground: false,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      placeholderData: (previousData: any) => previousData,
      retry: (failureCount, error) => {
        // Only retry on network errors, not on actual API errors
        if (failureCount >= 3) return false;
        return true;
      },
    }
  );

  const activeTasks = tasks.filter((task: any) => 
    task.status === 'pending' || task.status === 'processing' || task.status === 'paused'
  );

  const hasError = !!error;
  const showError = hasError && !isLoading;

  const deleteTaskMutation = api.backgroundTasks.deleteTask.useMutation({
    onSuccess: () => {
      utils.backgroundTasks.getAllTasks.invalidate();
      toast({
        title: "Task removed",
        variant: "default",
      });
    },
  });

  const pauseTaskMutation = api.backgroundTasks.pauseTask.useMutation({
    onSuccess: () => {
      utils.backgroundTasks.getAllTasks.invalidate();
      toast({
        title: "Task paused",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to pause task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resumeTaskMutation = api.backgroundTasks.resumeTask.useMutation({
    onSuccess: () => {
      utils.backgroundTasks.getAllTasks.invalidate();
      toast({
        title: "Task resumed",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to resume task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelTaskMutation = api.backgroundTasks.cancelTask.useMutation({
    onSuccess: () => {
      utils.backgroundTasks.getAllTasks.invalidate();
      toast({
        title: "Task cancelled",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'text-amber-500';
      case 'processing': return 'text-blue-500';
      case 'paused': return 'text-orange-500';
      case 'completed': return 'text-emerald-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Task['status'], size = 'h-3 w-3') => {
    const iconClass = cn(size, getStatusColor(status));
    
    switch (status) {
      case 'pending':
        return <div className={cn(iconClass, 'rounded-full bg-current opacity-60')} />;
      case 'processing':
        return <Loader2 className={cn(iconClass, 'animate-spin')} />;
      case 'paused':
        return <Pause className={iconClass} />;
      case 'completed':
        return <Check className={iconClass} />;
      case 'failed':
        return <X className={iconClass} />;
      default:
        return <div className={cn(iconClass, 'rounded-full bg-current')} />;
    }
  };

  const formatProgress = (task: Task) => {
    const processed = task.progress?.processed || 0;
    const total = task.progress?.total || 0;
    
    if (total === 0) {
      return `${processed} items`;
    }
    
    return `${processed} of ${total}`;
  };

  const handleExport = (task: Task) => {
    if (!task.results) return;

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
    } catch (error) {
      toast({
        title: "Export failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTaskMutation.mutate({ taskId });
  };

  const handlePause = (taskId: string) => {
    pauseTaskMutation.mutate({ taskId });
  };

  const handleResume = (taskId: string) => {
    resumeTaskMutation.mutate({ taskId });
  };

  const handleCancel = (taskId: string) => {
    cancelTaskMutation.mutate({ taskId });
  };

  const hasActiveTasks = activeTasks.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "relative h-8 w-8 p-0 hover:bg-muted/50",
            hasActiveTasks && "text-blue-600"
          )}
        >
          <Activity className="h-4 w-4" />
          {hasActiveTasks && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0 border-border/50 shadow-lg">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Background Tasks
              </span>
            </div>
            {activeTasks.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">
                  {activeTasks.length} active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Loading tasks...</p>
            </div>
          ) : showError ? (
            <div className="p-8 text-center">
              <X className="h-8 w-8 mx-auto mb-3 text-red-500" />
              <p className="text-sm text-red-600 mb-3 font-medium">Failed to load tasks</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">No tasks</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tasks will appear here when you start bulk operations</p>
            </div>
          ) : (
            <div className="py-2">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="mx-2 my-1 p-4 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/30 transition-all duration-200 group"
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground/90 truncate pr-2">
                          {task.type.replace('Bulk Clerk Account Creation - ', '').replace('Bulk Clerk Account Retry - ', '')}
                        </p>
                        {task.status === 'paused' && (
                          <p className="text-xs text-orange-600 font-medium mt-0.5">Paused</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {/* Pause/Resume/Cancel buttons for active tasks */}
                      {(task.status === 'processing' || task.status === 'pending') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePause(task.id)}
                            className="h-7 w-7 p-0 rounded-md hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/20"
                            title="Pause task"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(task.id)}
                            className="h-7 w-7 p-0 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                            title="Cancel task"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}

                      {/* Resume button for paused tasks */}
                      {task.status === 'paused' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResume(task.id)}
                            className="h-7 w-7 p-0 rounded-md hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/20"
                            title="Resume task"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(task.id)}
                            className="h-7 w-7 p-0 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                            title="Cancel task"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}

                      {/* Export button for completed tasks */}
                      {task.status === 'completed' && task.results && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(task)}
                          className="h-7 w-7 p-0 rounded-md hover:bg-muted dark:hover:bg-muted"
                          title="Export results"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      
                      {/* Delete button for completed/failed tasks */}
                      {(task.status === 'completed' || task.status === 'failed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                          className="h-7 w-7 p-0 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                          title="Remove task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress for active tasks */}
                  {(task.status === 'processing' || task.status === 'pending' || task.status === 'paused') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{formatProgress(task)}</span>
                        <span className="text-muted-foreground font-semibold">{Math.round(task.progress?.percentage || 0)}%</span>
                      </div>
                      <Progress 
                        value={task.progress?.percentage || 0} 
                        className="h-2 bg-muted/50" 
                      />
                    </div>
                  )}

                  {/* Results for completed tasks */}
                  {task.status === 'completed' && task.results && (
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-emerald-600">{task.results.success || 0} successful</span>
                      {task.results.failed > 0 && (
                        <span className="text-red-600">{task.results.failed} failed</span>
                      )}
                    </div>
                  )}

                  {/* Error for failed tasks */}
                  {task.status === 'failed' && (
                    <p className="text-xs text-red-600 font-medium">Task failed</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 