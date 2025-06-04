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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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
  
  const utils = api.useContext();
  
  const { data: tasks = [], isLoading } = api.clerkManagement.getAllTasks.useQuery(
    undefined,
    {
      refetchInterval: isOpen ? 2000 : 10000,
      refetchIntervalInBackground: false,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      placeholderData: (previousData) => previousData,
    }
  );

  const activeTasks = tasks.filter((task: Task) => 
    task.status === 'pending' || task.status === 'processing'
  );

  const deleteTaskMutation = api.clerkManagement.deleteTask.useMutation({
    onSuccess: () => {
      utils.clerkManagement.getAllTasks.invalidate();
      toast({
        title: "Task removed",
        variant: "default",
      });
    },
  });

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'text-amber-500';
      case 'processing': return 'text-blue-500';
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
      case 'completed':
        return <Check className={iconClass} />;
      case 'failed':
        return <X className={iconClass} />;
      default:
        return <div className={cn(iconClass, 'rounded-full bg-current')} />;
    }
  };

  const formatProgress = (task: Task) => {
    return `${task.progress.processed}/${task.progress.total}`;
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
      
      <DropdownMenuContent align="end" className="w-80 p-0 border-border/50">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/90">
              Tasks
            </span>
            <span className="text-xs text-muted-foreground">
              {activeTasks.length} active
            </span>
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="max-h-80">
          {tasks.length === 0 ? (
            <div className="p-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No tasks</p>
            </div>
          ) : (
            <div className="p-1">
              {tasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="mx-1 my-1 p-3 rounded-md hover:bg-muted/30 transition-colors group"
                >
                  {/* Task Info */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground/90 truncate">
                          {task.type.replace('Bulk Clerk Account Creation - ', '')}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status === 'completed' && task.results && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExport(task)}
                              className="h-6 w-6 p-0 hover:bg-muted"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {(task.status === 'completed' || task.status === 'failed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress for active tasks */}
                      {(task.status === 'processing' || task.status === 'pending') && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatProgress(task)}</span>
                            <span>{task.progress.percentage}%</span>
                          </div>
                          <Progress 
                            value={task.progress.percentage} 
                            className="h-1.5" 
                          />
                        </div>
                      )}

                      {/* Results for completed tasks */}
                      {task.status === 'completed' && task.results && (
                        <div className="text-xs text-muted-foreground">
                          <span className="text-emerald-600">{task.results.success || 0} success</span>
                          {task.results.failed > 0 && (
                            <span className="ml-2 text-red-600">{task.results.failed} failed</span>
                          )}
                        </div>
                      )}

                      {/* Error for failed tasks */}
                      {task.status === 'failed' && (
                        <p className="text-xs text-red-600">Task failed</p>
                      )}
                    </div>
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