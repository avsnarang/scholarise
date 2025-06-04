import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

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
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all tasks with real-time updates
  const { data: allTasks, refetch } = api.clerkManagement.getAllTasks.useQuery(undefined, {
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    enabled: isOpen, // Only fetch when dropdown is open
  });

  const { data: activeTasks } = api.clerkManagement.getAllActiveTasks.useQuery(undefined, {
    refetchInterval: 1000, // Faster updates for active tasks
  });

  const deleteTaskMutation = api.clerkManagement.deleteTask.useMutation({
    onSuccess: () => {
      void refetch();
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully.",
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
      pending: 'secondary',
      processing: 'default',
      completed: 'success',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status] || 'secondary'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${seconds}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    return `${Math.round(seconds / 3600)}h remaining`;
  };

  const formatElapsedTime = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    return formatDistanceToNow(new Date(startTime), { addSuffix: false });
  };

  const activeTaskCount = activeTasks?.length || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
        >
          <Activity className="h-4 w-4 mr-2" />
          Tasks
          {activeTaskCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs" variant="destructive">
              {activeTaskCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-96 max-h-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Background Tasks</span>
          {activeTaskCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeTaskCount} active
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="max-h-80">
          {!allTasks || allTasks.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No background tasks</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {allTasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {task.type}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTaskMutation.mutate({ taskId: task.id })}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-2">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          {task.progress.processed} / {task.progress.total}
                        </span>
                        <span>{task.progress.percentage}%</span>
                      </div>
                      <Progress value={task.progress.percentage} className="h-2" />
                    </div>

                    {/* Status and Time Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {task.status === 'processing' && task.estimatedTimeRemaining && (
                          <span>{formatTimeRemaining(task.estimatedTimeRemaining)}</span>
                        )}
                      </div>
                      <span>
                        {formatElapsedTime(task.startTime, task.endTime)}
                        {task.status === 'processing' ? ' elapsed' : ''}
                      </span>
                    </div>

                    {/* Results Summary */}
                    {task.status === 'completed' && task.results && (
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">
                            ✓ {task.results.success?.length || 0} successful
                          </span>
                          {task.results.errors?.length > 0 && (
                            <span className="text-red-600">
                              ✗ {task.results.errors.length} failed
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Info */}
                    {task.status === 'failed' && task.results?.error && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        Error: {task.results.error}
                      </div>
                    )}

                    {/* Action Buttons for Completed Tasks */}
                    {task.status === 'completed' && task.results && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            // Download results as JSON
                            const dataStr = JSON.stringify(task.results, null, 2);
                            const dataBlob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `task_${task.id}_results.json`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {allTasks && allTasks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Clear completed tasks
                const completedTasks = allTasks.filter(
                  (task) => task.status === 'completed' || task.status === 'failed'
                );
                completedTasks.forEach((task) => {
                  deleteTaskMutation.mutate({ taskId: task.id });
                });
              }}
              className="text-xs text-muted-foreground justify-center"
            >
              Clear completed tasks
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 